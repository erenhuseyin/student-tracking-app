// Personel Giriş Edge Function: kullanıcı adı + şifre ile giriş yapar ve oturum (access/refresh
// token) döndürür. Oturumsuz çağrılır.
//
// Personel (öğretmen, yönetici) e-postasıyla da girebilir; o yol istemciden doğrudan Auth'a gider.
// Kullanıcı adı (ali.yilmaz; bkz. migration 20261024120000) istemcide e-postaya çevrilemez: başka
// kişilerin e-postası oturumsuz okunamaz. Bu fonksiyon adı müşteri içinde arar, kişinin e-postasıyla
// Auth'a giriş yapar ve oturumu döndürür.
//
// Deneme sınırı yoktur (kullanıcı kararı, 2026-10-15): şifre en az 8 karakterdir ve Supabase Auth'un
// kendi hız sınırı geçerlidir; ayrıca kilit konsaydı adı bilen biri hocayı kilitleyebilirdi.
//
// Kullanıcı adının kayıtlı olup olmadığı sızmaz: hesap yok, pasif, daveti kabul edilmemiş ve
// yanlış şifre aynı cevabı alır.

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS_BASLIKLARI = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const KULLANICI_ADI_RE = /^[a-z0-9]+(\.[a-z0-9]+)*$/;
const HARF_CEVIRISI: Record<string, string> = {
  Ş: 's', ş: 's', Ç: 'c', ç: 'c', Ğ: 'g', ğ: 'g', İ: 'i', I: 'i', ı: 'i', Ö: 'o', ö: 'o', Ü: 'u', ü: 'u',
  Â: 'a', â: 'a', Î: 'i', î: 'i', Û: 'u', û: 'u',
};
// Yazılanı kullanıcı adı biçimine getirir ("Ali.Yılmaz " -> ali.yilmaz). lib/kullaniciAdi.ts ve
// veli-giris'teki kopyalarla aynı kalmalı.
function kullaniciAdiniDuzelt(ham: string): string {
  return [...ham]
    .map((h) => HARF_CEVIRISI[h] ?? h)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
}
const MARKA_KODU_RE = /^[a-z][a-z0-9-]{1,30}$/;

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

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonAnahtar = Deno.env.get('SUPABASE_ANON_KEY');
  const servisAnahtar = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonAnahtar || !servisAnahtar) {
    console.error('personel-giris: SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY tanımlı değil');
    return hata(500, 'Sunucu yapılandırması eksik.');
  }

  let govde: Record<string, unknown>;
  try {
    govde = await req.json();
  } catch {
    return hata(400, 'İstek gövdesi geçerli JSON olmalı.');
  }
  if (typeof govde !== 'object' || govde === null) return hata(400, 'İstek gövdesi geçersiz.');

  const kullaniciAdi = typeof govde.kullanici_adi === 'string' ? kullaniciAdiniDuzelt(govde.kullanici_adi.slice(0, 120)) : '';
  const sifre = typeof govde.sifre === 'string' ? govde.sifre : '';
  const markaKodu = typeof govde.marka_kodu === 'string' ? govde.marka_kodu : '';
  if (!KULLANICI_ADI_RE.test(kullaniciAdi) || kullaniciAdi.length > 60 || !sifre || sifre.length > 200) {
    return hata(400, 'Kullanıcı adınızı ve şifrenizi girin.');
  }
  if (!MARKA_KODU_RE.test(markaKodu)) return hata(400, 'Geçersiz istek.');

  const girisHatasi = () => hata(401, 'Kullanıcı adı veya şifre hatalı.');
  const servis = createClient(supabaseUrl, servisAnahtar, { auth: { persistSession: false, autoRefreshToken: false } });

  // Uygulamanın müşterisi (marka kodu) -> o müşteride bu adı taşıyan aktif personel.
  const { data: kokKurum } = await servis.from('kurum').select('id').eq('marka_kodu', markaKodu).is('ust_kurum_id', null).maybeSingle();
  if (!kokKurum) return girisHatasi();
  const { data: kisi } = await servis
    .from('kullanici')
    .select('eposta, aktif, sifre_belirlendi')
    .eq('kok_kurum_id', kokKurum.id)
    .eq('kullanici_adi', kullaniciAdi)
    .in('rol', ['kurum_admin', 'ogretmen'])
    .maybeSingle();
  if (!kisi?.eposta || !kisi.aktif || !kisi.sifre_belirlendi) return girisHatasi();

  const istemci = createClient(supabaseUrl, anonAnahtar, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await istemci.auth.signInWithPassword({ email: kisi.eposta, password: sifre });
  if (error || !data.session) return girisHatasi();

  return yanit(200, { access_token: data.session.access_token, refresh_token: data.session.refresh_token });
});
