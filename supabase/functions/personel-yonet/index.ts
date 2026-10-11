// Personel Yönet Edge Function: öğretmen ve kurum yöneticisi hesaplarını açar, giriş kodu
// gönderir, kodla şifre belirletir, pasifleştirir/aktifleştirir. Veli hesapları kapsam dışıdır
// (onlar `tckn-hesap-olustur` ile açılır).
//
// Neden sunucuda: `kullanici` tablosuna istemciden insert yetkisi yoktur, auth kullanıcısı
// oluşturmak/şifre yazmak service_role ister ve e-posta servisinin anahtarı uygulamaya konamaz.
// Rol ve kurum kararını burada, çağıranın doğrulanmış kimliğine göre biz veririz.
//
// Neden tek fonksiyon: fonksiyonlar Dashboard'a tek dosya olarak yapıştırılıyor ve Deno ile
// paylaşılan modül yok; kod üretme + e-posta gönderme üç işlemde ortak olduğu için tek yerde durur.
//
// İşlemler (gövdede `islem`):
//   davet_et              (oturumlu)  yeni personel hesabı + giriş kodu e-postası
//   kod_gonder            (oturumlu: yönetici, `kullanici_id` ile | oturumsuz: `eposta` ile, "şifremi unuttum")
//   kod_ile_sifre_belirle (oturumsuz) e-posta + kod + yeni şifre
//   pasiflestir / aktiflestir (oturumlu)
//   eposta_degistir       (oturumlu)  yanlış yazılmış adresi düzeltir + yeni kod; yalnızca şifresini henüz belirlememiş hesapta
//   davet_iptal           (oturumlu)  şifresini henüz belirlememiş hesabı tümüyle siler
//
// Yetki matrisi (oturumlu işlemler):
//   super_admin -> yalnızca `kurum_admin` davet eder (herhangi bir kurum); tüm personeli yönetir
//   kurum_admin -> `ogretmen` ve `kurum_admin` davet eder; hedef kendi kurumu ya da bir şubesi.
//                  Yönettiği kurumların personelini yönetir (RLS'e tabi okumayla doğrulanır)
//   ogretmen, veli -> 403
//
// Kod: Supabase Auth'un "recovery" tek kullanımlık kodu (`generateLink` e-posta göndermez, kodu
// döndürür). Davet, yeniden gönderme ve şifre unutma aynı yolu kullanır; geçerlilik süresi
// Dashboard > Authentication > Email OTP Expiration ayarıdır.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const CORS_BASLIKLARI = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PERSONEL_ROLLERI = ['kurum_admin', 'ogretmen'] as const;
type PersonelRolu = (typeof PERSONEL_ROLLERI)[number];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KOD_RE = /^[0-9]{6,8}$/;
const EN_FAZLA_SINIF = 50;
const EN_AZ_SIFRE_UZUNLUGU = 8;
const EN_FAZLA_KOD_DENEMESI = 5;
// Kişi başına iki kod e-postası arasındaki en kısa süre. Oturumsuz istek herkese açık olduğu
// için daha uzun: e-posta kotasının (EmailJS ücretsiz: ayda 200) kötüye kullanımını sınırlar.
const BEKLEME_YONETICI_SN = 60;
const BEKLEME_OTURUMSUZ_SN = 600;
// Pasif hesap için auth tarafında "süresiz" ban (yaklaşık 100 yıl).
const SURESIZ_BAN = '876000h';

const KULLANICI_KOLONLARI =
  'id, auth_id, rol, kurum_id, ad_soyad, eposta, aktif, sifre_belirlendi, son_kod_gonderim, kod_deneme_sayisi';

type KullaniciSatiri = {
  id: string;
  auth_id: string;
  rol: string;
  kurum_id: string | null;
  ad_soyad: string;
  eposta: string | null;
  aktif: boolean;
  sifre_belirlendi: boolean;
  son_kod_gonderim: string | null;
  kod_deneme_sayisi: number;
};

type Cagiran = { id: string; rol: string; kurum_id: string | null };

function yanit(durum: number, govde: Record<string, unknown>): Response {
  return new Response(JSON.stringify(govde), {
    status: durum,
    headers: { ...CORS_BASLIKLARI, 'Content-Type': 'application/json' },
  });
}

const hata = (durum: number, mesaj: string) => yanit(durum, { hata: mesaj });

function uuidDizisi(deger: unknown): string[] | null {
  if (deger === undefined || deger === null) return [];
  if (!Array.isArray(deger) || deger.length > EN_FAZLA_SINIF) return null;
  if (!deger.every((x) => typeof x === 'string' && UUID_RE.test(x))) return null;
  return [...new Set(deger as string[])];
}

function epostayiOku(deger: unknown): string | null {
  const eposta = typeof deger === 'string' ? deger.trim().toLowerCase() : '';
  return EMAIL_RE.test(eposta) && eposta.length <= 254 ? eposta : null;
}

// E-posta gönderimi tek yerde: sağlayıcı değişirse (ör. alan adı alınıp Resend'e geçilirse)
// yalnızca bu fonksiyon değişir. EmailJS'te sunucudan çağrı için Account > Security altında
// "Allow EmailJS API for non-browser applications" açık olmalıdır.
async function epostaGonder(alici: string, degiskenler: Record<string, string>): Promise<boolean> {
  const servisId = Deno.env.get('EMAILJS_SERVICE_ID');
  const sablonId = Deno.env.get('EMAILJS_TEMPLATE_ID');
  const genelAnahtar = Deno.env.get('EMAILJS_PUBLIC_KEY');
  const ozelAnahtar = Deno.env.get('EMAILJS_PRIVATE_KEY');
  if (!servisId || !sablonId || !genelAnahtar || !ozelAnahtar) {
    console.error('personel-yonet: EMAILJS_* değişkenleri tanımlı değil, e-posta gönderilemedi');
    return false;
  }
  try {
    const cevap = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: servisId,
        template_id: sablonId,
        user_id: genelAnahtar,
        accessToken: ozelAnahtar,
        template_params: { alici_eposta: alici, ...degiskenler },
      }),
    });
    if (!cevap.ok) {
      console.error('personel-yonet: e-posta servisi reddetti', cevap.status, await cevap.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error('personel-yonet: e-posta servisine ulaşılamadı', e);
    return false;
  }
}

// E-postada görünen kurum adı: müşterinin (kök kurumun) adı.
async function kurumAdiniGetir(servis: SupabaseClient, kurumId: string | null): Promise<string> {
  if (!kurumId) return 'Yönetim';
  const { data: kurum } = await servis.from('kurum').select('ad, kok_kurum_id').eq('id', kurumId).maybeSingle();
  if (!kurum) return '';
  if (kurum.kok_kurum_id === kurumId) return kurum.ad;
  const { data: kok } = await servis.from('kurum').select('ad').eq('id', kurum.kok_kurum_id).maybeSingle();
  return kok?.ad ?? kurum.ad;
}

// Yeni kod üretir (öncekini geçersiz kılar), deneme sayacını sıfırlar ve e-postalar.
async function kodUretVeGonder(servis: SupabaseClient, hedef: KullaniciSatiri, davetMi: boolean): Promise<boolean> {
  if (!hedef.eposta) return false;
  const { data, error } = await servis.auth.admin.generateLink({ type: 'recovery', email: hedef.eposta });
  const kod = data?.properties?.email_otp;
  if (error || !kod) {
    console.error('personel-yonet: kod üretilemedi', error);
    return false;
  }
  const { error: guncellemeHatasi } = await servis
    .from('kullanici')
    .update({ son_kod_gonderim: new Date().toISOString(), kod_deneme_sayisi: 0 })
    .eq('id', hedef.id);
  if (guncellemeHatasi) console.error('personel-yonet: kod zamanı yazılamadı', guncellemeHatasi);

  return await epostaGonder(hedef.eposta, {
    ad_soyad: hedef.ad_soyad,
    kurum_adi: await kurumAdiniGetir(servis, hedef.kurum_id),
    kod,
    konu: davetMi ? 'Hesabınız oluşturuldu' : 'Giriş kodunuz',
  });
}

function beklemeDolduMu(hedef: KullaniciSatiri, saniye: number): boolean {
  if (!hedef.son_kod_gonderim) return true;
  return Date.now() - new Date(hedef.son_kod_gonderim).getTime() >= saniye * 1000;
}

// Çağıranın yönetebildiği bir personeli getirir. RLS'in kendisi yetki katmanı: kullanıcı
// bağlamlı client ile okunan satır, çağıranın yönettiği kurumlardaki (kurum admini) ya da tüm
// (süper admin) kullanıcılardır. Veli ve süper admin satırları personel sayılmaz.
async function yonetilenPersoneliGetir(
  kullaniciClient: SupabaseClient,
  cagiran: Cagiran,
  govde: Record<string, unknown>,
): Promise<KullaniciSatiri | Response> {
  if (cagiran.rol !== 'super_admin' && cagiran.rol !== 'kurum_admin') return hata(403, 'Bu işlem için yetkiniz yok.');
  const hedefId = typeof govde.kullanici_id === 'string' ? govde.kullanici_id : '';
  if (!UUID_RE.test(hedefId)) return hata(400, 'Geçersiz kullanıcı.');

  const { data, error } = await kullaniciClient.from('kullanici').select(KULLANICI_KOLONLARI).eq('id', hedefId).maybeSingle();
  if (error) {
    console.error('personel-yonet: hedef kullanıcı okunamadı', error);
    return hata(500, 'İşlem şu an yapılamıyor.');
  }
  const hedef = data as KullaniciSatiri | null;
  if (!hedef || !PERSONEL_ROLLERI.includes(hedef.rol as PersonelRolu)) return hata(403, 'Bu işlem için yetkiniz yok.');
  return hedef;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_BASLIKLARI });
  if (req.method !== 'POST') return hata(405, 'Yalnızca POST desteklenir.');

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonAnahtar = Deno.env.get('SUPABASE_ANON_KEY');
  const servisAnahtar = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonAnahtar || !servisAnahtar) {
    console.error('personel-yonet: SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY tanımlı değil');
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
  // Oturumsuz işlemler
  // -------------------------------------------------------------------------
  if (islem === 'kod_ile_sifre_belirle') {
    const eposta = epostayiOku(govde.eposta);
    const kod = typeof govde.kod === 'string' ? govde.kod.trim() : '';
    const sifre = typeof govde.sifre === 'string' ? govde.sifre : '';
    if (!eposta) return hata(400, 'Geçerli bir e-posta adresi girin.');
    if (!KOD_RE.test(kod)) return hata(400, 'Kodu e-postadaki gibi girin.');
    if (sifre.length < EN_AZ_SIFRE_UZUNLUGU || sifre.length > 72) {
      return hata(400, `Şifre en az ${EN_AZ_SIFRE_UZUNLUGU} karakter olmalı.`);
    }

    const kodHatasi = hata(400, 'Kod hatalı ya da süresi dolmuş. Yeni kod isteyin.');
    const { data: satir } = await servis.from('kullanici').select(KULLANICI_KOLONLARI).eq('eposta', eposta).maybeSingle();
    const hedef = satir as KullaniciSatiri | null;
    // Hesap yok/pasif ve yanlış kod aynı cevabı alır (e-postanın kayıtlı olup olmadığı sızmaz).
    if (!hedef || !hedef.aktif || !PERSONEL_ROLLERI.includes(hedef.rol as PersonelRolu)) return kodHatasi;
    if (hedef.kod_deneme_sayisi >= EN_FAZLA_KOD_DENEMESI) {
      return hata(429, 'Çok fazla yanlış deneme yapıldı. Yeni kod isteyin.');
    }

    const dogrulayici = createClient(supabaseUrl, anonAnahtar, istemciSecenekleri);
    const { data: dogrulama, error: dogrulamaHatasi } = await dogrulayici.auth.verifyOtp({ email: eposta, token: kod, type: 'recovery' });
    if (dogrulamaHatasi || !dogrulama.user || dogrulama.user.id !== hedef.auth_id) {
      await servis.from('kullanici').update({ kod_deneme_sayisi: hedef.kod_deneme_sayisi + 1 }).eq('id', hedef.id);
      return kodHatasi;
    }

    const { error: sifreHatasi } = await servis.auth.admin.updateUserById(hedef.auth_id, { password: sifre });
    if (sifreHatasi) {
      console.error('personel-yonet: şifre yazılamadı', sifreHatasi);
      // Kod tüketildi; kullanıcı yeni kod istemeli.
      return hata(sifreHatasi.status === 422 ? 400 : 500, 'Şifre kabul edilmedi. Daha güçlü bir şifreyle yeni kod isteyip tekrar deneyin.');
    }
    const { error: bayrakHatasi } = await servis
      .from('kullanici')
      .update({ sifre_belirlendi: true, kod_deneme_sayisi: 0 })
      .eq('id', hedef.id);
    if (bayrakHatasi) console.error('personel-yonet: sifre_belirlendi yazılamadı', bayrakHatasi);
    return yanit(200, { tamam: true });
  }

  if (islem === 'kod_gonder' && govde.kullanici_id === undefined) {
    const eposta = epostayiOku(govde.eposta);
    if (!eposta) return hata(400, 'Geçerli bir e-posta adresi girin.');
    const { data: satir } = await servis.from('kullanici').select(KULLANICI_KOLONLARI).eq('eposta', eposta).maybeSingle();
    const hedef = satir as KullaniciSatiri | null;
    // Her durumda aynı cevap: e-postanın kayıtlı olup olmadığı sızmaz.
    if (hedef && hedef.aktif && PERSONEL_ROLLERI.includes(hedef.rol as PersonelRolu) && beklemeDolduMu(hedef, BEKLEME_OTURUMSUZ_SN)) {
      await kodUretVeGonder(servis, hedef, false);
    }
    return yanit(200, { tamam: true });
  }

  // -------------------------------------------------------------------------
  // Oturumlu işlemler: çağıranı doğrula (kullanıcı bağlamlı client, RLS'e tabi)
  // -------------------------------------------------------------------------
  const yetkiBasligi = req.headers.get('Authorization');
  if (!yetkiBasligi) return hata(401, 'Oturum açmanız gerekiyor.');
  const kullaniciClient = createClient(supabaseUrl, anonAnahtar, {
    global: { headers: { Authorization: yetkiBasligi } },
    ...istemciSecenekleri,
  });
  const { data: kimlik, error: kimlikHatasi } = await kullaniciClient.auth.getUser();
  if (kimlikHatasi || !kimlik.user) return hata(401, 'Oturumunuz geçersiz.');

  const { data: cagiranSatiri, error: cagiranHatasi } = await kullaniciClient
    .from('kullanici')
    .select('id, rol, kurum_id, aktif')
    .eq('auth_id', kimlik.user.id)
    .maybeSingle();
  if (cagiranHatasi) {
    console.error('personel-yonet: çağıran okunamadı', cagiranHatasi);
    return hata(500, 'İşlem şu an yapılamıyor.');
  }
  if (!cagiranSatiri || !cagiranSatiri.aktif) return hata(403, 'Bu işlem için yetkiniz yok.');
  const cagiran: Cagiran = cagiranSatiri;

  if (islem === 'kod_gonder') {
    const hedef = await yonetilenPersoneliGetir(kullaniciClient, cagiran, govde);
    if (hedef instanceof Response) return hedef;
    if (!hedef.aktif) return hata(409, 'Bu hesap pasif; önce aktifleştirin.');
    if (!hedef.eposta) return hata(409, 'Bu hesabın e-posta adresi kayıtlı değil.');
    if (!beklemeDolduMu(hedef, BEKLEME_YONETICI_SN)) return hata(429, 'Az önce kod gönderildi. Lütfen bir dakika sonra tekrar deneyin.');
    const gonderildi = await kodUretVeGonder(servis, hedef, false);
    if (!gonderildi) return hata(502, 'Kod e-postası gönderilemedi. Lütfen daha sonra tekrar deneyin.');
    return yanit(200, { tamam: true });
  }

  if (islem === 'pasiflestir' || islem === 'aktiflestir') {
    const hedef = await yonetilenPersoneliGetir(kullaniciClient, cagiran, govde);
    if (hedef instanceof Response) return hedef;
    if (hedef.id === cagiran.id) return hata(400, 'Kendi hesabınızı pasifleştiremezsiniz.');
    const aktif = islem === 'aktiflestir';

    const { error: banHatasi } = await servis.auth.admin.updateUserById(hedef.auth_id, {
      ban_duration: aktif ? 'none' : SURESIZ_BAN,
    });
    if (banHatasi) {
      console.error('personel-yonet: giriş engeli değiştirilemedi', banHatasi);
      return hata(500, 'İşlem yapılamadı.');
    }
    const { error: aktifHatasi } = await servis.from('kullanici').update({ aktif }).eq('id', hedef.id);
    if (aktifHatasi) {
      console.error('personel-yonet: aktif yazılamadı', aktifHatasi);
      return hata(500, 'İşlem yapılamadı.');
    }
    if (!aktif) {
      // Pasif öğretmen sınıf listelerinde görünmesin; yeniden aktifleşince atamalar elle yapılır.
      const { error } = await servis.from('ogretmen_sinif').delete().eq('ogretmen_id', hedef.id);
      if (error) console.error('personel-yonet: sınıf atamaları kaldırılamadı', error);
    }
    return yanit(200, { tamam: true });
  }

  // Her ikisi de yalnızca daveti kabul etmemiş (şifresini belirlememiş) hesapta: kişi henüz hiç
  // giriş yapmadığı için kayıt girmiş olamaz ve adres değişikliği başkasının hesabını ele geçirmez.
  if (islem === 'eposta_degistir') {
    const hedef = await yonetilenPersoneliGetir(kullaniciClient, cagiran, govde);
    if (hedef instanceof Response) return hedef;
    const yeniEposta = epostayiOku(govde.eposta);
    if (!yeniEposta) return hata(400, 'Geçerli bir e-posta adresi girin.');
    if (hedef.sifre_belirlendi) return hata(409, 'Bu kişi hesabını kullanmaya başlamış; e-posta adresi değiştirilemez.');
    if (!hedef.aktif) return hata(409, 'Bu hesap pasif; önce aktifleştirin.');
    if (yeniEposta === hedef.eposta) return hata(400, 'Yeni adres mevcut adresle aynı.');
    // Auth, kayıtlı bir adrese güncellemeyi anlaşılır bir kodla değil genel bir 500 ile reddediyor
    // (yerelde denendi); bu yüzden çakışma önce burada aranır. Personel e-postaları `kullanici.eposta`'dadır.
    const { data: ayniAdres, error: ayniAdresHatasi } = await servis.from('kullanici').select('id').eq('eposta', yeniEposta).limit(1);
    if (ayniAdresHatasi) {
      console.error('personel-yonet: e-posta çakışması aranamadı', ayniAdresHatasi);
      return hata(500, 'İşlem şu an yapılamıyor.');
    }
    if (ayniAdres && ayniAdres.length > 0) return hata(409, 'Bu e-posta adresi zaten kayıtlı.');

    const { error: authHatasi } = await servis.auth.admin.updateUserById(hedef.auth_id, { email: yeniEposta, email_confirm: true });
    if (authHatasi) {
      if (authHatasi.code === 'email_exists' || /already.*registered/i.test(authHatasi.message)) {
        return hata(409, 'Bu e-posta adresi zaten kayıtlı.');
      }
      console.error('personel-yonet: e-posta değiştirilemedi', authHatasi);
      return hata(500, 'E-posta değiştirilemedi.');
    }
    const { error: satirHatasi } = await servis.from('kullanici').update({ eposta: yeniEposta }).eq('id', hedef.id);
    if (satirHatasi) {
      console.error('personel-yonet: kullanici.eposta yazılamadı, auth geri alınıyor', satirHatasi);
      if (hedef.eposta) await servis.auth.admin.updateUserById(hedef.auth_id, { email: hedef.eposta, email_confirm: true });
      return hata(500, 'E-posta değiştirilemedi.');
    }
    const gonderildi = await kodUretVeGonder(servis, { ...hedef, eposta: yeniEposta }, true);
    return yanit(200, { tamam: true, eposta_gonderildi: gonderildi });
  }

  if (islem === 'davet_iptal') {
    const hedef = await yonetilenPersoneliGetir(kullaniciClient, cagiran, govde);
    if (hedef instanceof Response) return hedef;
    if (hedef.id === cagiran.id) return hata(400, 'Kendi hesabınızı silemezsiniz.');
    if (hedef.sifre_belirlendi) return hata(409, 'Bu kişi hesabını kullanmaya başlamış; silmek yerine pasifleştirin.');
    // FK cascade `kullanici` satırını ve sınıf atamalarını da siler.
    const { error } = await servis.auth.admin.deleteUser(hedef.auth_id);
    if (error) {
      console.error('personel-yonet: davet iptal edilemedi', error);
      return hata(500, 'Davet iptal edilemedi.');
    }
    return yanit(200, { tamam: true });
  }

  if (islem !== 'davet_et') return hata(400, 'Geçersiz işlem.');

  // -------------------------------------------------------------------------
  // davet_et
  // -------------------------------------------------------------------------
  const eposta = epostayiOku(govde.eposta);
  const adSoyad = typeof govde.ad_soyad === 'string' ? govde.ad_soyad.trim() : '';
  const rol = govde.rol as PersonelRolu;
  const sinifIdleri = uuidDizisi(govde.sinif_idleri);

  if (!eposta) return hata(400, 'Geçerli bir e-posta adresi girin.');
  if (adSoyad.length < 1 || adSoyad.length > 120) return hata(400, 'Ad soyad 1-120 karakter olmalı.');
  if (!PERSONEL_ROLLERI.includes(rol)) return hata(400, 'Geçersiz rol.');
  if (sinifIdleri === null) return hata(400, `Sınıf listesi geçerli olmalı (en fazla ${EN_FAZLA_SINIF}).`);
  if (rol !== 'ogretmen' && sinifIdleri.length > 0) return hata(400, 'Sınıf ataması yalnızca öğretmen için geçerli.');

  // Hedef kurumu SUNUCU belirler.
  let hedefKurumId: string;
  if (cagiran.rol === 'super_admin') {
    if (rol !== 'kurum_admin') return hata(403, 'Süper admin yalnızca kurum yöneticisi davet edebilir.');
    if (typeof govde.kurum_id !== 'string' || !UUID_RE.test(govde.kurum_id)) {
      return hata(400, 'kurum_id zorunlu ve geçerli olmalı.');
    }
    hedefKurumId = govde.kurum_id;
  } else if (cagiran.rol === 'kurum_admin') {
    if (!cagiran.kurum_id) return hata(403, 'Bu işlem için yetkiniz yok.');
    hedefKurumId = cagiran.kurum_id;
    if (govde.kurum_id !== undefined && govde.kurum_id !== cagiran.kurum_id) {
      if (typeof govde.kurum_id !== 'string' || !UUID_RE.test(govde.kurum_id)) return hata(400, 'kurum_id geçerli olmalı.');
      // Yalnızca çağıranın altındaki bir düğüm olabilir. RLS okumaya güvenilmez: yönetici kendi
      // üst düğümlerini de okuyabildiği için üst-alt ilişkisi burada açıkça kontrol edilir.
      const { data: hedefKurum, error: hedefKurumHatasi } = await kullaniciClient
        .from('kurum')
        .select('id, yol')
        .eq('id', govde.kurum_id)
        .maybeSingle();
      if (hedefKurumHatasi) {
        console.error('personel-yonet: hedef kurum okunamadı', hedefKurumHatasi);
        return hata(500, 'İşlem şu an yapılamıyor.');
      }
      if (!hedefKurum || !(hedefKurum.yol as string[]).includes(cagiran.kurum_id)) return hata(403, 'Bu kuruma personel ekleme yetkiniz yok.');
      hedefKurumId = hedefKurum.id;
    }
  } else {
    return hata(403, 'Bu işlem için yetkiniz yok.');
  }

  // Bundan sonrası service_role ile (RLS'i aşar) — yetki kararı yukarıda verildi.
  const { data: kurum, error: kurumHatasi } = await servis.from('kurum').select('id').eq('id', hedefKurumId).maybeSingle();
  if (kurumHatasi) {
    console.error('personel-yonet: kurum okunamadı', kurumHatasi);
    return hata(500, 'İşlem şu an yapılamıyor.');
  }
  if (!kurum) return hata(400, 'Kurum bulunamadı.');

  // Bileşik FK kurumlar arası bağı zaten engeller; bu kontrol net hata mesajı içindir.
  if (sinifIdleri.length > 0) {
    const { data, error } = await servis.from('sinif').select('id').eq('kurum_id', hedefKurumId).in('id', sinifIdleri);
    if (error) {
      console.error('personel-yonet: sınıflar okunamadı', error);
      return hata(500, 'İşlem şu an yapılamıyor.');
    }
    if ((data?.length ?? 0) !== sinifIdleri.length) return hata(400, 'Sınıflardan biri bu kuruma ait değil.');
  }

  // Hesap şifresiz açılır (parola ile girilemez); personel şifresini kodla kendisi belirler.
  // Herhangi bir adım düşerse auth kullanıcısı silinir (FK cascade kullanici ve bağlarını da siler).
  const { data: yeniAuth, error: authHatasi } = await servis.auth.admin.createUser({ email: eposta, email_confirm: true });
  if (authHatasi || !yeniAuth.user) {
    if (authHatasi && (authHatasi.code === 'email_exists' || /already.*registered/i.test(authHatasi.message))) {
      return hata(409, 'Bu e-posta adresi zaten kayıtlı.');
    }
    console.error('personel-yonet: hesap oluşturulamadı', authHatasi);
    return hata(500, 'Hesap oluşturulamadı.');
  }
  const authId = yeniAuth.user.id;

  const geriAl = async () => {
    const { error } = await servis.auth.admin.deleteUser(authId);
    if (error) console.error('personel-yonet: geri alma başarısız, elle silinmeli:', authId, error);
  };

  const { data: yeni, error: kullaniciHatasi } = await servis
    .from('kullanici')
    .insert({ auth_id: authId, rol, kurum_id: hedefKurumId, ad_soyad: adSoyad, eposta })
    .select(KULLANICI_KOLONLARI)
    .single();
  if (kullaniciHatasi || !yeni) {
    console.error('personel-yonet: kullanici eklenemedi', kullaniciHatasi);
    await geriAl();
    return hata(500, 'Hesap oluşturulamadı.');
  }
  const yeniKullanici = yeni as KullaniciSatiri;

  if (sinifIdleri.length > 0) {
    const { error } = await servis
      .from('ogretmen_sinif')
      .insert(sinifIdleri.map((sinif_id) => ({ kurum_id: hedefKurumId, ogretmen_id: yeniKullanici.id, sinif_id })));
    if (error) {
      console.error('personel-yonet: ogretmen_sinif eklenemedi', error);
      await geriAl();
      return hata(500, 'Sınıf atamaları yapılamadı; işlem geri alındı.');
    }
  }

  // E-posta gönderilemezse hesap geri alınmaz: yönetici personel ekranından kodu yeniden gönderebilir.
  const epostaGonderildi = await kodUretVeGonder(servis, yeniKullanici, true);
  return yanit(200, { kullanici_id: yeniKullanici.id, eposta_gonderildi: epostaGonderildi });
});
