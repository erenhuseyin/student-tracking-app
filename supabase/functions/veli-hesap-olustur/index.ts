// Veli Hesap Oluştur Edge Function: öğrencilere veli girişi açar (kullanıcı adı + PIN) ve veli
// PIN'ini sıfırlar.
//
// Neden sunucuda: `ogrenci.kullanici_adi` kolonuna istemciden yazma yetkisi yoktur (bkz. migration
// 20261021120000_kullanici_adi) ve service_role anahtarı uygulamaya konamaz. Veli girişi Supabase
// Auth email+şifre mekanizmasını arkada kullanır: email = `{kullanici_adi}@{marka_kodu}.veli.internal`
// (gerçek posta kutusu değil, yalnızca benzersiz kimlik), password = PIN'den türetilen değer
// (başlangıç PIN'i '1234'; veli ilk girişte değiştirmek zorundadır — pin_degistirilmeli).
// Kullanıcı adı öğrencinin adından üretilir (ahmet.yilmaz, çakışmada ahmet.yilmaz1 …), müşteri
// (kök kurum) başına tekildir ve atandıktan sonra değişmez. TC kimlik numarası tutulmaz.
//
// Gövde:
//   { islem: 'ac', ogrenci_idleri: [...] }   her öğrenci için hesap açar; hesabı olan atlanır.
//                                            İstemci öğrenciyi ekledikten hemen sonra çağırır.
//   { islem: 'pin_sifirla', ogrenci_id }     PIN'i '1234' yapar, giriş kilidini kaldırır.
// Yanıt (ac): { sonuclar: [{ ogrenci_id, kullanici_adi, durum: 'acildi' | 'vardi' | 'cevrildi' | 'hata', mesaj? }] }
//
// Eski veri: TCKN döneminde açılmış hesabın e-postası `{tckn}@…` biçimindedir. Böyle bir hesabı
// olan öğrencide yeni hesap açılmaz; o hesabın e-postası ve şifresi yeni biçime çevrilir
// ('cevrildi'; PIN '1234' olur). İki işlem de bunu yapar.
//
// Yetki: super_admin ve kurum_admin her iki işlemi; ogretmen yalnızca 'ac' işlemini (müşterisinde
// ozellikler.ogretmen_kayit kapalı değilse; hoca sınıfına eklediği öğrencinin veli girişini açar).
// PIN sıfırlama ve eski biçimli hesabın çevrilmesi (PIN'i 1234 yapar) yöneticide kalır. Öğrenciye
// erişim RLS'e bırakılır: öğrenci çağıranın JWT'siyle okunur; okunamıyorsa (yönetmediği kurum ya da
// hocanın sınıfında olmayan öğrenci) işlem yapılmaz.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const CORS_BASLIKLARI = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VELI_EPOSTA_SONEKI = 'veli.internal';
const VARSAYILAN_PIN = '1234';
// Tek çağrıda en fazla (toplu öğrenci eklemenin sınırıyla uyumlu).
const EN_FAZLA_OGRENCI = 200;

// Auth şifresi PIN'in kendisi değil, sunucudaki gizli anahtarla türetilen değerdir: istemci
// üretemez, bu yüzden veli girişi yalnızca `veli-giris` fonksiyonundan (deneme sınırıyla) yapılır.
// `veli-giris`'teki `pinSifresi`'nin kopyasıdır (paylaşılan modül yok); aynı kalmalı.
async function pinSifresi(anahtar: string, eposta: string, pin: string): Promise<string> {
  const kodlayici = new TextEncoder();
  const hmacAnahtari = await crypto.subtle.importKey('raw', kodlayici.encode(anahtar), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const imza = await crypto.subtle.sign('HMAC', hmacAnahtari, kodlayici.encode(`${eposta}:${pin}`));
  return [...new Uint8Array(imza)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function yanit(durum: number, govde: Record<string, unknown>): Response {
  return new Response(JSON.stringify(govde), {
    status: durum,
    headers: { ...CORS_BASLIKLARI, 'Content-Type': 'application/json' },
  });
}

const hata = (durum: number, mesaj: string) => yanit(durum, { hata: mesaj });

type Sonuc = { ogrenci_id: string; kullanici_adi: string | null; durum: 'acildi' | 'vardi' | 'cevrildi' | 'hata'; mesaj?: string };
type Hesap = { kullaniciId: string; authId: string; eposta: string };

// Öğrenciye bağlı veli hesapları (auth e-postalarıyla).
async function veliHesaplari(servis: SupabaseClient, ogrenciId: string): Promise<Hesap[]> {
  const { data: baglar } = await servis.from('veli_ogrenci').select('veli_id').eq('ogrenci_id', ogrenciId);
  const veliIdleri = (baglar ?? []).map((b) => b.veli_id);
  if (veliIdleri.length === 0) return [];
  const { data: veliler } = await servis.from('kullanici').select('id, auth_id').in('id', veliIdleri).eq('rol', 'veli');
  const hesaplar: Hesap[] = [];
  for (const v of veliler ?? []) {
    const { data } = await servis.auth.admin.getUserById(v.auth_id);
    if (data.user?.email) hesaplar.push({ kullaniciId: v.id, authId: v.auth_id, eposta: data.user.email });
  }
  return hesaplar;
}

// Hesabın e-postasını (gerekirse) yeni biçime çevirir, PIN'i başlangıç PIN'i yapar, kilidi kaldırır.
async function pinBaslangicaAl(servis: SupabaseClient, pinAnahtari: string, hesap: Hesap, eposta: string): Promise<boolean> {
  const { error } = await servis.auth.admin.updateUserById(hesap.authId, {
    ...(hesap.eposta === eposta ? {} : { email: eposta, email_confirm: true }),
    password: await pinSifresi(pinAnahtari, eposta, VARSAYILAN_PIN),
  });
  if (error) {
    console.error('veli-hesap-olustur: hesap güncellenemedi', error);
    return false;
  }
  const { error: durumHatasi } = await servis
    .from('kullanici')
    .update({ pin_degistirilmeli: true, giris_deneme_sayisi: 0, giris_kilit_bitis: null })
    .eq('id', hesap.kullaniciId);
  if (durumHatasi) console.error('veli-hesap-olustur: giriş durumu yazılamadı', durumHatasi);
  return true;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_BASLIKLARI });
  if (req.method !== 'POST') return hata(405, 'Yalnızca POST desteklenir.');

  const yetkiBasligi = req.headers.get('Authorization');
  if (!yetkiBasligi) return hata(401, 'Oturum açmanız gerekiyor.');

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonAnahtar = Deno.env.get('SUPABASE_ANON_KEY');
  const servisAnahtar = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const pinAnahtari = Deno.env.get('VELI_PIN_ANAHTARI');
  if (!supabaseUrl || !anonAnahtar || !servisAnahtar || !pinAnahtari) {
    console.error('veli-hesap-olustur: SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY / VELI_PIN_ANAHTARI tanımlı değil');
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
    .select('id, rol, kok_kurum_id')
    .eq('auth_id', kimlik.user.id)
    .maybeSingle();
  if (cagiranHatasi) {
    console.error('veli-hesap-olustur: çağıran okunamadı', cagiranHatasi);
    return hata(500, 'İşlem şu an yapılamıyor.');
  }
  if (!cagiran || !['super_admin', 'kurum_admin', 'ogretmen'].includes(cagiran.rol)) {
    return hata(403, 'Bu işlem için yetkiniz yok.');
  }
  const ogretmen = cagiran.rol === 'ogretmen';

  // 2. Gövdeyi doğrula
  let govde: Record<string, unknown>;
  try {
    govde = await req.json();
  } catch {
    return hata(400, 'İstek gövdesi geçerli JSON olmalı.');
  }
  if (typeof govde !== 'object' || govde === null) return hata(400, 'İstek gövdesi geçersiz.');

  const islem = govde.islem;
  if (islem !== 'ac' && islem !== 'pin_sifirla') return hata(400, 'Geçersiz işlem.');
  if (ogretmen && islem !== 'ac') return hata(403, 'Bu işlem için yetkiniz yok.');
  const idler =
    islem === 'ac' ? (Array.isArray(govde.ogrenci_idleri) ? govde.ogrenci_idleri : []) : [govde.ogrenci_id];
  if (idler.length === 0 || idler.length > EN_FAZLA_OGRENCI || !idler.every((i) => typeof i === 'string' && UUID_RE.test(i))) {
    return hata(400, 'Geçersiz öğrenci.');
  }
  const ogrenciIdleri = [...new Set(idler as string[])];

  // 3. Çağıranın bu öğrencilere erişimi var mı? RLS'in kendisi yetki katmanı: kullaniciClient
  //    (anon key + çağıranın JWT'si) ile okunan satır, RLS'i geçen satırdır. Kurum admini için
  //    bu, yönettiği kurumların (kendi düğümü + altı) öğrencileridir.
  const { data: ogrenciler, error: ogrenciHatasi } = await kullaniciClient
    .from('ogrenci')
    .select('id, kurum_id, kok_kurum_id, ad_soyad, kullanici_adi')
    .in('id', ogrenciIdleri);
  if (ogrenciHatasi) {
    console.error('veli-hesap-olustur: öğrenciler okunamadı', ogrenciHatasi);
    return hata(500, 'İşlem şu an yapılamıyor.');
  }
  const okunanlar = new Map((ogrenciler ?? []).map((o) => [o.id as string, o]));
  if (islem === 'pin_sifirla' && okunanlar.size === 0) return hata(403, 'Bu işlem için yetkiniz yok.');

  // Bundan sonrası service_role ile (RLS'i aşar) — yetki kararı yukarıda verildi.
  const servis = createClient(supabaseUrl, servisAnahtar, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Hoca için müşteri bayrağı (yazılmamışsa açık; bkz. migration 20261025120000_ogretmen_kayit).
  if (ogretmen) {
    const { data: kok } = await servis.from('kurum').select('ozellikler').eq('id', cagiran.kok_kurum_id).maybeSingle();
    const ozellikler = kok?.ozellikler as Record<string, unknown> | null | undefined;
    if (!kok || ozellikler?.ogretmen_kayit === false) return hata(403, 'Bu işlem için yetkiniz yok.');
  }

  const markaKodlari = new Map<string, string | null>();
  const markaKodu = async (kokKurumId: string): Promise<string | null> => {
    if (!markaKodlari.has(kokKurumId)) {
      const { data } = await servis.from('kurum').select('marka_kodu').eq('id', kokKurumId).maybeSingle();
      markaKodlari.set(kokKurumId, data?.marka_kodu ?? null);
    }
    return markaKodlari.get(kokKurumId) ?? null;
  };

  // ---- PIN sıfırlama ----
  if (islem === 'pin_sifirla') {
    const ogrenci = okunanlar.get(ogrenciIdleri[0])!;
    const marka = await markaKodu(ogrenci.kok_kurum_id);
    if (!ogrenci.kullanici_adi || !marka) return hata(404, 'Bu öğrenci için veli girişi açılmamış.');
    const eposta = `${ogrenci.kullanici_adi}@${marka}.${VELI_EPOSTA_SONEKI}`;
    const hesaplar = await veliHesaplari(servis, ogrenci.id);
    const hesap = hesaplar.find((h) => h.eposta === eposta) ?? hesaplar.find((h) => eskiBicimMi(h.eposta, marka));
    if (!hesap) return hata(404, 'Bu öğrenci için veli hesabı bulunamadı.');
    if (!(await pinBaslangicaAl(servis, pinAnahtari, hesap, eposta))) return hata(500, 'PIN sıfırlanamadı.');
    return yanit(200, { kullanici_adi: ogrenci.kullanici_adi });
  }

  // ---- Hesap açma ----
  const sonuclar: Sonuc[] = [];
  for (const id of ogrenciIdleri) {
    const ogrenci = okunanlar.get(id);
    if (!ogrenci) {
      sonuclar.push({ ogrenci_id: id, kullanici_adi: null, durum: 'hata', mesaj: 'Bu öğrenci için yetkiniz yok.' });
      continue;
    }
    sonuclar.push(await hesapAc(servis, pinAnahtari, ogrenci, await markaKodu(ogrenci.kok_kurum_id), !ogretmen));
  }
  return yanit(200, { sonuclar });
});

// TCKN döneminden kalan hesap: e-postanın yerel kısmı 11 hanedir.
function eskiBicimMi(eposta: string, marka: string): boolean {
  return new RegExp(`^[0-9]{11}@${marka.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.${VELI_EPOSTA_SONEKI.replace('.', '\\.')}$`).test(eposta);
}

async function hesapAc(
  servis: SupabaseClient,
  pinAnahtari: string,
  ogrenci: { id: string; kurum_id: string; ad_soyad: string },
  marka: string | null,
  // Eski biçimli hesabı çevirmek PIN'i sıfırlar; yalnızca yönetici yapabilir.
  eskiyiCevirebilir: boolean,
): Promise<Sonuc> {
  const basarisiz = (mesaj: string, kullaniciAdi: string | null = null): Sonuc => ({
    ogrenci_id: ogrenci.id,
    kullanici_adi: kullaniciAdi,
    durum: 'hata',
    mesaj,
  });
  if (!marka) return basarisiz('Bu kurum için marka kodu tanımlanmamış; önce süper admin tanımlamalı.');

  // Kullanıcı adı (atanmışsa mevcut ad döner; ad sonradan değişmez).
  const { data: kullaniciAdi, error: adHatasi } = await servis.rpc('ogrenci_kullanici_adi_ata', { p_ogrenci_id: ogrenci.id });
  if (adHatasi || typeof kullaniciAdi !== 'string') {
    console.error('veli-hesap-olustur: kullanıcı adı atanamadı', adHatasi);
    return basarisiz('Kullanıcı adı üretilemedi.');
  }
  const eposta = `${kullaniciAdi}@${marka}.${VELI_EPOSTA_SONEKI}`;

  const hesaplar = await veliHesaplari(servis, ogrenci.id);
  if (hesaplar.some((h) => h.eposta === eposta)) {
    return { ogrenci_id: ogrenci.id, kullanici_adi: kullaniciAdi, durum: 'vardi' };
  }
  const eski = hesaplar.find((h) => eskiBicimMi(h.eposta, marka));
  if (eski) {
    if (!eskiyiCevirebilir) return basarisiz('Bu öğrencinin eski bir veli hesabı var; yöneticiniz öğrenci ekranından PIN\'i sıfırlamalı.');
    return (await pinBaslangicaAl(servis, pinAnahtari, eski, eposta))
      ? { ogrenci_id: ogrenci.id, kullanici_adi: kullaniciAdi, durum: 'cevrildi' }
      : basarisiz('Mevcut veli hesabı yeni kullanıcı adına çevrilemedi.', kullaniciAdi);
  }

  // Hesap oluştur, ardından kullanici + veli_ogrenci. Herhangi bir adım düşerse auth kullanıcısı
  // silinir (FK cascade kullanici ve bağlarını da siler). Kullanıcı adı öğrencide kalır: yeniden
  // denendiğinde aynı adla açılır.
  const { data: yeniAuth, error: authHatasi } = await servis.auth.admin.createUser({
    email: eposta,
    password: await pinSifresi(pinAnahtari, eposta, VARSAYILAN_PIN),
    email_confirm: true,
  });
  if (authHatasi || !yeniAuth.user) {
    console.error('veli-hesap-olustur: hesap oluşturulamadı', authHatasi);
    return basarisiz('Veli hesabı oluşturulamadı.', kullaniciAdi);
  }
  const authId = yeniAuth.user.id;
  const geriAl = async () => {
    const { error } = await servis.auth.admin.deleteUser(authId);
    if (error) console.error('veli-hesap-olustur: geri alma başarısız, elle silinmeli:', authId, error);
  };

  const { data: yeniKullanici, error: kullaniciHatasi } = await servis
    .from('kullanici')
    .insert({
      auth_id: authId,
      rol: 'veli',
      kurum_id: ogrenci.kurum_id,
      ad_soyad: `${ogrenci.ad_soyad} Velisi`,
      pin_degistirilmeli: true,
    })
    .select('id')
    .single();
  if (kullaniciHatasi || !yeniKullanici) {
    console.error('veli-hesap-olustur: kullanici eklenemedi', kullaniciHatasi);
    await geriAl();
    return basarisiz('Veli hesabı oluşturulamadı.', kullaniciAdi);
  }

  const { error: veliOgrenciHatasi } = await servis
    .from('veli_ogrenci')
    .insert({ kurum_id: ogrenci.kurum_id, veli_id: yeniKullanici.id, ogrenci_id: ogrenci.id });
  if (veliOgrenciHatasi) {
    console.error('veli-hesap-olustur: veli_ogrenci eklenemedi', veliOgrenciHatasi);
    await geriAl();
    return basarisiz('Veli-öğrenci bağı kurulamadı; işlem geri alındı.', kullaniciAdi);
  }

  return { ogrenci_id: ogrenci.id, kullanici_adi: kullaniciAdi, durum: 'acildi' };
}
