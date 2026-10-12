// Yoklama Bildirim Gönder Edge Function: bir sınıfın BUGÜNKÜ yoklaması tamamlanınca (her aktif
// öğrenci işaretlenince) velilere Expo Push API üzerinden push gönderir ve bildirim_log'a yazar.
//
// Neden sunucuda: Expo Push API'ye gönderilen EXPO_ACCESS_TOKEN gizli tutulmalı (istemci
// bundle'ına asla konmamalı) ve service_role anahtarı uygulamaya konamaz.
//
// Gövde: { sinif_id, tarih }. Durumlar istemciden alınmaz, veritabanından okunur.
//   - Sınıfta işaretlenmemiş aktif öğrenci varsa hiçbir şey gönderilmez (tamamlandi: false).
//   - Tamamlandıktan sonraki her çağrıda yalnızca durumu son bildirilenden FARKLI olan öğrencilerin
//     velilerine gönderilir (bugünün bildirim_log satırlarına bakılır). Böylece istemci her
//     kayıttan sonra çağırabilir: ilk tamamlanışta herkes, sonraki düzeltmede yalnızca düzeltilen
//     öğrenci bildirilir.
//   - `tarih` bugün (Europe/Istanbul) değilse gönderilmez: geçmiş gün düzeltmesi bildirilmez.
//
// Yetki: yalnızca `ogretmen`, `kurum_admin`, `super_admin` çağırabilir. İkinci katman RLS'tir:
// öğrenciler ve yoklamalar çağıranın JWT'siyle okunur — erişemediği sınıf boş döner.
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

const BOS_SONUC = { tamamlandi: false, bildirilen_ogrenci_sayisi: 0, push_gonderilen_sayisi: 0 };
// Expo Push API tek istekte en fazla 100 mesaj kabul eder.
const EXPO_PARCA = 100;

function bugunIstanbul(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
}

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

  const sinifId = typeof govde.sinif_id === 'string' ? govde.sinif_id : '';
  const tarih = typeof govde.tarih === 'string' ? govde.tarih : '';
  if (!UUID_RE.test(sinifId)) return hata(400, 'Geçersiz sınıf.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih)) return hata(400, 'Geçersiz tarih.');
  if (tarih !== bugunIstanbul()) return yanit(200, BOS_SONUC);

  // 3. Sınıfın aktif öğrencileri ve bugünkü yoklamaları. RLS'in kendisi ikinci yetki katmanı:
  //    kullaniciClient (anon key + çağıranın JWT'si) ile okunan satır, RLS'i geçen satırdır.
  const { data: ogrenciler, error: ogrenciHatasi } = await kullaniciClient
    .from('ogrenci')
    .select('id, kurum_id, ad_soyad')
    .eq('sinif_id', sinifId)
    .eq('aktif', true);
  if (ogrenciHatasi) {
    console.error('yoklama-bildirim-gonder: öğrenciler okunamadı', ogrenciHatasi);
    return hata(500, 'İşlem şu an yapılamıyor.');
  }
  if (!ogrenciler || ogrenciler.length === 0) return yanit(200, BOS_SONUC);
  const ogrenciIdleri = ogrenciler.map((o) => o.id);

  const { data: yoklamalar, error: yoklamaHatasi } = await kullaniciClient
    .from('yoklama')
    .select('ogrenci_id, durum')
    .eq('tarih', tarih)
    .in('ogrenci_id', ogrenciIdleri);
  if (yoklamaHatasi) {
    console.error('yoklama-bildirim-gonder: yoklamalar okunamadı', yoklamaHatasi);
    return hata(500, 'İşlem şu an yapılamıyor.');
  }
  const durumlar = new Map((yoklamalar ?? []).map((y) => [y.ogrenci_id as string, y.durum as YoklamaDurumu]));
  // Yoklama tamamlanmadı: bildirim yok.
  if (ogrenciIdleri.some((id) => !durumlar.has(id))) return yanit(200, BOS_SONUC);

  // Bundan sonrası service_role ile (RLS'i aşar) — yetki kararı yukarıda verildi.
  const servis = createClient(supabaseUrl, servisAnahtar, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const tamam = (ogrenciSayisi: number, pushSayisi: number) =>
    yanit(200, { tamamlandi: true, bildirilen_ogrenci_sayisi: ogrenciSayisi, push_gonderilen_sayisi: pushSayisi });

  // 4. Bugün bu öğrenciler için en son ne bildirildi? Aynı metin yeniden gönderilmez.
  const { data: eskiLoglar, error: eskiLogHatasi } = await servis
    .from('bildirim_log')
    .select('ogrenci_id, metin, gonderim_tarihi')
    .eq('tip', 'yoklama')
    .in('ogrenci_id', ogrenciIdleri)
    .gte('gonderim_tarihi', `${tarih}T00:00:00+03:00`)
    .order('gonderim_tarihi', { ascending: true });
  if (eskiLogHatasi) {
    console.error('yoklama-bildirim-gonder: bildirim_log okunamadı', eskiLogHatasi);
    return tamam(0, 0);
  }
  const sonBildirilen = new Map<string, string>();
  for (const l of eskiLoglar ?? []) sonBildirilen.set(l.ogrenci_id as string, l.metin as string);

  const metinler = new Map<string, string>();
  for (const o of ogrenciler) {
    const metin = `${o.ad_soyad} için yoklama: ${DURUM_METNI[durumlar.get(o.id)!]}`;
    if (sonBildirilen.get(o.id) !== metin) metinler.set(o.id, metin);
  }
  if (metinler.size === 0) return tamam(0, 0);
  const kurumlar = new Map(ogrenciler.map((o) => [o.id as string, o.kurum_id as string]));

  // 5. Velileri bul
  const { data: veliBaglari, error: veliBaglariHatasi } = await servis
    .from('veli_ogrenci')
    .select('veli_id, ogrenci_id')
    .in('ogrenci_id', [...metinler.keys()]);
  if (veliBaglariHatasi) {
    console.error('yoklama-bildirim-gonder: veli_ogrenci okunamadı', veliBaglariHatasi);
    return tamam(0, 0);
  }
  if (!veliBaglari || veliBaglari.length === 0) return tamam(0, 0);

  const { data: veliler, error: velilerHatasi } = await servis
    .from('kullanici')
    .select('id, expo_push_token')
    .in('id', [...new Set(veliBaglari.map((v) => v.veli_id))]);
  if (velilerHatasi) {
    console.error('yoklama-bildirim-gonder: veliler okunamadı', velilerHatasi);
    return tamam(0, 0);
  }
  const tokenlar = new Map((veliler ?? []).map((v) => [v.id as string, v.expo_push_token as string | null]));
  // Bir (veli, öğrenci) çifti = bir bildirim. Kardeşleri olan veli her çocuğu için ayrı alır.
  const bildirimler = veliBaglari
    .filter((b) => tokenlar.has(b.veli_id))
    .map((b) => ({
      veliId: b.veli_id as string,
      ogrenciId: b.ogrenci_id as string,
      metin: metinler.get(b.ogrenci_id)!,
      token: tokenlar.get(b.veli_id) ?? null,
    }));

  // 6. Push token'ı olanlara gönder
  const mesajlar = bildirimler
    .filter((b) => b.token)
    .map((b) => ({ to: b.token, title: 'Yoklama', body: b.metin, data: { ogrenci_id: b.ogrenciId, tip: 'yoklama' } }));
  if (mesajlar.length > 0 && expoErisimTokeni) {
    for (let i = 0; i < mesajlar.length; i += EXPO_PARCA) {
      try {
        const expoYaniti = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${expoErisimTokeni}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(mesajlar.slice(i, i + EXPO_PARCA)),
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
    }
  } else if (mesajlar.length > 0 && !expoErisimTokeni) {
    console.error('yoklama-bildirim-gonder: EXPO_ACCESS_TOKEN tanımlı değil, push gönderilemedi');
  }

  // 7. Her bildirim için (token olsun olmasın) bildirim_log'a yaz. Sonraki çağrıların "bu durum
  //    zaten bildirildi" kararı bu satırlara dayanır.
  const { error: logHatasi } = await servis.from('bildirim_log').insert(
    bildirimler.map((b) => ({
      kurum_id: kurumlar.get(b.ogrenciId)!,
      alici_kullanici_id: b.veliId,
      tip: 'yoklama' as const,
      baslik: 'Yoklama',
      metin: b.metin,
      ogrenci_id: b.ogrenciId,
    })),
  );
  if (logHatasi) console.error('yoklama-bildirim-gonder: bildirim_log yazılamadı', logHatasi);

  return tamam(new Set(bildirimler.map((b) => b.ogrenciId)).size, mesajlar.length);
});
