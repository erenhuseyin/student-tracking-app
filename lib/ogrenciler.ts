// Öğrenci CRUD. RLS (ogrenci_kurum_admin politikası) kurum_admin'in yalnızca yönettiği
// kurumlardaki (kendi kurumu + şubeleri) öğrencileri yönetmesine izin verir. Yeni öğrencinin
// kurum_id'si sınıfının kurumuyla aynı olmalıdır (bileşik FK).
// dogum_tarihi biçimi: YYYY-AA-GG (native tarih seçici bu adımda kapsam dışı).
import { edgeFonksiyonuCagir } from '@/lib/edge';
import { supabase } from '@/lib/supabase';
import { tcknGecerliMi } from '@/lib/tckn';
import type { Ogrenci } from '@/lib/tipler';

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

export type TopluEklemeSonucu = {
  eklenen: number;
  veliHesabiAcilan: number;
  // Öğrenci eklendi ama veli hesabı açılamadı (ör. TCKN bu kurumda zaten kayıtlı).
  tcknHatalari: { adSoyad: string; mesaj: string }[];
};

// Önceden doğrulanmış satırları (lib/topluAktarma.ts) tek seferde ekler; TCKN verilenler için
// veli hesabını sırayla açar. Öğrenci eklemesi ya hep ya hiçtir (tek insert); veli hesabı
// açılamayan öğrenciler eklenmiş kalır ve sonuçta listelenir — TCKN sonradan öğrenci ekranından atanır.
export async function ogrencileriTopluEkle(
  kurumId: string,
  sinifId: string,
  satirlar: { adSoyad: string; dogumTarihi: string; tckn: string | null }[],
): Promise<TopluEklemeSonucu> {
  if (satirlar.length === 0) throw new Error('Eklenecek öğrenci yok.');
  const { data, error } = await supabase
    .from('ogrenci')
    .insert(satirlar.map((s) => ({ kurum_id: kurumId, sinif_id: sinifId, ...girdiyiDogrula(s.adSoyad, s.dogumTarihi) })))
    .select('id, ad_soyad');
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));

  const sonuc: TopluEklemeSonucu = { eklenen: data.length, veliHesabiAcilan: 0, tcknHatalari: [] };
  // Dönen satırlar gönderilen sırayla eşleşir (tek insert); TCKN'ler sıraya göre atanır.
  for (let i = 0; i < data.length; i++) {
    const tckn = satirlar[i]?.tckn;
    if (!tckn) continue;
    try {
      await tcknAta(data[i].id, tckn);
      sonuc.veliHesabiAcilan += 1;
    } catch (e) {
      sonuc.tcknHatalari.push({ adSoyad: data[i].ad_soyad, mesaj: e instanceof Error ? e.message : 'TCKN atanamadı.' });
    }
  }
  return sonuc;
}

export async function ogrenciGuncelle(id: string, adSoyad: string, dogumTarihi: string): Promise<Ogrenci> {
  const girdi = girdiyiDogrula(adSoyad, dogumTarihi);
  const { data, error } = await supabase.from('ogrenci').update(girdi).eq('id', id).select().single();
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
  return data;
}

export async function ogrenciSil(id: string): Promise<void> {
  const { error } = await supabase.from('ogrenci').delete().eq('id', id);
  // Yoklama kayıtları öğrenciyle birlikte silinmez (FK); yoklaması olan öğrenci bu yüzden silinemez.
  if (error?.code === '23503') throw new Error('Bu öğrencinin yoklama kaydı var; kayıt silinemez.');
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
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

export { tcknGecerliMi };
