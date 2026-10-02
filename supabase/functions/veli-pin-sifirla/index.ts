// Veli PIN Sıfırla Edge Function: bir öğrencinin velisinin PIN'ini varsayılan '1234'e döndürür.
//
// Veli hesabını `veli_ogrenci.veli_id` üzerinden DEĞİL, `ogrenci.tckn`'den türeyen e-posta
// üzerinden bulur: TCKN+PIN girişi zaten tüm velileri tek paylaşılan kimlik bilgisine
// indirgiyor (bkz. docs/ILERLEME.md), `veli_ogrenci` birden fazla satır içerse bile giriş
// tek auth hesabına bağlı.
//
// Yetki matrisi:
//   super_admin -> herhangi bir kurumun öğrencisinin velisini sıfırlayabilir
//   kurum_admin -> yalnızca yönettiği kurumların (kendi kurumu + şubeleri) öğrencisinin velisini
//   ogretmen, veli -> 403

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS_BASLIKLARI = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VELI_EPOSTA_SONEKI = 'veli.internal';
const VARSAYILAN_PIN = '1234';

// Supabase Dashboard'da minimum şifre uzunluğu 6'nın altına indirilemiyor (denendi, reddedildi).
// 4 haneli PIN'i Auth'a göndermeden önce deterministik olarak uzatıyoruz. `lib/ogrenciler.ts`'deki
// `pinAuthSifresi`'nin kopyasıdır — Deno ve React Native arasında paylaşılan paket yok.
function pinAuthSifresi(pin: string): string {
  return pin + pin;
}

function yanit(durum: number, govde: Record<string, unknown>): Response {
  return new Response(JSON.stringify(govde), {
    status: durum,
    headers: { ...CORS_BASLIKLARI, 'Content-Type': 'application/json' },
  });
}

const hata = (durum: number, mesaj: string) => yanit(durum, { hata: mesaj });

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_BASLIKLARI });
  if (req.method !== 'POST') return hata(405, 'Yalnızca POST desteklenir.');

  const yetkiBasligi = req.headers.get('Authorization');
  if (!yetkiBasligi) return hata(401, 'Oturum açmanız gerekiyor.');

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonAnahtar = Deno.env.get('SUPABASE_ANON_KEY');
  const servisAnahtar = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonAnahtar || !servisAnahtar) {
    console.error('veli-pin-sifirla: SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY tanımlı değil');
    return hata(500, 'Sunucu yapılandırması eksik.');
  }

  // 1. Çağıranı doğrula
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
    console.error('veli-pin-sifirla: çağıran okunamadı', cagiranHatasi);
    return hata(500, 'İşlem şu an yapılamıyor.');
  }
  if (!cagiran) return hata(403, 'Bu işlem için yetkiniz yok.');
  if (cagiran.rol !== 'super_admin' && cagiran.rol !== 'kurum_admin') {
    return hata(403, 'Bu işlem için yetkiniz yok.');
  }

  // 2. Gövdeyi doğrula
  let govde: Record<string, unknown>;
  try {
    govde = await req.json();
  } catch {
    return hata(400, 'İstek gövdesi geçerli JSON olmalı.');
  }
  if (typeof govde !== 'object' || govde === null) return hata(400, 'İstek gövdesi geçersiz.');

  const ogrenciId = typeof govde.ogrenci_id === 'string' ? govde.ogrenci_id : '';
  if (!UUID_RE.test(ogrenciId)) return hata(400, 'Geçersiz öğrenci.');

  // 3. Çağıranın bu öğrenciye erişimi var mı? RLS'in kendisi yetki katmanı: kullaniciClient
  //    ile okunan satır, RLS'i geçen satırdır (kurum admini için kendi kurumu + şubeleri).
  const { data: ogrenci, error: ogrenciHatasi } = await kullaniciClient
    .from('ogrenci')
    .select('id, kurum_id, kok_kurum_id, tckn')
    .eq('id', ogrenciId)
    .maybeSingle();
  if (ogrenciHatasi) {
    console.error('veli-pin-sifirla: öğrenci okunamadı', ogrenciHatasi);
    return hata(500, 'İşlem şu an yapılamıyor.');
  }
  if (!ogrenci) return hata(403, 'Bu işlem için yetkiniz yok.');
  if (!ogrenci.tckn) return hata(400, 'Bu öğrenciye henüz TCKN atanmamış.');

  // Bundan sonrası service_role ile (RLS'i aşar) — yetki kararı yukarıda verildi.
  const servis = createClient(supabaseUrl, servisAnahtar, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: kokKurum, error: kokKurumHatasi } = await servis
    .from('kurum')
    .select('marka_kodu')
    .eq('id', ogrenci.kok_kurum_id)
    .maybeSingle();
  if (kokKurumHatasi) {
    console.error('veli-pin-sifirla: kök kurum okunamadı', kokKurumHatasi);
    return hata(500, 'İşlem şu an yapılamıyor.');
  }
  if (!kokKurum?.marka_kodu) return hata(404, 'Bu öğrenci için veli hesabı bulunamadı.');

  // GoTrue admin API'de e-postaya göre doğrudan arama yoktur (yalnızca listUsers/getUserById);
  // sayfalayarak aranır. MVP ölçeğinde (bkz. docs/ILERLEME.md maliyet tartışması) kabul edilebilir;
  // proje çok büyürse (~50 sayfa = 50.000 kullanıcı) bu, `kullanici` üzerinde e-posta tutan bir
  // ters index eklenerek tek sorguya indirgenebilir.
  const email = `${ogrenci.tckn}@${kokKurum.marka_kodu}.${VELI_EPOSTA_SONEKI}`;
  const EN_FAZLA_SAYFA = 50;
  let veliAuthId: string | null = null;
  for (let sayfa = 1; sayfa <= EN_FAZLA_SAYFA; sayfa++) {
    const { data, error: listeHatasi } = await servis.auth.admin.listUsers({ page: sayfa, perPage: 1000 });
    if (listeHatasi) {
      console.error('veli-pin-sifirla: kullanıcılar listelenemedi', listeHatasi);
      return hata(500, 'İşlem şu an yapılamıyor.');
    }
    const bulunan = data.users.find((u) => u.email === email);
    if (bulunan) {
      veliAuthId = bulunan.id;
      break;
    }
    if (data.users.length < 1000) break; // son sayfaydı
  }
  if (!veliAuthId) return hata(404, 'Bu öğrenci için veli hesabı bulunamadı.');

  const { error: guncelleHatasi } = await servis.auth.admin.updateUserById(veliAuthId, {
    password: pinAuthSifresi(VARSAYILAN_PIN),
  });
  if (guncelleHatasi) {
    console.error('veli-pin-sifirla: PIN güncellenemedi', guncelleHatasi);
    return hata(500, 'PIN sıfırlanamadı.');
  }

  return yanit(200, {});
});
