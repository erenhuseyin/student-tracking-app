// Veli Giriş Edge Function: TCKN + 4 haneli PIN ile giriş yapar ve oturum (access/refresh
// token) döndürür. Oturumsuz çağrılır.
//
// Neden sunucuda: 4 haneli PIN'in yalnızca 10.000 olasılığı vardır. İstemci Auth'a doğrudan
// `signInWithPassword` yapabilseydi deneme sınırı koymanın yolu olmazdı. Bu yüzden Auth şifresi
// PIN'in kendisi değil, sunucudaki gizli anahtarla (VELI_PIN_ANAHTARI) türetilen değerdir
// (`pinSifresi`): istemci bu değeri üretemez, her deneme buradan geçer ve sayılır.
//
// Deneme sınırı: art arda EN_FAZLA_DENEME yanlış PIN'de hesap KILIT_DAKIKA dakika kilitlenir.
// Kurum yöneticisi PIN'i sıfırlarsa (veli-pin-sifirla) kilit de kalkar.
// Bilinen bedel: TCKN'yi bilen biri yanlış PIN girerek veliyi geçici olarak kilitleyebilir.
//
// Geçiş: bu fonksiyondan önce açılmış hesapların şifresi eski biçimdedir (`pin + pin`). Yeni
// biçim tutmazsa eski biçim denenir; tutarsa şifre yeni biçime çevrilir. Tüm hesaplar bir kez
// giriş yaptıktan (ya da PIN'leri sıfırlandıktan) sonra eski biçim dalı kaldırılabilir.
//
// TCKN'nin kayıtlı olup olmadığı sızmaz: hesap yok, pasif ve yanlış PIN aynı cevabı alır.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const CORS_BASLIKLARI = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const TCKN_RE = /^[1-9][0-9]{10}$/;
const PIN_RE = /^[0-9]{4}$/;
const MARKA_KODU_RE = /^[a-z][a-z0-9-]{1,30}$/;
const VELI_EPOSTA_SONEKI = 'veli.internal';
const VARSAYILAN_PIN = '1234';
const EN_FAZLA_DENEME = 5;
const KILIT_DAKIKA = 15;

function yanit(durum: number, govde: Record<string, unknown>): Response {
  return new Response(JSON.stringify(govde), {
    status: durum,
    headers: { ...CORS_BASLIKLARI, 'Content-Type': 'application/json' },
  });
}

const hata = (durum: number, mesaj: string) => yanit(durum, { hata: mesaj });

// Auth şifresi = HMAC-SHA256(anahtar, "e-posta:PIN") (hex, 64 karakter). E-posta hesaba özgü
// tuz görevi görür. Kopyaları: tckn-hesap-olustur, veli-pin-sifirla, veli-pin-degistir — Deno
// fonksiyonları tek dosya olarak deploy edildiği için paylaşılan modül yok; dördü aynı kalmalı.
async function pinSifresi(anahtar: string, eposta: string, pin: string): Promise<string> {
  const kodlayici = new TextEncoder();
  const hmacAnahtari = await crypto.subtle.importKey('raw', kodlayici.encode(anahtar), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const imza = await crypto.subtle.sign('HMAC', hmacAnahtari, kodlayici.encode(`${eposta}:${pin}`));
  return [...new Uint8Array(imza)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

type Oturum = { access_token: string; refresh_token: string };

async function girisDene(supabaseUrl: string, anonAnahtar: string, eposta: string, sifre: string): Promise<Oturum | null> {
  const istemci: SupabaseClient = createClient(supabaseUrl, anonAnahtar, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await istemci.auth.signInWithPassword({ email: eposta, password: sifre });
  if (error || !data.session) return null;
  return { access_token: data.session.access_token, refresh_token: data.session.refresh_token };
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_BASLIKLARI });
  if (req.method !== 'POST') return hata(405, 'Yalnızca POST desteklenir.');

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonAnahtar = Deno.env.get('SUPABASE_ANON_KEY');
  const servisAnahtar = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const pinAnahtari = Deno.env.get('VELI_PIN_ANAHTARI');
  if (!supabaseUrl || !anonAnahtar || !servisAnahtar || !pinAnahtari) {
    console.error('veli-giris: SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY / VELI_PIN_ANAHTARI tanımlı değil');
    return hata(500, 'Sunucu yapılandırması eksik.');
  }

  let govde: Record<string, unknown>;
  try {
    govde = await req.json();
  } catch {
    return hata(400, 'İstek gövdesi geçerli JSON olmalı.');
  }
  if (typeof govde !== 'object' || govde === null) return hata(400, 'İstek gövdesi geçersiz.');

  const tckn = typeof govde.tckn === 'string' ? govde.tckn.trim() : '';
  const pin = typeof govde.pin === 'string' ? govde.pin : '';
  const markaKodu = typeof govde.marka_kodu === 'string' ? govde.marka_kodu : '';
  if (!TCKN_RE.test(tckn) || !PIN_RE.test(pin)) return hata(400, 'TCKN 11, PIN 4 haneli olmalı.');
  if (!MARKA_KODU_RE.test(markaKodu)) return hata(400, 'Geçersiz istek.');

  const girisHatasi = () => hata(401, 'TCKN veya PIN hatalı.');
  const servis = createClient(supabaseUrl, servisAnahtar, { auth: { persistSession: false, autoRefreshToken: false } });

  // 1. Hesabı bul: uygulamanın müşterisi (marka kodu) -> TCKN'li öğrenci -> velileri -> e-postası eşleşen hesap.
  const { data: kokKurum } = await servis.from('kurum').select('id').eq('marka_kodu', markaKodu).is('ust_kurum_id', null).maybeSingle();
  if (!kokKurum) return girisHatasi();
  const { data: ogrenci } = await servis.from('ogrenci').select('id').eq('kok_kurum_id', kokKurum.id).eq('tckn', tckn).maybeSingle();
  if (!ogrenci) return girisHatasi();
  const { data: baglar } = await servis.from('veli_ogrenci').select('veli_id').eq('ogrenci_id', ogrenci.id);
  const veliIdleri = (baglar ?? []).map((b) => b.veli_id);
  if (veliIdleri.length === 0) return girisHatasi();
  const { data: veliler } = await servis
    .from('kullanici')
    .select('id, auth_id, aktif, pin_degistirilmeli, giris_deneme_sayisi, giris_kilit_bitis')
    .in('id', veliIdleri)
    .eq('rol', 'veli');

  const eposta = `${tckn}@${markaKodu}.${VELI_EPOSTA_SONEKI}`;
  let hesap: NonNullable<typeof veliler>[number] | null = null;
  for (const v of veliler ?? []) {
    const { data } = await servis.auth.admin.getUserById(v.auth_id);
    if (data.user?.email === eposta) {
      hesap = v;
      break;
    }
  }
  if (!hesap || !hesap.aktif) return girisHatasi();

  // 2. Kilit
  if (hesap.giris_kilit_bitis && new Date(hesap.giris_kilit_bitis).getTime() > Date.now()) {
    const kalanDakika = Math.max(1, Math.ceil((new Date(hesap.giris_kilit_bitis).getTime() - Date.now()) / 60000));
    return hata(429, `Çok fazla hatalı deneme yapıldı. ${kalanDakika} dakika sonra tekrar deneyin ya da kurumunuzdan PIN'inizi sıfırlamasını isteyin.`);
  }

  // 3. PIN'i dene (önce yeni biçim, sonra geçiş için eski biçim)
  const yeniSifre = await pinSifresi(pinAnahtari, eposta, pin);
  let oturum = await girisDene(supabaseUrl, anonAnahtar, eposta, yeniSifre);
  if (!oturum) {
    const eskiOturum = await girisDene(supabaseUrl, anonAnahtar, eposta, pin + pin);
    if (eskiOturum) {
      const { error } = await servis.auth.admin.updateUserById(hesap.auth_id, { password: yeniSifre });
      if (error) console.error('veli-giris: şifre yeni biçime çevrilemedi', error);
      // Şifre değişikliği önceki oturumu geçersiz kılabileceği için yeni biçimle taze oturum alınır.
      oturum = (error ? null : await girisDene(supabaseUrl, anonAnahtar, eposta, yeniSifre)) ?? eskiOturum;
    }
  }

  if (!oturum) {
    const deneme = hesap.giris_deneme_sayisi + 1;
    const kilitlendi = deneme >= EN_FAZLA_DENEME;
    const { error } = await servis
      .from('kullanici')
      .update(
        kilitlendi
          ? { giris_deneme_sayisi: 0, giris_kilit_bitis: new Date(Date.now() + KILIT_DAKIKA * 60000).toISOString() }
          : { giris_deneme_sayisi: deneme },
      )
      .eq('id', hesap.id);
    if (error) console.error('veli-giris: deneme sayısı yazılamadı', error);
    if (kilitlendi) {
      return hata(429, `Çok fazla hatalı deneme yapıldı. ${KILIT_DAKIKA} dakika sonra tekrar deneyin ya da kurumunuzdan PIN'inizi sıfırlamasını isteyin.`);
    }
    return girisHatasi();
  }

  // 4. Başarılı: sayaç sıfırlanır. Varsayılan PIN'le girildiyse (eski hesaplar dahil) değiştirmesi istenir.
  const pinDegistirilmeli = hesap.pin_degistirilmeli || pin === VARSAYILAN_PIN;
  const { error: sifirlamaHatasi } = await servis
    .from('kullanici')
    .update({ giris_deneme_sayisi: 0, giris_kilit_bitis: null, pin_degistirilmeli: pinDegistirilmeli })
    .eq('id', hesap.id);
  if (sifirlamaHatasi) console.error('veli-giris: giriş durumu yazılamadı', sifirlamaHatasi);

  return yanit(200, { ...oturum, pin_degistirilmeli: pinDegistirilmeli });
});
