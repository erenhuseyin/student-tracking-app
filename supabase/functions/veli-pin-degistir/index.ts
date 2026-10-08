// Veli PIN Değiştir Edge Function: giriş yapmış veli kendi PIN'ini değiştirir.
//
// Neden sunucuda: Auth şifresi PIN'den sunucudaki gizli anahtarla türetilir (bkz. veli-giris);
// istemci bu değeri üretemez, bu yüzden `auth.updateUser` ile PIN değiştiremez.
//
// Kurallar:
//   - yalnızca `veli` çağırabilir, yalnızca kendi hesabı için
//   - yeni PIN 4 hane olmalı ve varsayılan PIN ("1234") olamaz
//   - hesap "PIN değiştirilmeli" durumundaysa (ilk giriş ya da sıfırlama sonrası) mevcut PIN
//     sorulmaz — veli az önce onunla giriş yaptı. Diğer durumda mevcut PIN doğrulanır: açık
//     kalmış bir telefonu eline alan kişi PIN'i değiştirip hesabı ele geçiremesin.

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS_BASLIKLARI = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PIN_RE = /^[0-9]{4}$/;
const VARSAYILAN_PIN = '1234';

function yanit(durum: number, govde: Record<string, unknown>): Response {
  return new Response(JSON.stringify(govde), {
    status: durum,
    headers: { ...CORS_BASLIKLARI, 'Content-Type': 'application/json' },
  });
}

const hata = (durum: number, mesaj: string) => yanit(durum, { hata: mesaj });

// `veli-giris`'teki `pinSifresi`'nin kopyasıdır (paylaşılan modül yok); aynı kalmalı.
async function pinSifresi(anahtar: string, eposta: string, pin: string): Promise<string> {
  const kodlayici = new TextEncoder();
  const hmacAnahtari = await crypto.subtle.importKey('raw', kodlayici.encode(anahtar), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const imza = await crypto.subtle.sign('HMAC', hmacAnahtari, kodlayici.encode(`${eposta}:${pin}`));
  return [...new Uint8Array(imza)].map((b) => b.toString(16).padStart(2, '0')).join('');
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
    console.error('veli-pin-degistir: SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY / VELI_PIN_ANAHTARI tanımlı değil');
    return hata(500, 'Sunucu yapılandırması eksik.');
  }

  const istemciSecenekleri = { auth: { persistSession: false, autoRefreshToken: false } };
  const kullaniciClient = createClient(supabaseUrl, anonAnahtar, {
    global: { headers: { Authorization: yetkiBasligi } },
    ...istemciSecenekleri,
  });
  const { data: kimlik, error: kimlikHatasi } = await kullaniciClient.auth.getUser();
  if (kimlikHatasi || !kimlik.user || !kimlik.user.email) return hata(401, 'Oturumunuz geçersiz.');
  const eposta = kimlik.user.email;

  const { data: cagiran, error: cagiranHatasi } = await kullaniciClient
    .from('kullanici')
    .select('id, rol, pin_degistirilmeli')
    .eq('auth_id', kimlik.user.id)
    .maybeSingle();
  if (cagiranHatasi) {
    console.error('veli-pin-degistir: çağıran okunamadı', cagiranHatasi);
    return hata(500, 'İşlem şu an yapılamıyor.');
  }
  if (!cagiran || cagiran.rol !== 'veli') return hata(403, 'Bu işlem için yetkiniz yok.');

  let govde: Record<string, unknown>;
  try {
    govde = await req.json();
  } catch {
    return hata(400, 'İstek gövdesi geçerli JSON olmalı.');
  }
  if (typeof govde !== 'object' || govde === null) return hata(400, 'İstek gövdesi geçersiz.');

  const yeniPin = typeof govde.yeni_pin === 'string' ? govde.yeni_pin : '';
  const mevcutPin = typeof govde.mevcut_pin === 'string' ? govde.mevcut_pin : '';
  if (!PIN_RE.test(yeniPin)) return hata(400, 'PIN 4 haneli olmalı.');
  if (yeniPin === VARSAYILAN_PIN) return hata(400, 'Bu PIN herkesçe bilinen başlangıç PIN\'idir; başka bir PIN seçin.');

  if (!cagiran.pin_degistirilmeli) {
    if (!PIN_RE.test(mevcutPin)) return hata(400, 'Mevcut PIN\'inizi girin.');
    if (mevcutPin === yeniPin) return hata(400, 'Yeni PIN mevcut PIN\'den farklı olmalı.');
    const dogrulayici = createClient(supabaseUrl, anonAnahtar, istemciSecenekleri);
    const { error: yeniBicimHatasi } = await dogrulayici.auth.signInWithPassword({
      email: eposta,
      password: await pinSifresi(pinAnahtari, eposta, mevcutPin),
    });
    if (yeniBicimHatasi) {
      // Geçiş: henüz yeni biçime çevrilmemiş hesap (bkz. veli-giris).
      const { error: eskiBicimHatasi } = await dogrulayici.auth.signInWithPassword({ email: eposta, password: mevcutPin + mevcutPin });
      if (eskiBicimHatasi) return hata(400, 'Mevcut PIN hatalı.');
    }
  }

  const servis = createClient(supabaseUrl, servisAnahtar, istemciSecenekleri);
  const { error: sifreHatasi } = await servis.auth.admin.updateUserById(kimlik.user.id, {
    password: await pinSifresi(pinAnahtari, eposta, yeniPin),
  });
  if (sifreHatasi) {
    console.error('veli-pin-degistir: PIN yazılamadı', sifreHatasi);
    return hata(500, 'PIN değiştirilemedi.');
  }
  const { error: bayrakHatasi } = await servis
    .from('kullanici')
    .update({ pin_degistirilmeli: false, giris_deneme_sayisi: 0, giris_kilit_bitis: null })
    .eq('id', cagiran.id);
  if (bayrakHatasi) console.error('veli-pin-degistir: pin_degistirilmeli yazılamadı', bayrakHatasi);

  return yanit(200, { tamam: true });
});
