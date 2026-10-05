// Gelişim Bildirim Gönder Edge Function: bir öğrenciye yeni gelişim kaydı girildiğinde
// velisine/velilerine Expo Push API üzerinden push bildirimi gönderir ve bildirim_log'a yazar.
//
// Neden sunucuda: Expo Push API'ye gönderilen EXPO_ACCESS_TOKEN gizli tutulmalı (istemci
// bundle'ına asla konmamalı) ve service_role anahtarı uygulamaya konamaz.
//
// Yetki: yalnızca `ogretmen`, `kurum_admin`, `super_admin` çağırabilir. Kayıt, çağıranın
// JWT'siyle (RLS'e tabi) okunur — boş dönerse bu kayda erişimi yoktur. Ek olarak kaydı giren
// kişi çağıranın kendisi olmalıdır: aynı sınıfın başka öğretmeni (kaydı okuyabilir) ya da
// kaydı okuyabilen herhangi biri, başkasının kaydı için tekrar tekrar bildirim tetikleyemez.
//
// Bildirim metninde notun kendisi YOKTUR (kilit ekranında görünür); yalnızca öğrenci adı ve
// kategori yazılır.
//
// Bu bir "en iyi çaba" bildirimidir: kayıt zaten tamamlandı, bildirim gönderiminde yaşanan
// herhangi bir hata öğretmenin ekranına hata olarak yansımamalı — bu yüzden fonksiyon
// (girdi doğrulama ve yetki hataları dışında) her zaman 200 döner.

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS_BASLIKLARI = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  const expoErisimTokeni = Deno.env.get('EXPO_ACCESS_TOKEN');
  if (!supabaseUrl || !anonAnahtar || !servisAnahtar) {
    console.error('gelisim-bildirim-gonder: SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY tanımlı değil');
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
    .select('id, rol')
    .eq('auth_id', kimlik.user.id)
    .maybeSingle();
  if (cagiranHatasi) {
    console.error('gelisim-bildirim-gonder: çağıran okunamadı', cagiranHatasi);
    return hata(500, 'İşlem şu an yapılamıyor.');
  }
  if (!cagiran) return hata(403, 'Bu işlem için yetkiniz yok.');
  if (cagiran.rol !== 'ogretmen' && cagiran.rol !== 'kurum_admin' && cagiran.rol !== 'super_admin') {
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

  const kayitId = typeof govde.gelisim_kaydi_id === 'string' ? govde.gelisim_kaydi_id : '';
  if (!UUID_RE.test(kayitId)) return hata(400, 'Geçersiz kayıt.');

  // 3. Kayıt, çağıranın JWT'siyle okunur: RLS'i geçen satır, çağıranın erişebildiği satırdır.
  //    Bildirim içeriği (öğrenci, kategori) istemciden değil bu satırdan türetilir.
  const { data: kayit, error: kayitHatasi } = await kullaniciClient
    .from('gelisim_kaydi')
    .select('id, kurum_id, ogrenci_id, kategori_id, giren_kullanici_id')
    .eq('id', kayitId)
    .maybeSingle();
  if (kayitHatasi) {
    console.error('gelisim-bildirim-gonder: kayıt okunamadı', kayitHatasi);
    return hata(500, 'İşlem şu an yapılamıyor.');
  }
  if (!kayit || kayit.giren_kullanici_id !== cagiran.id) return hata(403, 'Bu işlem için yetkiniz yok.');

  // Bundan sonrası service_role ile (RLS'i aşar) — yetki kararı yukarıda verildi.
  const servis = createClient(supabaseUrl, servisAnahtar, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const bos = () => yanit(200, { bildirilen_veli_sayisi: 0, push_gonderilen_sayisi: 0 });

  const [{ data: ogrenci }, { data: kategori }] = await Promise.all([
    servis.from('ogrenci').select('ad_soyad').eq('id', kayit.ogrenci_id).maybeSingle(),
    servis.from('gelisim_kategorisi').select('ad').eq('id', kayit.kategori_id).maybeSingle(),
  ]);
  if (!ogrenci || !kategori) {
    console.error('gelisim-bildirim-gonder: öğrenci ya da kategori okunamadı');
    return bos();
  }

  // 4. Velileri bul
  const { data: veliBaglari, error: veliBaglariHatasi } = await servis
    .from('veli_ogrenci')
    .select('veli_id')
    .eq('ogrenci_id', kayit.ogrenci_id);
  if (veliBaglariHatasi) {
    console.error('gelisim-bildirim-gonder: veli_ogrenci okunamadı', veliBaglariHatasi);
    return bos();
  }
  const veliIdleri = (veliBaglari ?? []).map((v) => v.veli_id);
  if (veliIdleri.length === 0) return bos();

  const { data: veliler, error: velilerHatasi } = await servis
    .from('kullanici')
    .select('id, expo_push_token')
    .in('id', veliIdleri);
  if (velilerHatasi) {
    console.error('gelisim-bildirim-gonder: veliler okunamadı', velilerHatasi);
    return bos();
  }

  // 5. Push token'ı olanlara tek batched istekle gönder
  const tokenliVeliler = (veliler ?? []).filter((v) => v.expo_push_token);
  if (tokenliVeliler.length > 0 && expoErisimTokeni) {
    try {
      const mesajlar = tokenliVeliler.map((v) => ({
        to: v.expo_push_token,
        title: 'Gelişim Kaydı',
        body: `${ogrenci.ad_soyad} için yeni kayıt: ${kategori.ad}`,
        data: { ogrenci_id: kayit.ogrenci_id, tip: 'gelisim_kaydi' },
      }));
      const expoYaniti = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${expoErisimTokeni}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(mesajlar),
      });
      if (!expoYaniti.ok) {
        console.error('gelisim-bildirim-gonder: Expo Push API hatası', expoYaniti.status, await expoYaniti.text());
      } else {
        const expoGovdesi = await expoYaniti.json();
        for (const sonuc of expoGovdesi.data ?? []) {
          if (sonuc.status === 'error') console.error('gelisim-bildirim-gonder: bildirim gönderilemedi', sonuc.message);
        }
      }
    } catch (e) {
      console.error('gelisim-bildirim-gonder: Expo Push API çağrısı başarısız', e);
    }
  } else if (tokenliVeliler.length > 0 && !expoErisimTokeni) {
    console.error('gelisim-bildirim-gonder: EXPO_ACCESS_TOKEN tanımlı değil, push gönderilemedi');
  }

  // 6. Her bildirilen veli için (token olsun olmasın) bildirim_log'a yaz
  const { error: logHatasi } = await servis.from('bildirim_log').insert(
    (veliler ?? []).map((v) => ({
      kurum_id: kayit.kurum_id,
      alici_kullanici_id: v.id,
      tip: 'gelisim_kaydi' as const,
    })),
  );
  if (logHatasi) console.error('gelisim-bildirim-gonder: bildirim_log yazılamadı', logHatasi);

  return yanit(200, { bildirilen_veli_sayisi: veliler?.length ?? 0, push_gonderilen_sayisi: tokenliVeliler.length });
});
