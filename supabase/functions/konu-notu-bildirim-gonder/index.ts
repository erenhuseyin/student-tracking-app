// Konu Notu Bildirim Gönder Edge Function: yönetici bir konu notuna yanıt yazınca sınıfın
// öğretmenlerine Expo Push API üzerinden bildirim gönderir ve bildirim_log'a yazar.
//
// Yetki: yalnızca `kurum_admin` ve `super_admin` çağırabilir. Not, çağıranın JWT'siyle (RLS'e
// tabi) okunur — boş dönerse bu nota erişimi yoktur. Ek olarak yanıtı veren kişi çağıranın kendisi
// olmalıdır: notu okuyabilen başka bir yönetici, başkasının yanıtı için bildirim tetikleyemez.
//
// Bildirim metninde not ve yanıt YOKTUR (kilit ekranında görünür); yalnızca sınıf, ders ve konu
// adı yazılır. Bildirime dokununca sınıfın ders takibi açılır (`sinif_id`).
//
// Bu bir "en iyi çaba" bildirimidir: yanıt zaten kaydedildi; gönderimde yaşanan bir hata
// yöneticinin ekranına yansımamalı — bu yüzden fonksiyon (girdi doğrulama ve yetki hataları
// dışında) her zaman 200 döner.

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS_BASLIKLARI = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BASLIK = 'Konu Notu';

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
    console.error('konu-notu-bildirim-gonder: SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY tanımlı değil');
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
    console.error('konu-notu-bildirim-gonder: çağıran okunamadı', cagiranHatasi);
    return hata(500, 'İşlem şu an yapılamıyor.');
  }
  if (!cagiran || (cagiran.rol !== 'kurum_admin' && cagiran.rol !== 'super_admin')) {
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
  const sinifId = typeof govde.sinif_id === 'string' ? govde.sinif_id : '';
  const konuId = typeof govde.konu_id === 'string' ? govde.konu_id : '';
  if (!UUID_RE.test(sinifId) || !UUID_RE.test(konuId)) return hata(400, 'Geçersiz not.');

  // 3. Not, çağıranın JWT'siyle okunur: RLS'i geçen satır, çağıranın erişebildiği nottur.
  const { data: not, error: notHatasi } = await kullaniciClient
    .from('sinif_konu_notu')
    .select('sinif_id, konu_id, yanit_metni, yanit_veren_kullanici_id')
    .eq('sinif_id', sinifId)
    .eq('konu_id', konuId)
    .maybeSingle();
  if (notHatasi) {
    console.error('konu-notu-bildirim-gonder: not okunamadı', notHatasi);
    return hata(500, 'İşlem şu an yapılamıyor.');
  }
  if (!not || !not.yanit_metni || not.yanit_veren_kullanici_id !== cagiran.id) {
    return hata(403, 'Bu işlem için yetkiniz yok.');
  }

  // Bundan sonrası service_role ile (RLS'i aşar) — yetki kararı yukarıda verildi.
  const servis = createClient(supabaseUrl, servisAnahtar, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const bos = () => yanit(200, { bildirilen_ogretmen_sayisi: 0, push_gonderilen_sayisi: 0 });

  const [{ data: sinif }, { data: konu }, { data: atamalar, error: atamaHatasi }] = await Promise.all([
    servis.from('sinif').select('ad').eq('id', sinifId).maybeSingle(),
    servis.from('ders_konusu').select('ad, kademe_dersi (ad)').eq('id', konuId).maybeSingle(),
    servis.from('ogretmen_sinif').select('ogretmen_id').eq('sinif_id', sinifId),
  ]);
  if (!sinif || !konu || atamaHatasi) {
    console.error('konu-notu-bildirim-gonder: sınıf, konu ya da atamalar okunamadı', atamaHatasi);
    return bos();
  }

  // 4. Sınıfın aktif öğretmenleri (yanıtı veren kendisi öğretmen değildir; yine de dışarıda bırakılır)
  const ogretmenIdleri = (atamalar ?? []).map((a) => a.ogretmen_id).filter((id) => id !== cagiran.id);
  if (ogretmenIdleri.length === 0) return bos();
  const { data: ogretmenler, error: ogretmenHatasi } = await servis
    .from('kullanici')
    .select('id, kurum_id, expo_push_token')
    .in('id', ogretmenIdleri)
    .eq('aktif', true);
  if (ogretmenHatasi || !ogretmenler || ogretmenler.length === 0) {
    if (ogretmenHatasi) console.error('konu-notu-bildirim-gonder: öğretmenler okunamadı', ogretmenHatasi);
    return bos();
  }

  const dersAdi = (konu.kademe_dersi as unknown as { ad: string } | null)?.ad;
  const bildirimMetni = `${sinif.ad}${dersAdi ? ` · ${dersAdi}` : ''}: "${konu.ad}" notunuza yanıt verildi`;

  // 5. Push token'ı olanlara tek batched istekle gönder
  const tokenliler = ogretmenler.filter((o) => o.expo_push_token);
  if (tokenliler.length > 0 && expoErisimTokeni) {
    try {
      const expoYaniti = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${expoErisimTokeni}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(
          tokenliler.map((o) => ({
            to: o.expo_push_token,
            title: BASLIK,
            body: bildirimMetni,
            data: { tip: 'konu_notu', sinif_id: sinifId },
          })),
        ),
      });
      if (!expoYaniti.ok) {
        console.error('konu-notu-bildirim-gonder: Expo Push API hatası', expoYaniti.status, await expoYaniti.text());
      } else {
        const expoGovdesi = await expoYaniti.json();
        for (const sonuc of expoGovdesi.data ?? []) {
          if (sonuc.status === 'error') console.error('konu-notu-bildirim-gonder: bildirim gönderilemedi', sonuc.message);
        }
      }
    } catch (e) {
      console.error('konu-notu-bildirim-gonder: Expo Push API çağrısı başarısız', e);
    }
  } else if (tokenliler.length > 0 && !expoErisimTokeni) {
    console.error('konu-notu-bildirim-gonder: EXPO_ACCESS_TOKEN tanımlı değil, push gönderilemedi');
  }

  // 6. Her bildirilen öğretmen için (token olsun olmasın) bildirim_log'a yaz
  const { error: logHatasi } = await servis.from('bildirim_log').insert(
    ogretmenler.map((o) => ({
      kurum_id: o.kurum_id,
      alici_kullanici_id: o.id,
      tip: 'konu_notu' as const,
      baslik: BASLIK,
      metin: bildirimMetni,
      sinif_id: sinifId,
    })),
  );
  if (logHatasi) console.error('konu-notu-bildirim-gonder: bildirim_log yazılamadı', logHatasi);

  return yanit(200, { bildirilen_ogretmen_sayisi: ogretmenler.length, push_gonderilen_sayisi: tokenliler.length });
});
