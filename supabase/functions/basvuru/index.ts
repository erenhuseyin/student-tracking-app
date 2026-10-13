// Başvuru Edge Function: uygulamadan öğrenci ön kaydı ve personel (öğretmen) başvurusu.
//
// Neden sunucuda: başvuran giriş yapmamıştır; `basvuru` tablosuna istemciden yazma yetkisi
// yoktur. Hız sınırı, müşterinin başvuruyu açıp açmadığı ve kararın hesap açmayla birlikte
// verilmesi burada denetlenir.
//
// İşlemler (gövdede `islem`):
//   durum  (oturumsuz)  { marka_kodu } -> { acik, kurumlar: [{ id, ad }] }  (başvurulabilecek kurumlar)
//   gonder (oturumsuz)  yeni başvuru
//   karar  (oturumlu, yalnızca kurum_admin)  { basvuru_id, karar: 'onayla' | 'reddet', sinif_id?, karar_notu? }
//
// Açık/kapalı: müşterinin (kök kurumun) `ozellikler.basvuru === true` olması gerekir; bu alanı
// yalnızca süper admin yazar. Kapalıysa `gonder` reddedilir.
//
// Gizlilik: `gonder` kişinin sistemde kayıtlı olup olmadığını söylemez; aynı kişinin (öğrencide ad +
// doğum tarihi, personelde e-posta) bekleyen başvurusu varsa yenisi sessizce yok sayılır ve yine
// "alındı" cevabı döner. TC kimlik numarası istenmez ve tutulmaz.
//
// Onay, mevcut akışları çağıranın yetkisiyle çağırır (kod tekrarı ve ikinci bir yetki yolu
// olmasın diye):
//   öğrenci  -> `ogrenci` satırı eklenir, sonra `veli-hesap-olustur` (kullanıcı adı + veli hesabı, PIN 1234)
//   personel -> `personel-yonet` > `davet_et` (öğretmen; giriş kodu e-postayla gider)
// Bu yüzden kararı yalnızca kurum admini verir (süper admin öğretmen davet edemez).

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const CORS_BASLIKLARI = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MARKA_KODU_RE = /^[a-z][a-z0-9-]{1,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TARIH_RE = /^\d{4}-\d{2}-\d{2}$/;
const TELEFON_RE = /^[0-9+ ]{10,20}$/;
// Bir müşteriye (kök kurum ve şubeleri) bir saatte gelebilecek en fazla başvuru. Oturumsuz uç
// herkese açık olduğu için kaba bir üst sınır; gerçek kullanımda (kayıt dönemi dahil) aşılmaz.
const SAATLIK_SINIR = 40;
const BEKLEYEN_SINIRI = 300;

function yanit(durum: number, govde: Record<string, unknown>): Response {
  return new Response(JSON.stringify(govde), {
    status: durum,
    headers: { ...CORS_BASLIKLARI, 'Content-Type': 'application/json' },
  });
}

const hata = (durum: number, mesaj: string) => yanit(durum, { hata: mesaj });

const metin = (deger: unknown, azami: number): string => (typeof deger === 'string' ? deger.trim().slice(0, azami) : '');

function tarihGecerliMi(tarih: string): boolean {
  if (!TARIH_RE.test(tarih)) return false;
  const [yil, ay, gun] = tarih.split('-').map(Number);
  const d = new Date(Date.UTC(yil, ay - 1, gun));
  return d.getUTCFullYear() === yil && d.getUTCMonth() === ay - 1 && d.getUTCDate() === gun && d.getTime() <= Date.now();
}

type Musteri = { kokKurumId: string; acik: boolean; kurumlar: { id: string; ad: string }[] };

// Uygulamanın müşterisi (marka kodu) ve başvurulabilecek kurumları: ana kurum + altındaki tüm
// birimler. Alt birimin adı üstleriyle birlikte verilir ("İstanbul › Küçükçekmece › İkitelli").
async function musteriyiGetir(servis: SupabaseClient, markaKodu: string): Promise<Musteri | null> {
  const { data: kok } = await servis.from('kurum').select('id, ad, ozellikler').eq('marka_kodu', markaKodu).is('ust_kurum_id', null).maybeSingle();
  if (!kok) return null;
  const { data: dugumler } = await servis.from('kurum').select('id, ad, yol').eq('kok_kurum_id', kok.id);
  const adlar = new Map((dugumler ?? []).map((k) => [k.id as string, k.ad as string]));
  const altBirimler = (dugumler ?? [])
    .filter((k) => k.id !== kok.id)
    .map((k) => ({
      id: k.id as string,
      ad: (k.yol as string[])
        .slice(1)
        .map((id) => adlar.get(id) ?? '')
        .join(' › '),
    }))
    .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
  const ozellikler = kok.ozellikler as Record<string, unknown> | null;
  return {
    kokKurumId: kok.id,
    acik: typeof ozellikler === 'object' && ozellikler !== null && ozellikler.basvuru === true,
    kurumlar: [{ id: kok.id, ad: kok.ad }, ...altBirimler],
  };
}

// Mevcut bir fonksiyonu çağıranın kimliğiyle çağırır; hata gövdesindeki Türkçe mesajı döndürür.
async function fonksiyonCagir(
  supabaseUrl: string,
  anonAnahtar: string,
  yetkiBasligi: string,
  ad: string,
  govde: Record<string, unknown>,
): Promise<{ tamam: true; veri: Record<string, unknown> } | { tamam: false; mesaj: string }> {
  try {
    const cevap = await fetch(`${supabaseUrl}/functions/v1/${ad}`, {
      method: 'POST',
      headers: { Authorization: yetkiBasligi, apikey: anonAnahtar, 'Content-Type': 'application/json' },
      body: JSON.stringify(govde),
    });
    const veri = await cevap.json().catch(() => ({}));
    if (!cevap.ok) return { tamam: false, mesaj: typeof veri?.hata === 'string' ? veri.hata : 'İşlem yapılamadı.' };
    return { tamam: true, veri };
  } catch (e) {
    console.error(`basvuru: ${ad} çağrılamadı`, e);
    return { tamam: false, mesaj: 'İşlem şu an yapılamıyor.' };
  }
}

// Yeni başvuruyu hedef kurumun ve ana kurumun yöneticilerine bildirir (en iyi çaba).
async function yoneticilereBildir(servis: SupabaseClient, kurumId: string, kokKurumId: string, tur: string): Promise<void> {
  const expoErisimTokeni = Deno.env.get('EXPO_ACCESS_TOKEN');
  const { data: yoneticiler, error } = await servis
    .from('kullanici')
    .select('id, kurum_id, expo_push_token')
    .in('kurum_id', [...new Set([kurumId, kokKurumId])])
    .eq('rol', 'kurum_admin')
    .eq('aktif', true);
  if (error || !yoneticiler || yoneticiler.length === 0) return;

  // Kilit ekranında da görünür: başvuranın adı yazılmaz.
  const metinGovdesi = tur === 'ogrenci' ? 'Yeni bir öğrenci ön kayıt başvurusu var.' : 'Yeni bir personel başvurusu var.';
  const tokenliler = yoneticiler.filter((y) => y.expo_push_token);
  if (tokenliler.length > 0 && expoErisimTokeni) {
    try {
      const cevap = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${expoErisimTokeni}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(
          tokenliler.map((y) => ({
            to: y.expo_push_token,
            title: 'Yeni Başvuru',
            body: metinGovdesi,
            data: { tip: 'basvuru' },
          })),
        ),
      });
      if (!cevap.ok) console.error('basvuru: Expo Push API hatası', cevap.status, await cevap.text());
    } catch (e) {
      console.error('basvuru: Expo Push API çağrısı başarısız', e);
    }
  }
  const { error: logHatasi } = await servis
    .from('bildirim_log')
    .insert(
      yoneticiler.map((y) => ({
        kurum_id: y.kurum_id,
        alici_kullanici_id: y.id,
        tip: 'basvuru' as const,
        baslik: 'Yeni Başvuru',
        metin: metinGovdesi,
      })),
    );
  if (logHatasi) console.error('basvuru: bildirim_log yazılamadı', logHatasi);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_BASLIKLARI });
  if (req.method !== 'POST') return hata(405, 'Yalnızca POST desteklenir.');

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonAnahtar = Deno.env.get('SUPABASE_ANON_KEY');
  const servisAnahtar = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonAnahtar || !servisAnahtar) {
    console.error('basvuru: SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY tanımlı değil');
    return hata(500, 'Sunucu yapılandırması eksik.');
  }

  let govde: Record<string, unknown>;
  try {
    govde = await req.json();
  } catch {
    return hata(400, 'İstek gövdesi geçerli JSON olmalı.');
  }
  if (typeof govde !== 'object' || govde === null) return hata(400, 'İstek gövdesi geçersiz.');
  const islem = govde.islem;

  const istemciSecenekleri = { auth: { persistSession: false, autoRefreshToken: false } };
  const servis = createClient(supabaseUrl, servisAnahtar, istemciSecenekleri);

  // -------------------------------------------------------------------------
  // Oturumsuz: durum, gonder
  // -------------------------------------------------------------------------
  if (islem === 'durum' || islem === 'gonder') {
    const markaKodu = typeof govde.marka_kodu === 'string' ? govde.marka_kodu : '';
    if (!MARKA_KODU_RE.test(markaKodu)) return hata(400, 'Geçersiz istek.');
    const musteri = await musteriyiGetir(servis, markaKodu);

    if (islem === 'durum') {
      // Kapalıyken kurum adları da verilmez.
      return yanit(200, musteri?.acik ? { acik: true, kurumlar: musteri.kurumlar } : { acik: false, kurumlar: [] });
    }

    if (!musteri?.acik) return hata(403, 'Bu kurum uygulamadan başvuru kabul etmiyor.');
    if (govde.riza !== true) return hata(400, 'Başvuru için bilgilerinizin kuruma iletilmesini onaylamanız gerekir.');

    const kurumId = typeof govde.kurum_id === 'string' ? govde.kurum_id : '';
    if (!musteri.kurumlar.some((k) => k.id === kurumId)) return hata(400, 'Başvurulacak kurumu seçin.');
    const tur = govde.tur;
    const adSoyad = metin(govde.ad_soyad, 200);
    const notMetni = metin(govde.not_metni, 2000);
    if (adSoyad.length < 1 || adSoyad.length > 120) return hata(400, 'Ad soyad gerekli.');
    if (notMetni.length > 1000) return hata(400, 'Not en fazla 1000 karakter olabilir.');

    let satir: Record<string, unknown>;
    // Aynı kişinin bekleyen başvurusunu bulan süzgeç (kolon -> değer).
    let ayniKisi: Record<string, string>;
    if (tur === 'ogrenci') {
      const dogumTarihi = metin(govde.dogum_tarihi, 10);
      const veliAdSoyad = metin(govde.veli_ad_soyad, 200);
      const veliTelefon = metin(govde.veli_telefon, 30);
      if (!tarihGecerliMi(dogumTarihi)) return hata(400, 'Doğum tarihini gün, ay ve yıl olarak girin.');
      if (veliAdSoyad.length < 1 || veliAdSoyad.length > 120) return hata(400, 'Veli adı soyadı gerekli.');
      if (!TELEFON_RE.test(veliTelefon)) return hata(400, 'Geçerli bir telefon numarası girin.');
      satir = { dogum_tarihi: dogumTarihi, veli_ad_soyad: veliAdSoyad, veli_telefon: veliTelefon };
      ayniKisi = { tur: 'ogrenci', ad_soyad: adSoyad, dogum_tarihi: dogumTarihi };
    } else if (tur === 'personel') {
      const eposta = metin(govde.eposta, 254).toLowerCase();
      if (!EMAIL_RE.test(eposta)) return hata(400, 'Geçerli bir e-posta adresi girin.');
      satir = { eposta };
      ayniKisi = { eposta };
    } else {
      return hata(400, 'Geçersiz başvuru türü.');
    }

    // Hız sınırı: müşteri başına saatlik ve bekleyen başvuru üst sınırı.
    const birSaatOnce = new Date(Date.now() - 3600_000).toISOString();
    const [{ count: sonSaat }, { count: bekleyen }] = await Promise.all([
      servis.from('basvuru').select('id', { count: 'exact', head: true }).eq('kok_kurum_id', musteri.kokKurumId).gte('olusturma_tarihi', birSaatOnce),
      servis.from('basvuru').select('id', { count: 'exact', head: true }).eq('kok_kurum_id', musteri.kokKurumId).eq('durum', 'bekliyor'),
    ]);
    if ((sonSaat ?? 0) >= SAATLIK_SINIR || (bekleyen ?? 0) >= BEKLEYEN_SINIRI) {
      return hata(429, 'Şu an çok fazla başvuru var. Lütfen daha sonra tekrar deneyin ya da kurumla doğrudan iletişime geçin.');
    }

    // Aynı kişinin bekleyen başvurusu varsa yenisi eklenmez; cevap aynıdır (bilgi sızmaz).
    const { data: mevcut } = await servis
      .from('basvuru')
      .select('id')
      .eq('kok_kurum_id', musteri.kokKurumId)
      .eq('durum', 'bekliyor')
      .match(ayniKisi)
      .limit(1);
    if (mevcut && mevcut.length > 0) return yanit(200, { tamam: true });

    const { error: eklemeHatasi } = await servis
      .from('basvuru')
      .insert({ kurum_id: kurumId, tur, ad_soyad: adSoyad, not_metni: notMetni || null, ...satir });
    if (eklemeHatasi) {
      console.error('basvuru: eklenemedi', eklemeHatasi);
      return hata(500, 'Başvuru alınamadı, lütfen tekrar deneyin.');
    }
    await yoneticilereBildir(servis, kurumId, musteri.kokKurumId, tur);
    return yanit(200, { tamam: true });
  }

  if (islem !== 'karar') return hata(400, 'Geçersiz işlem.');

  // -------------------------------------------------------------------------
  // Oturumlu: karar (yalnızca kurum admini)
  // -------------------------------------------------------------------------
  const yetkiBasligi = req.headers.get('Authorization');
  if (!yetkiBasligi) return hata(401, 'Oturum açmanız gerekiyor.');
  const kullaniciClient = createClient(supabaseUrl, anonAnahtar, {
    global: { headers: { Authorization: yetkiBasligi } },
    ...istemciSecenekleri,
  });
  const { data: kimlik, error: kimlikHatasi } = await kullaniciClient.auth.getUser();
  if (kimlikHatasi || !kimlik.user) return hata(401, 'Oturumunuz geçersiz.');

  const { data: cagiran, error: cagiranHatasi } = await kullaniciClient
    .from('kullanici')
    .select('id, rol, kurum_id, aktif')
    .eq('auth_id', kimlik.user.id)
    .maybeSingle();
  if (cagiranHatasi) {
    console.error('basvuru: çağıran okunamadı', cagiranHatasi);
    return hata(500, 'İşlem şu an yapılamıyor.');
  }
  if (!cagiran || !cagiran.aktif || cagiran.rol !== 'kurum_admin') return hata(403, 'Bu işlem için yetkiniz yok.');

  const basvuruId = typeof govde.basvuru_id === 'string' ? govde.basvuru_id : '';
  const karar = govde.karar;
  const kararNotu = metin(govde.karar_notu, 500) || null;
  if (!UUID_RE.test(basvuruId)) return hata(400, 'Geçersiz başvuru.');
  if (karar !== 'onayla' && karar !== 'reddet') return hata(400, 'Geçersiz karar.');

  // Başvuru çağıranın JWT'siyle okunur: RLS'i geçen satır, yönettiği kurumlara gelen başvurudur.
  const { data: basvuru, error: basvuruHatasi } = await kullaniciClient.from('basvuru').select('*').eq('id', basvuruId).maybeSingle();
  if (basvuruHatasi) {
    console.error('basvuru: başvuru okunamadı', basvuruHatasi);
    return hata(500, 'İşlem şu an yapılamıyor.');
  }
  if (!basvuru) return hata(403, 'Bu işlem için yetkiniz yok.');
  if (basvuru.durum !== 'bekliyor') return hata(409, 'Bu başvuru daha önce sonuçlandırılmış.');

  const sonuclandir = async (durum: 'onaylandi' | 'reddedildi') => {
    const { error } = await servis
      .from('basvuru')
      .update({ durum, karar_veren_kullanici_id: cagiran.id, karar_tarihi: new Date().toISOString(), karar_notu: kararNotu })
      .eq('id', basvuru.id)
      .eq('durum', 'bekliyor');
    if (error) console.error('basvuru: karar yazılamadı', error);
    return !error;
  };

  if (karar === 'reddet') {
    if (!(await sonuclandir('reddedildi'))) return hata(500, 'Karar kaydedilemedi.');
    return yanit(200, { tamam: true });
  }

  if (basvuru.tur === 'personel') {
    const sonuc = await fonksiyonCagir(supabaseUrl, anonAnahtar, yetkiBasligi, 'personel-yonet', {
      islem: 'davet_et',
      kurum_id: basvuru.kurum_id,
      ad_soyad: basvuru.ad_soyad,
      eposta: basvuru.eposta,
      rol: 'ogretmen',
      sinif_idleri: [],
    });
    if (!sonuc.tamam) return hata(409, sonuc.mesaj);
    if (!(await sonuclandir('onaylandi'))) return hata(500, 'Hesap açıldı ama başvuru durumu yazılamadı; başvuruyu elle reddedip silin.');
    return yanit(200, { tamam: true, eposta_gonderildi: sonuc.veri.eposta_gonderildi === true });
  }

  // Öğrenci: sınıf başvurulan kurumda olmalı. Çağıranın JWT'siyle okunur (RLS yetkiyi de doğrular).
  const sinifId = typeof govde.sinif_id === 'string' ? govde.sinif_id : '';
  if (!UUID_RE.test(sinifId)) return hata(400, 'Öğrencinin sınıfını seçin.');
  const { data: sinif, error: sinifHatasi } = await kullaniciClient.from('sinif').select('id, kurum_id').eq('id', sinifId).maybeSingle();
  if (sinifHatasi) {
    console.error('basvuru: sınıf okunamadı', sinifHatasi);
    return hata(500, 'İşlem şu an yapılamıyor.');
  }
  if (!sinif || sinif.kurum_id !== basvuru.kurum_id) return hata(400, 'Seçilen sınıf başvurulan kuruma ait değil.');

  // Öğrenci de çağıranın yetkisiyle eklenir (RLS: ogrenci_kurum_admin).
  const { data: ogrenci, error: ogrenciHatasi } = await kullaniciClient
    .from('ogrenci')
    .insert({ kurum_id: basvuru.kurum_id, sinif_id: sinif.id, ad_soyad: basvuru.ad_soyad, dogum_tarihi: basvuru.dogum_tarihi })
    .select('id')
    .single();
  if (ogrenciHatasi || !ogrenci) {
    console.error('basvuru: öğrenci eklenemedi', ogrenciHatasi);
    return hata(500, 'Öğrenci kaydı oluşturulamadı.');
  }

  const hesap = await fonksiyonCagir(supabaseUrl, anonAnahtar, yetkiBasligi, 'veli-hesap-olustur', {
    islem: 'ac',
    ogrenci_idleri: [ogrenci.id],
  });
  const sonuc = hesap.tamam && Array.isArray(hesap.veri.sonuclar) ? (hesap.veri.sonuclar[0] as Record<string, unknown> | undefined) : undefined;
  if (!hesap.tamam || !sonuc || sonuc.durum === 'hata') {
    // Veli hesabı açılamadı: öğrenci kaydı geri alınır, başvuru bekliyor kalır.
    const { error: geriAlmaHatasi } = await servis.from('ogrenci').delete().eq('id', ogrenci.id);
    if (geriAlmaHatasi) console.error('basvuru: öğrenci geri alınamadı, elle silinmeli:', ogrenci.id, geriAlmaHatasi);
    return hata(409, hesap.tamam ? (typeof sonuc?.mesaj === 'string' ? sonuc.mesaj : 'Veli hesabı açılamadı.') : hesap.mesaj);
  }
  if (!(await sonuclandir('onaylandi'))) return hata(500, 'Öğrenci kaydedildi ama başvuru durumu yazılamadı; başvuruyu elle reddedip silin.');
  return yanit(200, { tamam: true, ogrenci_id: ogrenci.id, kullanici_adi: sonuc.kullanici_adi });
});
