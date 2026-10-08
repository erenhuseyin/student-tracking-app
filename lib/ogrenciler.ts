// Öğrenci CRUD. RLS (ogrenci_kurum_admin politikası) kurum_admin'in yalnızca yönettiği
// kurumlardaki (kendi kurumu + şubeleri) öğrencileri yönetmesine izin verir. Yeni öğrencinin
// kurum_id'si sınıfının kurumuyla aynı olmalıdır (bileşik FK).
// dogum_tarihi biçimi: YYYY-AA-GG (native tarih seçici bu adımda kapsam dışı).
import { edgeFonksiyonuCagir } from '@/lib/edge';
import { supabase } from '@/lib/supabase';
import type { Ogrenci } from '@/lib/tipler';

const TARIH_RE = /^\d{4}-\d{2}-\d{2}$/;
const TCKN_RE = /^[1-9][0-9]{10}$/;

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

export async function ogrencileriGetir(sinifId: string): Promise<Ogrenci[]> {
  const { data, error } = await supabase.from('ogrenci').select('*').eq('sinif_id', sinifId).order('ad_soyad');
  if (error) throw new Error(hataMesajinaCevir(error.message));
  return data;
}

export async function ogrenciGetir(id: string): Promise<Ogrenci> {
  const { data, error } = await supabase.from('ogrenci').select('*').eq('id', id).single();
  if (error) throw new Error(hataMesajinaCevir(error.message));
  return data;
}

export async function ogrenciEkle(
  kurumId: string,
  sinifId: string,
  adSoyad: string,
  dogumTarihi: string,
): Promise<Ogrenci> {
  const girdi = girdiyiDogrula(adSoyad, dogumTarihi);
  const { data, error } = await supabase
    .from('ogrenci')
    .insert({ kurum_id: kurumId, sinif_id: sinifId, ...girdi })
    .select()
    .single();
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
  return data;
}

export async function ogrenciGuncelle(id: string, adSoyad: string, dogumTarihi: string): Promise<Ogrenci> {
  const girdi = girdiyiDogrula(adSoyad, dogumTarihi);
  const { data, error } = await supabase.from('ogrenci').update(girdi).eq('id', id).select().single();
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
  return data;
}

export async function ogrenciSil(id: string): Promise<void> {
  const { error } = await supabase.from('ogrenci').delete().eq('id', id);
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
}

// Resmi TCKN doğrulama algoritması (biçim/checksum kontrolü — gerçek kişiye ait olup
// olmadığını doğrulamaz). Edge Function'daki (tckn-hesap-olustur) aynı fonksiyonun kopyasıdır;
// Deno ve React Native arasında paylaşılan bir paket olmadığı için burada tekrarlanır.
export function tcknGecerliMi(tckn: string): boolean {
  if (!TCKN_RE.test(tckn)) return false;
  const d = tckn.split('').map(Number);
  const tek = d[0] + d[2] + d[4] + d[6] + d[8];
  const cift = d[1] + d[3] + d[5] + d[7];
  const d10 = (tek * 7 - cift) % 10;
  if (d10 !== d[9]) return false;
  const toplam10 = d.slice(0, 10).reduce((a, b) => a + b, 0);
  return toplam10 % 10 === d[10];
}

// Erişim: yalnızca süper admin ve kurum admini (kendi kurumu). Yetki kontrolü sunucudadır
// (supabase/functions/tckn-hesap-olustur); burada yalnızca çağrı yapılır.
export async function tcknAta(ogrenciId: string, tckn: string): Promise<void> {
  if (!tcknGecerliMi(tckn)) throw new Error('Geçerli bir TCKN girin.');
  await edgeFonksiyonuCagir('tckn-hesap-olustur', { ogrenci_id: ogrenciId, tckn }, 'TCKN atanamadı.');
}

// Erişim: yalnızca süper admin ve kurum admini (kendi kurumu). Yetki kontrolü sunucudadır
// (supabase/functions/veli-pin-sifirla); burada yalnızca çağrı yapılır.
export async function veliPininiSifirla(ogrenciId: string): Promise<void> {
  await edgeFonksiyonuCagir('veli-pin-sifirla', { ogrenci_id: ogrenciId }, 'PIN sıfırlanamadı.');
}
