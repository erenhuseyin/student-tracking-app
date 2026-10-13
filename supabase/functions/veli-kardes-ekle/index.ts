// Veli Kardeş Ekle Edge Function: giriş yapmış veli, başka bir çocuğunu (kardeşi) kendi hesabına
// bağlar; böylece iki çocuğu tek girişle görür.
//
// Kanıt: kardeşin kullanıcı adı ve o çocuğun veli hesabının PIN'i. Yani veli, zaten girebildiği ikinci
// hesabı birincisine bağlar — yeni bir erişim hakkı doğmaz. PIN `veli-giris` ile aynı biçimde
// doğrulanır ve yanlış denemeler aynı sayaca yazılır (bu uç, PIN denemek için arka kapı olmasın).
//
// Bağ `veli_ogrenci` satırıdır (ilişki zaten çoka çoktur). Şema veli ile öğrencinin aynı kurumda
// (aynı şubede) olmasını ister; kardeş başka şubedeyse bağlanamaz.
// Kardeşin kendi hesabı silinmez; o kullanıcı adı + PIN ile girişe devam edilebilir.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

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
// Yazılanı kullanıcı adı biçimine getirir ("Ali.Yılmaz " -> ali.yilmaz). Üretim kuralının
// (migration 20261021120000 > gizli.kullanici_adi_tabani) ve lib/kullaniciAdi.ts'in kopyasıdır.
function kullaniciAdiniDuzelt(ham: string): string {
  return [...ham]
    .map((h) => HARF_CEVIRISI[h] ?? h)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
}
const PIN_RE = /^[0-9]{4}$/;
const VELI_EPOSTA_SONEKI = 'veli.internal';
// `veli-giris` ile aynı olmalı.
const EN_FAZLA_DENEME = 5;
const KILIT_DAKIKA = 15;

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

async function sifreTutuyorMu(supabaseUrl: string, anonAnahtar: string, eposta: string, sifre: string): Promise<boolean> {
  const istemci: SupabaseClient = createClient(supabaseUrl, anonAnahtar, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await istemci.auth.signInWithPassword({ email: eposta, password: sifre });
  return !error && !!data.session;
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
    console.error('veli-kardes-ekle: SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY / VELI_PIN_ANAHTARI tanımlı değil');
    return hata(500, 'Sunucu yapılandırması eksik.');
  }

  const istemciSecenekleri = { auth: { persistSession: false, autoRefreshToken: false } };
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
    console.error('veli-kardes-ekle: çağıran okunamadı', cagiranHatasi);
    return hata(500, 'İşlem şu an yapılamıyor.');
  }
  if (!cagiran || !cagiran.aktif || cagiran.rol !== 'veli' || !cagiran.kurum_id) return hata(403, 'Bu işlem için yetkiniz yok.');

  let govde: Record<string, unknown>;
  try {
    govde = await req.json();
  } catch {
    return hata(400, 'İstek gövdesi geçerli JSON olmalı.');
  }
  if (typeof govde !== 'object' || govde === null) return hata(400, 'İstek gövdesi geçersiz.');
  const kullaniciAdi = typeof govde.kullanici_adi === 'string' ? kullaniciAdiniDuzelt(govde.kullanici_adi.slice(0, 120)) : '';
  const pin = typeof govde.pin === 'string' ? govde.pin : '';
  if (!KULLANICI_ADI_RE.test(kullaniciAdi) || kullaniciAdi.length > 60 || !PIN_RE.test(pin)) {
    return hata(400, 'Çocuğun kullanıcı adını ve 4 haneli PIN\'ini girin.');
  }

  const eslesmeHatasi = () => hata(400, 'Kullanıcı adı veya PIN hatalı.');
  const servis = createClient(supabaseUrl, servisAnahtar, istemciSecenekleri);

  // 1. Velinin müşterisi (kök kurum) ve marka kodu
  const { data: kurum } = await servis.from('kurum').select('id, kok_kurum_id').eq('id', cagiran.kurum_id).maybeSingle();
  if (!kurum) return hata(500, 'İşlem şu an yapılamıyor.');
  const kokKurumId = kurum.kok_kurum_id;
  const { data: kokKurum } = await servis.from('kurum').select('marka_kodu').eq('id', kokKurumId).maybeSingle();
  if (!kokKurum?.marka_kodu) return hata(500, 'İşlem şu an yapılamıyor.');

  // 2. Kardeş ve onun veli hesabı (bkz. veli-giris)
  const { data: ogrenci } = await servis
    .from('ogrenci')
    .select('id, kurum_id, ad_soyad')
    .eq('kok_kurum_id', kokKurumId)
    .eq('kullanici_adi', kullaniciAdi)
    .maybeSingle();
  if (!ogrenci) return eslesmeHatasi();
  const { data: baglar } = await servis.from('veli_ogrenci').select('veli_id').eq('ogrenci_id', ogrenci.id);
  const veliIdleri = (baglar ?? []).map((b) => b.veli_id);
  if (veliIdleri.includes(cagiran.id)) return hata(409, 'Bu çocuk zaten hesabınızda görünüyor.');
  if (veliIdleri.length === 0) return eslesmeHatasi();
  const { data: veliler } = await servis
    .from('kullanici')
    .select('id, auth_id, aktif, giris_deneme_sayisi, giris_kilit_bitis')
    .in('id', veliIdleri)
    .eq('rol', 'veli');

  const eposta = `${kullaniciAdi}@${kokKurum.marka_kodu}.${VELI_EPOSTA_SONEKI}`;
  let hesap: NonNullable<typeof veliler>[number] | null = null;
  for (const v of veliler ?? []) {
    const { data } = await servis.auth.admin.getUserById(v.auth_id);
    if (data.user?.email === eposta) {
      hesap = v;
      break;
    }
  }
  if (!hesap || !hesap.aktif) return eslesmeHatasi();

  // 3. Kilit ve PIN
  const kilitMesaji = `Bu çocuğun hesabı çok fazla hatalı deneme nedeniyle kilitli. ${KILIT_DAKIKA} dakika sonra tekrar deneyin ya da kurumunuzdan PIN'i sıfırlamasını isteyin.`;
  if (hesap.giris_kilit_bitis && new Date(hesap.giris_kilit_bitis).getTime() > Date.now()) return hata(429, kilitMesaji);

  const tutuyor = await sifreTutuyorMu(supabaseUrl, anonAnahtar, eposta, await pinSifresi(pinAnahtari, eposta, pin));
  if (!tutuyor) {
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
    if (error) console.error('veli-kardes-ekle: deneme sayısı yazılamadı', error);
    return kilitlendi ? hata(429, kilitMesaji) : eslesmeHatasi();
  }

  // 4. Bağla. Şema (bileşik FK) veli ile öğrencinin aynı kurumda olmasını ister.
  if (ogrenci.kurum_id !== cagiran.kurum_id) {
    return hata(409, 'Bu çocuk başka bir şubede kayıtlı; iki çocuk tek hesapta gösterilemiyor. Lütfen kurumunuzla iletişime geçin.');
  }
  const { error: bagHatasi } = await servis
    .from('veli_ogrenci')
    .insert({ kurum_id: ogrenci.kurum_id, veli_id: cagiran.id, ogrenci_id: ogrenci.id });
  if (bagHatasi) {
    console.error('veli-kardes-ekle: bağ kurulamadı', bagHatasi);
    return hata(500, 'Çocuk hesabınıza eklenemedi.');
  }
  return yanit(200, { tamam: true, ogrenci_id: ogrenci.id, ad_soyad: ogrenci.ad_soyad });
});
