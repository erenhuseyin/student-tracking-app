// Yoklama Bildirim Gönder Edge Function: bir öğrencinin velisine/velilerine, öğretmen
// yoklama girdiğinde Expo Push API üzerinden push bildirimi gönderir ve bildirim_log'a yazar.
//
// Neden sunucuda: Expo Push API'ye gönderilen EXPO_ACCESS_TOKEN gizli tutulmalı (istemci
// bundle'ına asla konmamalı) ve service_role anahtarı uygulamaya konamaz.
//
// Yetki: yalnızca `ogretmen`, `kurum_admin`, `super_admin` çağırabilir (veli çağıramaz —
// aksi halde kendi çocuğu için sahte `durum` ile kendine/eş-veliye yanıltıcı bildirim
// tetikleyebilirdi). Öğretmen için ikinci katman: `ogrenci` satırı RLS'e tabi client ile
// okunur — boş dönerse bu öğrenciye erişimi yoktur (gizli.ogretmen_ogrencisi_mi zaten
// ogrenci_ogretmen_oku politikasında uygulanıyor).
//
// Bu bir "en iyi çaba" bildirimidir: yoklama kaydı zaten tamamlandı, bildirim gönderiminde
// yaşanan herhangi bir hata öğretmenin ekranına hata olarak yansımamalı — bu yüzden fonksiyon
// (girdi doğrulama hataları dışında) her zaman 200 döner.

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS_BASLIKLARI = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const YOKLAMA_DURUMLARI = ['geldi', 'gelmedi', 'gec', 'mazeretli'] as const;
type YoklamaDurumu = (typeof YOKLAMA_DURUMLARI)[number];
const DURUM_METNI: Record<YoklamaDurumu, string> = { geldi: 'Geldi', gelmedi: 'Gelmedi', gec: 'Geç', mazeretli: 'Mazeretli' };

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
    console.error('yoklama-bildirim-gonder: SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY tanımlı değil');
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
    console.error('yoklama-bildirim-gonder: çağıran okunamadı', cagiranHatasi);
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

  const ogrenciId = typeof govde.ogrenci_id === 'string' ? govde.ogrenci_id : '';
  const durum = govde.durum as YoklamaDurumu;
  if (!UUID_RE.test(ogrenciId)) return hata(400, 'Geçersiz öğrenci.');
  if (!YOKLAMA_DURUMLARI.includes(durum)) return hata(400, 'Geçersiz durum.');

  // 3. Çağıranın bu öğrenciye erişimi var mı? RLS'in kendisi ikinci yetki katmanı:
  //    kullaniciClient (anon key + çağıranın JWT'si) ile okunan satır, RLS'i geçen satırdır.
  const { data: ogrenci, error: ogrenciHatasi } = await kullaniciClient
    .from('ogrenci')
    .select('id, kurum_id, ad_soyad')
    .eq('id', ogrenciId)
    .maybeSingle();
  if (ogrenciHatasi) {
    console.error('yoklama-bildirim-gonder: öğrenci okunamadı', ogrenciHatasi);
    return hata(500, 'İşlem şu an yapılamıyor.');
  }
  if (!ogrenci) return hata(403, 'Bu işlem için yetkiniz yok.');

  // Bundan sonrası service_role ile (RLS'i aşar) — yetki kararı yukarıda verildi.
  const servis = createClient(supabaseUrl, servisAnahtar, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 4. Velileri bul
  const { data: veliBaglari, error: veliBaglariHatasi } = await servis
    .from('veli_ogrenci')
    .select('veli_id')
    .eq('ogrenci_id', ogrenciId);
  if (veliBaglariHatasi) {
    console.error('yoklama-bildirim-gonder: veli_ogrenci okunamadı', veliBaglariHatasi);
    return yanit(200, { bildirilen_veli_sayisi: 0, push_gonderilen_sayisi: 0 });
  }
  const veliIdleri = (veliBaglari ?? []).map((v) => v.veli_id);
  if (veliIdleri.length === 0) {
    return yanit(200, { bildirilen_veli_sayisi: 0, push_gonderilen_sayisi: 0 });
  }

  const { data: veliler, error: velilerHatasi } = await servis
    .from('kullanici')
    .select('id, expo_push_token')
    .in('id', veliIdleri);
  if (velilerHatasi) {
    console.error('yoklama-bildirim-gonder: veliler okunamadı', velilerHatasi);
    return yanit(200, { bildirilen_veli_sayisi: 0, push_gonderilen_sayisi: 0 });
  }

  // Push ve uygulama içi bildirim listesi aynı metni kullanır.
  const bildirimMetni = `${ogrenci.ad_soyad} için yoklama: ${DURUM_METNI[durum]}`;

  // 5. Push token'ı olanlara tek batched istekle gönder
  const tokenliVeliler = (veliler ?? []).filter((v) => v.expo_push_token);
  if (tokenliVeliler.length > 0 && expoErisimTokeni) {
    try {
      const mesajlar = tokenliVeliler.map((v) => ({
        to: v.expo_push_token,
        title: 'Yoklama',
        body: bildirimMetni,
        data: { ogrenci_id: ogrenciId, tip: 'yoklama' },
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
        console.error('yoklama-bildirim-gonder: Expo Push API hatası', expoYaniti.status, await expoYaniti.text());
      } else {
        const expoGovdesi = await expoYaniti.json();
        for (const sonuc of expoGovdesi.data ?? []) {
          if (sonuc.status === 'error') console.error('yoklama-bildirim-gonder: bildirim gönderilemedi', sonuc.message);
        }
      }
    } catch (e) {
      console.error('yoklama-bildirim-gonder: Expo Push API çağrısı başarısız', e);
    }
  } else if (tokenliVeliler.length > 0 && !expoErisimTokeni) {
    console.error('yoklama-bildirim-gonder: EXPO_ACCESS_TOKEN tanımlı değil, push gönderilemedi');
  }

  // 6. Her bildirilen veli için (token olsun olmasın) bildirim_log'a yaz
  const { error: logHatasi } = await servis.from('bildirim_log').insert(
    (veliler ?? []).map((v) => ({
      kurum_id: ogrenci.kurum_id,
      alici_kullanici_id: v.id,
      tip: 'yoklama' as const,
      baslik: 'Yoklama',
      metin: bildirimMetni,
      ogrenci_id: ogrenciId,
    })),
  );
  if (logHatasi) console.error('yoklama-bildirim-gonder: bildirim_log yazılamadı', logHatasi);

  return yanit(200, { bildirilen_veli_sayisi: veliler?.length ?? 0, push_gonderilen_sayisi: tokenliVeliler.length });
});
