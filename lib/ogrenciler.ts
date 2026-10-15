// Öğrenci CRUD. RLS (ogrenci_kurum_admin politikası) kurum_admin'in yalnızca yönettiği
// kurumlardaki (kendi kurumu + şubeleri) öğrencileri yönetmesine izin verir; öğretmen (ogretmen_kayit
// bayrağı açıksa) atandığı sınıflara öğrenci ekler, onları düzenler ve pasife alır, silemez. Yeni öğrencinin
// kurum_id'si sınıfının kurumuyla aynı olmalıdır (bileşik FK).
// dogum_tarihi biçimi: YYYY-AA-GG (native tarih seçici bu adımda kapsam dışı).
import { edgeFonksiyonuCagir } from '@/lib/edge';
import { supabase } from '@/lib/supabase';
import type { Cinsiyet, Ogrenci } from '@/lib/tipler';

const TARIH_RE = /^\d{4}-\d{2}-\d{2}$/;

function hataMesajinaCevir(mesaj: string, kod?: string): string {
  if (kod === '23503') return 'Seçilen sınıf bulunamadı.';
  if (/permission denied|rls/i.test(mesaj)) return 'Bu işlem için yetkiniz yok.';
  if (/network|fetch/i.test(mesaj)) return 'Bağlantı sorunu, lütfen tekrar deneyin.';
  return 'İşlem yapılamadı, lütfen tekrar deneyin.';
}

function girdiyiDogrula(adSoyad: string, dogumTarihi: string): { ad_soyad: string; dogum_tarihi: string } {
  const temizAd = adSoyad.trim();
  const temizTarih = dogumTarihi.trim();
  if (!temizAd) throw new Error('Ad soyad gerekli.');
  if (!TARIH_RE.test(temizTarih)) throw new Error('Doğum tarihini gün, ay ve yıl olarak girin (örn. 20 / 09 / 2015).');
  return { ad_soyad: temizAd, dogum_tarihi: temizTarih };
}

// Sınıfın aktif öğrencileri. Pasife alınmış (ayrılmış) öğrenciler sınıf listelerinde, yoklamada ve
// takip ekranlarında görünmez; yönetici onları Öğrenciler ekranındaki "Pasifler" süzgeciyle, öğretmen
// sınıf ekranındaki "Ayrılanlar" ile bulur (aktif = false).
export async function ogrencileriGetir(sinifId: string, aktif = true): Promise<Ogrenci[]> {
  const { data, error } = await supabase
    .from('ogrenci')
    .select('*')
    .eq('sinif_id', sinifId)
    .eq('aktif', aktif)
    .order('ad_soyad');
  if (error) throw new Error(hataMesajinaCevir(error.message));
  return data;
}

export async function ogrenciGetir(id: string): Promise<Ogrenci> {
  const { data, error } = await supabase.from('ogrenci').select('*').eq('id', id).single();
  if (error) throw new Error(hataMesajinaCevir(error.message));
  return data;
}

// Veli girişi: öğrenci eklenince sunucu ona addan bir kullanıcı adı üretir ve veli hesabını açar
// (başlangıç PIN'i 1234; bkz. supabase/functions/veli-hesap-olustur). Kullanıcı adı ve hesap yalnızca
// sunucuda yazılır; istemci öğrenciyi ekledikten sonra fonksiyonu çağırır. Çağrı düşerse öğrenci
// eklenmiş kalır, veli girişi öğrenci ekranından ("Veli girişini aç") sonradan açılır.
type HesapSonucu = { ogrenci_id: string; kullanici_adi: string | null; durum: 'acildi' | 'vardi' | 'cevrildi' | 'hata'; mesaj?: string };

async function veliHesaplariniAc(ogrenciIdleri: string[]): Promise<HesapSonucu[]> {
  const { sonuclar } = await edgeFonksiyonuCagir<{ sonuclar: HesapSonucu[] }>(
    'veli-hesap-olustur',
    { islem: 'ac', ogrenci_idleri: ogrenciIdleri },
    'Veli girişi açılamadı.',
  );
  return sonuclar;
}

export type OgrenciEklemeSonucu = {
  ogrenci: Ogrenci;
  // Velinin giriş adı; veli hesabı açılamadıysa null.
  kullaniciAdi: string | null;
  // Öğrenci eklendi ama veli girişi açılamadıysa nedeni.
  veliUyarisi: string | null;
};

export async function ogrenciEkle(
  kurumId: string,
  sinifId: string,
  adSoyad: string,
  dogumTarihi: string,
  cinsiyet: Cinsiyet | null = null,
): Promise<OgrenciEklemeSonucu> {
  const girdi = girdiyiDogrula(adSoyad, dogumTarihi);
  const { data, error } = await supabase
    .from('ogrenci')
    .insert({ kurum_id: kurumId, sinif_id: sinifId, ...girdi, cinsiyet })
    .select()
    .single();
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
  try {
    const [sonuc] = await veliHesaplariniAc([data.id]);
    if (sonuc && sonuc.durum !== 'hata') return { ogrenci: data, kullaniciAdi: sonuc.kullanici_adi, veliUyarisi: null };
    return { ogrenci: data, kullaniciAdi: null, veliUyarisi: sonuc?.mesaj ?? 'Veli girişi açılamadı.' };
  } catch (e) {
    return { ogrenci: data, kullaniciAdi: null, veliUyarisi: e instanceof Error ? e.message : 'Veli girişi açılamadı.' };
  }
}

export type TopluEklemeSonucu = {
  eklenen: number;
  // Veli girişi açılan öğrenciler ve kullanıcı adları (velilere iletmek için).
  hesaplar: { adSoyad: string; kullaniciAdi: string }[];
  // Öğrenci eklendi ama veli girişi açılamadı.
  veliHatalari: { adSoyad: string; mesaj: string }[];
};

// Önceden doğrulanmış satırları (lib/topluAktarma.ts) tek seferde ekler ve hepsine veli girişi açar.
// Öğrenci eklemesi ya hep ya hiçtir (tek insert); veli girişi açılamayan öğrenciler eklenmiş kalır
// ve sonuçta listelenir — giriş sonradan öğrenci ekranından açılır.
export async function ogrencileriTopluEkle(
  kurumId: string,
  sinifId: string,
  satirlar: { adSoyad: string; dogumTarihi: string; cinsiyet?: Cinsiyet | null }[],
): Promise<TopluEklemeSonucu> {
  if (satirlar.length === 0) throw new Error('Eklenecek öğrenci yok.');
  const { data, error } = await supabase
    .from('ogrenci')
    .insert(
      satirlar.map((s) => ({
        kurum_id: kurumId,
        sinif_id: sinifId,
        ...girdiyiDogrula(s.adSoyad, s.dogumTarihi),
        cinsiyet: s.cinsiyet ?? null,
      })),
    )
    .select('id, ad_soyad');
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));

  const sonuc: TopluEklemeSonucu = { eklenen: data.length, hesaplar: [], veliHatalari: [] };
  const adlar = new Map(data.map((o) => [o.id, o.ad_soyad]));
  try {
    for (const h of await veliHesaplariniAc(data.map((o) => o.id))) {
      const adSoyad = adlar.get(h.ogrenci_id) ?? '';
      if (h.durum !== 'hata' && h.kullanici_adi) sonuc.hesaplar.push({ adSoyad, kullaniciAdi: h.kullanici_adi });
      else sonuc.veliHatalari.push({ adSoyad, mesaj: h.mesaj ?? 'Veli girişi açılamadı.' });
    }
  } catch (e) {
    const mesaj = e instanceof Error ? e.message : 'Veli girişi açılamadı.';
    sonuc.veliHatalari = data.map((o) => ({ adSoyad: o.ad_soyad, mesaj }));
  }
  return sonuc;
}

export async function ogrenciGuncelle(
  id: string,
  adSoyad: string,
  dogumTarihi: string,
  cinsiyet: Cinsiyet | null,
): Promise<Ogrenci> {
  const girdi = girdiyiDogrula(adSoyad, dogumTarihi);
  const { data, error } = await supabase.from('ogrenci').update({ ...girdi, cinsiyet }).eq('id', id).select().single();
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
  return data;
}

// Erişim: kurum admini (yönettiği kurumlar). Pasife alınan öğrencinin kayıtları korunur.
export async function ogrenciAktifliginiAyarla(id: string, aktif: boolean): Promise<void> {
  const { data, error } = await supabase.from('ogrenci').update({ aktif }).eq('id', id).select('id');
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
  if (data.length === 0) throw new Error('Bu işlem için yetkiniz yok.');
}

export type OgrenciAramasi = {
  arama: string;
  sinifId: string | null;
  durum: 'aktif' | 'pasif';
  // Seçilen birim ve altındaki tüm birimler.
  birimId?: string | null;
  cinsiyet?: Cinsiyet | null;
};
export type OgrenciSiralamasi = { anahtar: 'ad_soyad' | 'dogum_tarihi'; yon: 'artan' | 'azalan' };
export const OGRENCI_SAYFA_BOYUTU = 30;

// Yöneticinin tüm öğrencileri arayıp süzdüğü liste (RLS: yönettiği kurumlar). Sunucuda süzülür ve
// sayfalanır: kurum büyüdükçe tüm listeyi indirmemek ve varsayılan 1000 satır sınırına takılmamak için.
// Birim süzgeci kurumun `yol`'u üzerinden yapılır (tek kimlikle tüm alt ağaç).
export async function ogrencileriAra(
  { arama, sinifId, durum, birimId, cinsiyet }: OgrenciAramasi,
  sayfa: number,
  siralama: OgrenciSiralamasi = { anahtar: 'ad_soyad', yon: 'artan' },
): Promise<{ ogrenciler: Ogrenci[]; toplam: number }> {
  let sorgu = supabase
    .from('ogrenci')
    .select('*, kurum!ogrenci_kurum_id_fkey!inner(yol)', { count: 'exact' })
    .eq('aktif', durum === 'aktif');
  if (birimId) sorgu = sorgu.contains('kurum.yol', [birimId]);
  if (sinifId) sorgu = sorgu.eq('sinif_id', sinifId);
  if (cinsiyet) sorgu = sorgu.eq('cinsiyet', cinsiyet);
  // % ve _ ilike joker karakterleridir; kullanıcının yazdığı metinde kaçırılır.
  const temiz = arama.trim().replace(/[%_\\]/g, (k) => `\\${k}`);
  if (temiz) sorgu = sorgu.ilike('ad_soyad', `%${temiz}%`);
  const { data, error, count } = await sorgu
    .order(siralama.anahtar, { ascending: siralama.yon === 'artan' })
    .order('id')
    .range(sayfa * OGRENCI_SAYFA_BOYUTU, (sayfa + 1) * OGRENCI_SAYFA_BOYUTU - 1);
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
  return { ogrenciler: data as unknown as Ogrenci[], toplam: count ?? data.length };
}

export async function ogrenciSil(id: string): Promise<void> {
  const { error } = await supabase.from('ogrenci').delete().eq('id', id);
  // Yoklama kayıtları öğrenciyle birlikte silinmez (FK); yoklaması olan öğrenci bu yüzden silinemez.
  if (error?.code === '23503') throw new Error('Bu öğrencinin yoklama kaydı var; kayıt silinemez.');
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
}

// Erişim: yalnızca süper admin ve kurum admini (yönettiği kurumlar). Yetki kontrolü sunucudadır
// (supabase/functions/veli-hesap-olustur); burada yalnızca çağrı yapılır. Veli girişi açılmamış
// (eklenirken açılamamış ya da eski) öğrenci için; üretilen kullanıcı adını döndürür.
export async function veliGirisiniAc(ogrenciId: string): Promise<string> {
  const [sonuc] = await veliHesaplariniAc([ogrenciId]);
  if (!sonuc || sonuc.durum === 'hata' || !sonuc.kullanici_adi) throw new Error(sonuc?.mesaj ?? 'Veli girişi açılamadı.');
  return sonuc.kullanici_adi;
}

// PIN'i başlangıç PIN'ine (1234) döndürür ve giriş kilidini kaldırır; veli ilk girişte yenisini belirler.
export async function veliPininiSifirla(ogrenciId: string): Promise<void> {
  await edgeFonksiyonuCagir('veli-hesap-olustur', { islem: 'pin_sifirla', ogrenci_id: ogrenciId }, 'PIN sıfırlanamadı.');
}
