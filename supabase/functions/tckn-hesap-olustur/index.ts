// TCKN Hesap Oluştur Edge Function: bir öğrenciye TCKN atar ve karşılığında bir veli
// auth hesabı (TCKN + PIN girişi için) oluşturur.
//
// Neden sunucuda: `ogrenci.tckn` kolonuna istemciden yazma yetkisi yoktur (bkz. migration
// 20260928120200_ogrenci_tckn) ve service_role anahtarı uygulamaya konamaz. Veli girişi
// Supabase Auth email+şifre mekanizmasını arkada kullanır: email = `{tckn}@{marka_kodu}.veli.internal`
// (gerçek posta kutusu değil, yalnızca benzersiz kimlik), password = PIN'den türetilen değer
// (varsayılan PIN '1234'; veli ilk girişte değiştirmek zorundadır — pin_degistirilmeli).
// marka_kodu öğrencinin kök kurumundan (müşteriden) gelir: TCKN müşteri başına tekildir, aynı
// çocuk iki farklı müşteride ayrı veli hesabıyla bulunabilir.
//
// Yetki matrisi:
//   super_admin -> herhangi bir kurumun öğrencisine TCKN atayabilir
//   kurum_admin -> yalnızca yönettiği kurumların (kendi kurumu + şubeleri) öğrencisine
//   ogretmen, veli -> 403
//
// TCKN yalnızca İLK ATAMADA yazılır (MVP sınırı) — öğrencide zaten TCKN varsa 409 döner.

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS_BASLIKLARI = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TCKN_RE = /^[1-9][0-9]{10}$/;
const VELI_EPOSTA_SONEKI = 'veli.internal';
const VARSAYILAN_PIN = '1234';

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

// Resmi TCKN doğrulama algoritması (kimlik numarasının kendisinin gerçek olup olmadığını
// değil, biçiminin/checksum'ının geçerli olup olmadığını doğrular).
function tcknGecerliMi(tckn: string): boolean {
  if (!TCKN_RE.test(tckn)) return false;
  const d = tckn.split('').map(Number);
  const tek = d[0] + d[2] + d[4] + d[6] + d[8];
  const cift = d[1] + d[3] + d[5] + d[7];
  const d10 = (tek * 7 - cift) % 10;
  if (d10 !== d[9]) return false;
  const toplam10 = d.slice(0, 10).reduce((a, b) => a + b, 0);
  return toplam10 % 10 === d[10];
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
    console.error('tckn-hesap-olustur: SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY / VELI_PIN_ANAHTARI tanımlı değil');
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
    .select('id, rol, kurum_id')
    .eq('auth_id', kimlik.user.id)
    .maybeSingle();
  if (cagiranHatasi) {
    console.error('tckn-hesap-olustur: çağıran okunamadı', cagiranHatasi);
    return hata(500, 'İşlem şu an yapılamıyor.');
  }
  if (!cagiran) return hata(403, 'Bu işlem için yetkiniz yok.');
  if (cagiran.rol !== 'super_admin' && cagiran.rol !== 'kurum_admin') {
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
  const tckn = typeof govde.tckn === 'string' ? govde.tckn.trim() : '';
  if (!UUID_RE.test(ogrenciId)) return hata(400, 'Geçersiz öğrenci.');
  if (!tcknGecerliMi(tckn)) return hata(400, 'Geçerli bir TCKN girin.');

  // 3. Çağıranın bu öğrenciye erişimi var mı? RLS'in kendisi yetki katmanı: kullaniciClient
  //    (anon key + çağıranın JWT'si) ile okunan satır, RLS'i geçen satırdır. Kurum admini için
  //    bu, yönettiği kurumların (kendi kurumu + şubeleri) öğrencileridir.
  const { data: ogrenci, error: ogrenciHatasi } = await kullaniciClient
    .from('ogrenci')
    .select('id, kurum_id, kok_kurum_id, ad_soyad, tckn')
    .eq('id', ogrenciId)
    .maybeSingle();
  if (ogrenciHatasi) {
    console.error('tckn-hesap-olustur: öğrenci okunamadı', ogrenciHatasi);
    return hata(500, 'İşlem şu an yapılamıyor.');
  }
  if (!ogrenci) return hata(403, 'Bu işlem için yetkiniz yok.');
  if (ogrenci.tckn) return hata(409, 'Bu öğrenciye zaten bir TCKN atanmış.');

  // Bundan sonrası service_role ile (RLS'i aşar) — yetki kararı yukarıda verildi.
  const servis = createClient(supabaseUrl, servisAnahtar, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: kokKurum, error: kokKurumHatasi } = await servis
    .from('kurum')
    .select('marka_kodu')
    .eq('id', ogrenci.kok_kurum_id)
    .maybeSingle();
  if (kokKurumHatasi) {
    console.error('tckn-hesap-olustur: kök kurum okunamadı', kokKurumHatasi);
    return hata(500, 'İşlem şu an yapılamıyor.');
  }
  if (!kokKurum?.marka_kodu) {
    return hata(409, 'Bu kurum için marka kodu tanımlanmamış; önce süper admin tanımlamalı.');
  }

  // 4. Hesap oluştur, ardından kullanici + veli_ogrenci + ogrenci.tckn güncellenir.
  //    Herhangi bir adım düşerse auth kullanıcısı silinir (FK cascade kullanici ve bağlarını da siler).
  const email = `${tckn}@${kokKurum.marka_kodu}.${VELI_EPOSTA_SONEKI}`;
  const { data: yeniAuth, error: authHatasi } = await servis.auth.admin.createUser({
    email,
    password: await pinSifresi(pinAnahtari, email, VARSAYILAN_PIN),
    email_confirm: true,
  });
  if (authHatasi || !yeniAuth.user) {
    if (authHatasi && (authHatasi.code === 'email_exists' || /already.*registered/i.test(authHatasi.message))) {
      return hata(409, 'Bu TCKN için zaten bir veli hesabı var.');
    }
    console.error('tckn-hesap-olustur: hesap oluşturulamadı', authHatasi);
    return hata(500, 'Veli hesabı oluşturulamadı.');
  }
  const authId = yeniAuth.user.id;

  const geriAl = async () => {
    const { error } = await servis.auth.admin.deleteUser(authId);
    if (error) console.error('tckn-hesap-olustur: geri alma başarısız, elle silinmeli:', authId, error);
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
    console.error('tckn-hesap-olustur: kullanici eklenemedi', kullaniciHatasi);
    await geriAl();
    return hata(500, 'Veli hesabı oluşturulamadı.');
  }

  const { error: veliOgrenciHatasi } = await servis
    .from('veli_ogrenci')
    .insert({ kurum_id: ogrenci.kurum_id, veli_id: yeniKullanici.id, ogrenci_id: ogrenciId });
  if (veliOgrenciHatasi) {
    console.error('tckn-hesap-olustur: veli_ogrenci eklenemedi', veliOgrenciHatasi);
    await geriAl();
    return hata(500, 'Veli-öğrenci bağı kurulamadı; işlem geri alındı.');
  }

  const { error: tcknHatasi } = await servis.from('ogrenci').update({ tckn }).eq('id', ogrenciId);
  if (tcknHatasi) {
    if (tcknHatasi.code === '23505') {
      await geriAl();
      return hata(409, 'Bu TCKN bu kurumda başka bir öğrenciye atanmış.');
    }
    console.error('tckn-hesap-olustur: ogrenci.tckn güncellenemedi', tcknHatasi);
    await geriAl();
    return hata(500, 'TCKN kaydedilemedi; işlem geri alındı.');
  }

  return yanit(200, { kullanici_id: yeniKullanici.id });
});
