// Duyuru Bildirim Gönder Edge Function: yeni bir duyuru/etkinlik yazıldığında kapsamındaki
// velilere ve — kurum geneli duyuruda — öğretmenlere Expo Push API üzerinden push gönderir ve
// bildirim_log'a yazar.
//
// Neden sunucuda: EXPO_ACCESS_TOKEN gizli tutulmalı ve alıcıların push token'larını okumak
// service_role ister.
//
// Yetki: yalnızca `ogretmen`, `kurum_admin`, `super_admin` çağırabilir. Duyuru, çağıranın
// JWT'siyle (RLS'e tabi) okunur ve duyuruyu yazan kişi çağıranın kendisi olmalıdır: duyuruyu
// okuyabilen herhangi biri başkasının duyurusu için tekrar tekrar bildirim tetikleyemez.
//
// Alıcılar (yazan kişi hariç, yalnızca aktif hesaplar):
//   sınıfa özel        -> o sınıftaki öğrencilerin velileri
//   şube geneli        -> o şubenin velileri ve öğretmenleri
//   müşteri geneli     -> ana kurumun ve tüm şubelerinin velileri ve öğretmenleri
// Kurum "Duyurular" bölümünü bir rol için kapattıysa (kapali_bolum) o role bildirim gitmez.
//
// Bildirim metninde yalnızca başlık yer alır; içerik kilit ekranına yazılmaz.
//
// "En iyi çaba" bildirimidir: duyuru zaten kaydedildi, gönderim hatası yazanın ekranına
// yansımamalı — fonksiyon (girdi doğrulama ve yetki hataları dışında) her zaman 200 döner.

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS_BASLIKLARI = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Expo Push API tek istekte en fazla 100 mesaj kabul eder.
const PUSH_PARTI_BOYUTU = 100;

type Alici = { id: string; kurum_id: string; rol: string; expo_push_token: string | null };

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
    console.error('duyuru-bildirim-gonder: SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY tanımlı değil');
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
    console.error('duyuru-bildirim-gonder: çağıran okunamadı', cagiranHatasi);
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

  const duyuruId = typeof govde.duyuru_id === 'string' ? govde.duyuru_id : '';
  if (!UUID_RE.test(duyuruId)) return hata(400, 'Geçersiz duyuru.');

  // 3. Duyuru çağıranın JWT'siyle okunur; içerik ve kapsam istemciden değil bu satırdan türetilir.
  const { data: duyuru, error: duyuruHatasi } = await kullaniciClient
    .from('duyuru')
    .select('id, kurum_id, kok_kurum_id, sinif_id, tur, baslik, giren_kullanici_id')
    .eq('id', duyuruId)
    .maybeSingle();
  if (duyuruHatasi) {
    console.error('duyuru-bildirim-gonder: duyuru okunamadı', duyuruHatasi);
    return hata(500, 'İşlem şu an yapılamıyor.');
  }
  if (!duyuru || duyuru.giren_kullanici_id !== cagiran.id) return hata(403, 'Bu işlem için yetkiniz yok.');

  // Bundan sonrası service_role ile (RLS'i aşar) — yetki kararı yukarıda verildi.
  const servis = createClient(supabaseUrl, servisAnahtar, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const bos = () => yanit(200, { bildirilen_sayisi: 0, push_gonderilen_sayisi: 0 });

  // 4. Alıcıları bul
  let alicilar: Alici[] = [];
  const ALICI_KOLONLARI = 'id, kurum_id, rol, expo_push_token';
  if (duyuru.sinif_id) {
    const { data: ogrenciler, error: ogrenciHatasi } = await servis.from('ogrenci').select('id').eq('sinif_id', duyuru.sinif_id);
    if (ogrenciHatasi) {
      console.error('duyuru-bildirim-gonder: öğrenciler okunamadı', ogrenciHatasi);
      return bos();
    }
    const ogrenciIdleri = (ogrenciler ?? []).map((o) => o.id);
    if (ogrenciIdleri.length === 0) return bos();
    const { data: baglar, error: bagHatasi } = await servis.from('veli_ogrenci').select('veli_id').in('ogrenci_id', ogrenciIdleri);
    if (bagHatasi) {
      console.error('duyuru-bildirim-gonder: veli_ogrenci okunamadı', bagHatasi);
      return bos();
    }
    const veliIdleri = [...new Set((baglar ?? []).map((b) => b.veli_id))];
    if (veliIdleri.length === 0) return bos();
    const { data, error } = await servis.from('kullanici').select(ALICI_KOLONLARI).in('id', veliIdleri).eq('aktif', true);
    if (error) {
      console.error('duyuru-bildirim-gonder: veliler okunamadı', error);
      return bos();
    }
    alicilar = (data ?? []) as Alici[];
  } else {
    // Kök kuruma yazılmış duyuru şubeleri de kapsar.
    let kurumIdleri = [duyuru.kurum_id];
    if (duyuru.kurum_id === duyuru.kok_kurum_id) {
      const { data: subeler, error: subeHatasi } = await servis.from('kurum').select('id').eq('ust_kurum_id', duyuru.kurum_id);
      if (subeHatasi) {
        console.error('duyuru-bildirim-gonder: şubeler okunamadı', subeHatasi);
        return bos();
      }
      kurumIdleri = [duyuru.kurum_id, ...(subeler ?? []).map((s) => s.id)];
    }
    const { data, error } = await servis
      .from('kullanici')
      .select(ALICI_KOLONLARI)
      .in('kurum_id', kurumIdleri)
      .in('rol', ['veli', 'ogretmen'])
      .eq('aktif', true);
    if (error) {
      console.error('duyuru-bildirim-gonder: alıcılar okunamadı', error);
      return bos();
    }
    alicilar = (data ?? []) as Alici[];
  }

  // Kurumun "Duyurular" bölümünü kapattığı roller bildirim de almaz. Tablo okunamazsa
  // (ör. migration henüz uygulanmadıysa) kimse dışarıda bırakılmaz.
  const { data: kapalilar } = await servis
    .from('kapali_bolum')
    .select('rol')
    .eq('kurum_id', duyuru.kok_kurum_id)
    .eq('bolum_anahtari', 'duyurular');
  const kapaliRoller = new Set((kapalilar ?? []).map((k) => k.rol));
  alicilar = alicilar.filter((a) => a.id !== cagiran.id && !kapaliRoller.has(a.rol));
  if (alicilar.length === 0) return bos();

  // 5. Push token'ı olanlara partiler halinde gönder
  const tokenliler = alicilar.filter((a) => a.expo_push_token);
  if (tokenliler.length > 0 && expoErisimTokeni) {
    const mesajlar = tokenliler.map((a) => ({
      to: a.expo_push_token,
      title: duyuru.tur === 'etkinlik' ? 'Yeni Etkinlik' : 'Yeni Duyuru',
      body: duyuru.baslik,
      data: { duyuru_id: duyuru.id, tip: 'duyuru' },
    }));
    for (let i = 0; i < mesajlar.length; i += PUSH_PARTI_BOYUTU) {
      try {
        const expoYaniti = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${expoErisimTokeni}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(mesajlar.slice(i, i + PUSH_PARTI_BOYUTU)),
        });
        if (!expoYaniti.ok) {
          console.error('duyuru-bildirim-gonder: Expo Push API hatası', expoYaniti.status, await expoYaniti.text());
        } else {
          const expoGovdesi = await expoYaniti.json();
          for (const sonuc of expoGovdesi.data ?? []) {
            if (sonuc.status === 'error') console.error('duyuru-bildirim-gonder: bildirim gönderilemedi', sonuc.message);
          }
        }
      } catch (e) {
        console.error('duyuru-bildirim-gonder: Expo Push API çağrısı başarısız', e);
      }
    }
  } else if (tokenliler.length > 0 && !expoErisimTokeni) {
    console.error('duyuru-bildirim-gonder: EXPO_ACCESS_TOKEN tanımlı değil, push gönderilemedi');
  }

  // 6. Her alıcı için (token olsun olmasın) bildirim_log'a yaz; satır alıcının kendi kurumunda durur.
  const { error: logHatasi } = await servis.from('bildirim_log').insert(
    alicilar.map((a) => ({ kurum_id: a.kurum_id, alici_kullanici_id: a.id, tip: 'duyuru' as const })),
  );
  if (logHatasi) console.error('duyuru-bildirim-gonder: bildirim_log yazılamadı', logHatasi);

  return yanit(200, { bildirilen_sayisi: alicilar.length, push_gonderilen_sayisi: tokenliler.length });
});
