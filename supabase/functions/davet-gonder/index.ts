// Davet Edge Function: yeni kullanıcıyı davet eder ve `kullanici` satırını oluşturur.
//
// Neden sunucuda: `kullanici` tablosuna istemciden insert yetkisi yoktur ve service_role
// anahtarı uygulamaya konamaz (EXPO_PUBLIC_* değişkenleri herkese açıktır). Rol ve kurum
// kararını burada, çağıranın doğrulanmış kimliğine göre biz veririz; istek gövdesine güvenmeyiz.
//
// Yetki matrisi:
//   super_admin -> yalnızca `kurum_admin` davet eder, hedef kurum gövdedeki kurum_id (zorunlu)
//   kurum_admin -> `ogretmen`, `veli`, `kurum_admin` davet eder, hedef kurum HER ZAMAN kendi kurumu
//   ogretmen, veli -> 403
// `super_admin` rolü API'den asla verilmez (ilk süper admin elle eklenir).

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS_BASLIKLARI = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DAVET_EDILEBILIR_ROLLER = ['kurum_admin', 'ogretmen', 'veli'] as const;
type DavetRolu = (typeof DAVET_EDILEBILIR_ROLLER)[number];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EN_FAZLA_BAG = 50;

// Web istemcisinde Supabase Auth'un davet linkini yönlendireceği adres. Bu adres
// Dashboard > Authentication > URL Configuration > Redirect URLs listesinde olmalıdır.
const DAVET_YONLENDIRME_URL = Deno.env.get('DAVET_YONLENDIRME_URL') ?? 'ogrencitakip://davet-kabul';

function yanit(durum: number, govde: Record<string, unknown>): Response {
  return new Response(JSON.stringify(govde), {
    status: durum,
    headers: { ...CORS_BASLIKLARI, 'Content-Type': 'application/json' },
  });
}

const hata = (durum: number, mesaj: string) => yanit(durum, { hata: mesaj });

function uuidDizisi(deger: unknown): string[] | null {
  if (deger === undefined || deger === null) return [];
  if (!Array.isArray(deger) || deger.length > EN_FAZLA_BAG) return null;
  if (!deger.every((x) => typeof x === 'string' && UUID_RE.test(x))) return null;
  return [...new Set(deger as string[])];
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_BASLIKLARI });
  if (req.method !== 'POST') return hata(405, 'Yalnızca POST desteklenir.');

  const yetkiBasligi = req.headers.get('Authorization');
  if (!yetkiBasligi) return hata(401, 'Oturum açmanız gerekiyor.');

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonAnahtar = Deno.env.get('SUPABASE_ANON_KEY');
  const servisAnahtar = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonAnahtar || !servisAnahtar) {
    console.error('davet-gonder: SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY tanımlı değil');
    return hata(500, 'Sunucu yapılandırması eksik.');
  }

  // 1. Çağıranı doğrula (kullanıcı bağlamlı client: RLS'e tabi, yalnızca kendi kaydını okur)
  const kullaniciClient = createClient(supabaseUrl, anonAnahtar, {
    global: { headers: { Authorization: yetkiBasligi } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: kimlik, error: kimlikHatasi } = await kullaniciClient.auth.getUser();
  if (kimlikHatasi || !kimlik.user) return hata(401, 'Oturumunuz geçersiz.');

  const { data: cagiran, error: cagiranHatasi } = await kullaniciClient
    .from('kullanici')
    .select('id, rol, kurum_id')
    .eq('auth_id', kimlik.user.id)
    .maybeSingle();
  if (cagiranHatasi) {
    console.error('davet-gonder: çağıran okunamadı', cagiranHatasi);
    return hata(500, 'İşlem şu an yapılamıyor.');
  }
  if (!cagiran) return hata(403, 'Bu işlem için yetkiniz yok.');

  // 2. Gövdeyi doğrula
  let govde: Record<string, unknown>;
  try {
    govde = await req.json();
  } catch {
    return hata(400, 'İstek gövdesi geçerli JSON olmalı.');
  }
  if (typeof govde !== 'object' || govde === null) return hata(400, 'İstek gövdesi geçersiz.');

  const email = typeof govde.email === 'string' ? govde.email.trim().toLowerCase() : '';
  const adSoyad = typeof govde.ad_soyad === 'string' ? govde.ad_soyad.trim() : '';
  const rol = govde.rol as DavetRolu;
  const sinifIdleri = uuidDizisi(govde.sinif_idleri);
  const ogrenciIdleri = uuidDizisi(govde.ogrenci_idleri);

  if (!EMAIL_RE.test(email) || email.length > 254) return hata(400, 'Geçerli bir e-posta adresi girin.');
  if (adSoyad.length < 1 || adSoyad.length > 120) return hata(400, 'Ad soyad 1-120 karakter olmalı.');
  if (!DAVET_EDILEBILIR_ROLLER.includes(rol)) return hata(400, 'Geçersiz rol.');
  if (sinifIdleri === null || ogrenciIdleri === null) {
    return hata(400, `Sınıf/öğrenci listeleri geçerli UUID'lerden oluşmalı (en fazla ${EN_FAZLA_BAG}).`);
  }
  if (rol !== 'ogretmen' && sinifIdleri.length > 0) return hata(400, 'Sınıf ataması yalnızca öğretmen için geçerli.');
  if (rol !== 'veli' && ogrenciIdleri.length > 0) return hata(400, 'Öğrenci bağı yalnızca veli için geçerli.');

  // 3. Yetki matrisi: hedef kurumu SUNUCU belirler
  let hedefKurumId: string;
  if (cagiran.rol === 'super_admin') {
    if (rol !== 'kurum_admin') return hata(403, 'Süper admin yalnızca kurum yöneticisi davet edebilir.');
    if (typeof govde.kurum_id !== 'string' || !UUID_RE.test(govde.kurum_id)) {
      return hata(400, 'kurum_id zorunlu ve geçerli bir UUID olmalı.');
    }
    hedefKurumId = govde.kurum_id;
  } else if (cagiran.rol === 'kurum_admin') {
    if (!cagiran.kurum_id) return hata(403, 'Bu işlem için yetkiniz yok.');
    hedefKurumId = cagiran.kurum_id; // gövdedeki kurum_id yok sayılır
  } else {
    return hata(403, 'Bu işlem için yetkiniz yok.');
  }

  // Bundan sonrası service_role ile (RLS'i aşar) — yetki kararı yukarıda verildi.
  const servis = createClient(supabaseUrl, servisAnahtar, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 4. Hedef kurum ve bağlanacak sınıf/öğrenciler gerçekten bu kuruma ait mi?
  //    (Bileşik FK kurumlar arası bağı zaten engeller; bu kontrol net hata mesajı içindir.)
  const { data: kurum, error: kurumHatasi } = await servis.from('kurum').select('id').eq('id', hedefKurumId).maybeSingle();
  if (kurumHatasi) {
    console.error('davet-gonder: kurum okunamadı', kurumHatasi);
    return hata(500, 'İşlem şu an yapılamıyor.');
  }
  if (!kurum) return hata(400, 'Kurum bulunamadı.');

  if (sinifIdleri.length > 0) {
    const { data, error } = await servis.from('sinif').select('id').eq('kurum_id', hedefKurumId).in('id', sinifIdleri);
    if (error) {
      console.error('davet-gonder: sınıflar okunamadı', error);
      return hata(500, 'İşlem şu an yapılamıyor.');
    }
    if ((data?.length ?? 0) !== sinifIdleri.length) return hata(400, 'Sınıflardan biri bu kuruma ait değil.');
  }
  if (ogrenciIdleri.length > 0) {
    const { data, error } = await servis.from('ogrenci').select('id').eq('kurum_id', hedefKurumId).in('id', ogrenciIdleri);
    if (error) {
      console.error('davet-gonder: öğrenciler okunamadı', error);
      return hata(500, 'İşlem şu an yapılamıyor.');
    }
    if ((data?.length ?? 0) !== ogrenciIdleri.length) return hata(400, 'Öğrencilerden biri bu kuruma ait değil.');
  }

  // 5. Davet et, ardından kullanici + bağ satırlarını oluştur. Herhangi bir adım düşerse
  //    auth kullanıcısı silinir (FK cascade kullanici ve bağlarını da siler).
  const { data: davet, error: davetHatasi } = await servis.auth.admin.inviteUserByEmail(email, {
    redirectTo: DAVET_YONLENDIRME_URL,
    data: { ad_soyad: adSoyad },
  });
  if (davetHatasi || !davet.user) {
    if (davetHatasi && (davetHatasi.code === 'email_exists' || /already.*registered/i.test(davetHatasi.message))) {
      return hata(409, 'Bu e-posta adresi zaten kayıtlı.');
    }
    console.error('davet-gonder: davet gönderilemedi', davetHatasi);
    return hata(500, 'Davet gönderilemedi.');
  }
  const authId = davet.user.id;

  const geriAl = async () => {
    const { error } = await servis.auth.admin.deleteUser(authId);
    if (error) console.error('davet-gonder: geri alma başarısız, elle silinmeli:', authId, error);
  };

  const { data: yeni, error: kullaniciHatasi } = await servis
    .from('kullanici')
    .insert({ auth_id: authId, rol, kurum_id: hedefKurumId, ad_soyad: adSoyad })
    .select('id')
    .single();
  if (kullaniciHatasi || !yeni) {
    console.error('davet-gonder: kullanici eklenemedi', kullaniciHatasi);
    await geriAl();
    return hata(500, 'Kullanıcı oluşturulamadı.');
  }

  if (rol === 'ogretmen' && sinifIdleri.length > 0) {
    const { error } = await servis
      .from('ogretmen_sinif')
      .insert(sinifIdleri.map((sinif_id) => ({ kurum_id: hedefKurumId, ogretmen_id: yeni.id, sinif_id })));
    if (error) {
      console.error('davet-gonder: ogretmen_sinif eklenemedi', error);
      await geriAl();
      return hata(500, 'Sınıf atamaları yapılamadı; davet geri alındı.');
    }
  }
  if (rol === 'veli' && ogrenciIdleri.length > 0) {
    const { error } = await servis
      .from('veli_ogrenci')
      .insert(ogrenciIdleri.map((ogrenci_id) => ({ kurum_id: hedefKurumId, veli_id: yeni.id, ogrenci_id })));
    if (error) {
      console.error('davet-gonder: veli_ogrenci eklenemedi', error);
      await geriAl();
      return hata(500, 'Öğrenci bağları kurulamadı; davet geri alındı.');
    }
  }

  return yanit(200, { kullanici_id: yeni.id });
});
