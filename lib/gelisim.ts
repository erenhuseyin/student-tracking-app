// Gelişim kaydı ve kategorileri. Öğretmen kendi öğrencisine kayıt girer ve yalnızca kendi
// girdiğini değiştirir/siler; veli çocuğunun kayıtlarını okur; kategorileri yalnızca kök
// kurumun admini yönetir. Yetkinin tamamı RLS'tedir (gelisim_kaydi_* ve gelisim_kategorisi_*
// politikaları), buradaki kontroller yalnızca anlaşılır hata mesajı içindir.
import { supabase } from '@/lib/supabase';
import { bugununTarihi, tarihGecerliMi } from '@/lib/tarih';
import type { GelisimKategorisi, GelisimKaydi } from '@/lib/tipler';

export const OLCEK_DEGERLERI = [1, 2, 3, 4, 5] as const;
const NOT_AZAMI_UZUNLUK = 2000;
const KATEGORI_AZAMI_UZUNLUK = 40;

function hataMesajinaCevir(mesaj: string, kod?: string): string {
  // Güncelleme/okuma RLS'e takılınca hata değil boş sonuç döner; `.single()` bunu PGRST116 yapar.
  if (kod === 'PGRST116') return 'Kayıt bulunamadı ya da bu işlem için yetkiniz yok.';
  if (/permission denied|rls|row-level security/i.test(mesaj)) return 'Bu işlem için yetkiniz yok.';
  if (/network|fetch/i.test(mesaj)) return 'Bağlantı sorunu, lütfen tekrar deneyin.';
  return 'İşlem yapılamadı, lütfen tekrar deneyin.';
}

// ---------------------------------------------------------------------------
// Kategoriler
// ---------------------------------------------------------------------------

function kategoriHatasi(mesaj: string, kod?: string): string {
  if (kod === '23505') return 'Bu adla bir kategori zaten var.';
  if (kod === '23503') return 'Bu kategoride kayıt var; silmek yerine pasif yapın.';
  return hataMesajinaCevir(mesaj, kod);
}

function kategoriAdiniDogrula(ad: string): string {
  const temizAd = ad.trim();
  if (!temizAd) throw new Error('Kategori adı gerekli.');
  if (temizAd.length > KATEGORI_AZAMI_UZUNLUK) {
    throw new Error(`Kategori adı en fazla ${KATEGORI_AZAMI_UZUNLUK} karakter olabilir.`);
  }
  return temizAd;
}

// RLS yalnızca çağıranın müşterisinin (kök kurumunun) kategorilerini döndürür.
export async function kategorileriGetir(yalnizcaAktif = false): Promise<GelisimKategorisi[]> {
  const sorgu = supabase.from('gelisim_kategorisi').select('*').order('sira').order('ad');
  const { data, error } = await (yalnizcaAktif ? sorgu.eq('aktif', true) : sorgu);
  if (error) throw new Error(kategoriHatasi(error.message, error.code));
  return data;
}

// kokKurumId: kategoriler şubede değil ana kurumda tanımlanır. Yeni kategori listenin sonuna eklenir.
export async function kategoriEkle(kokKurumId: string, ad: string): Promise<GelisimKategorisi> {
  const temizAd = kategoriAdiniDogrula(ad);
  const { data: sonuncu, error: siraHatasi } = await supabase
    .from('gelisim_kategorisi')
    .select('sira')
    .order('sira', { ascending: false })
    .limit(1);
  if (siraHatasi) throw new Error(kategoriHatasi(siraHatasi.message, siraHatasi.code));

  const { data, error } = await supabase
    .from('gelisim_kategorisi')
    .insert({ kurum_id: kokKurumId, ad: temizAd, sira: (sonuncu[0]?.sira ?? 0) + 1 })
    .select()
    .single();
  if (error) throw new Error(kategoriHatasi(error.message, error.code));
  return data;
}

export async function kategoriGuncelle(
  id: string,
  degisiklik: { ad?: string; aktif?: boolean },
): Promise<GelisimKategorisi> {
  const guncelleme: { ad?: string; aktif?: boolean } = {};
  if (degisiklik.ad !== undefined) guncelleme.ad = kategoriAdiniDogrula(degisiklik.ad);
  if (degisiklik.aktif !== undefined) guncelleme.aktif = degisiklik.aktif;

  const { data, error } = await supabase.from('gelisim_kategorisi').update(guncelleme).eq('id', id).select().single();
  if (error) throw new Error(kategoriHatasi(error.message, error.code));
  return data;
}

export async function kategoriSil(id: string): Promise<void> {
  const { error } = await supabase.from('gelisim_kategorisi').delete().eq('id', id);
  if (error) throw new Error(kategoriHatasi(error.message, error.code));
}

// ---------------------------------------------------------------------------
// Kayıtlar
// ---------------------------------------------------------------------------

export type GelisimKaydiGirdisi = {
  kategoriId: string | null;
  notMetni: string;
  olcekDegeri: number | null;
  tarih: string;
};

export type GelisimKaydiSatiri = GelisimKaydi & { kategori_adi: string };

function kayitHatasi(mesaj: string, kod?: string): string {
  if (kod === '23503') return 'Seçilen kategori bulunamadı.';
  return hataMesajinaCevir(mesaj, kod);
}

function girdiyiDogrula(girdi: GelisimKaydiGirdisi) {
  const notMetni = girdi.notMetni.trim();
  if (!girdi.kategoriId) throw new Error('Bir kategori seçin.');
  if (!notMetni) throw new Error('Not gerekli.');
  if (notMetni.length > NOT_AZAMI_UZUNLUK) throw new Error(`Not en fazla ${NOT_AZAMI_UZUNLUK} karakter olabilir.`);
  if (!tarihGecerliMi(girdi.tarih)) throw new Error('Tarihi gün, ay ve yıl olarak girin (örn. 20 / 09 / 2026).');
  if (girdi.tarih > bugununTarihi()) throw new Error('İleri tarihli kayıt girilemez.');
  return {
    kategori_id: girdi.kategoriId,
    not_metni: notMetni,
    olcek_degeri: girdi.olcekDegeri,
    tarih: girdi.tarih,
  };
}

// Öğrencinin kayıtları, en yeni üstte, kategori adlarıyla. İki ayrı sorgu + client-side
// birleştirme (bkz. lib/yoklama.ts); pasif kategorilerin adı da gösterilebilsin diye tüm
// kategoriler okunur.
export async function gelisimKayitlariniGetir(ogrenciId: string): Promise<GelisimKaydiSatiri[]> {
  const [{ data: kayitlar, error }, kategoriler] = await Promise.all([
    supabase
      .from('gelisim_kaydi')
      .select('*')
      .eq('ogrenci_id', ogrenciId)
      .order('tarih', { ascending: false })
      .order('olusturma_tarihi', { ascending: false }),
    kategorileriGetir(),
  ]);
  if (error) throw new Error(kayitHatasi(error.message, error.code));

  const adHaritasi = new Map(kategoriler.map((k) => [k.id, k.ad]));
  return kayitlar.map((k) => ({ ...k, kategori_adi: adHaritasi.get(k.kategori_id) ?? 'Kategori' }));
}

export async function gelisimKaydiGetir(id: string): Promise<GelisimKaydi> {
  const { data, error } = await supabase.from('gelisim_kaydi').select('*').eq('id', id).single();
  if (error) throw new Error(kayitHatasi(error.message, error.code));
  return data;
}

// kurumId öğrencinin kurumudur (şube öğrencisi ise şube), girenin değil: kök admin şube
// öğrencisine kayıt girdiğinde ikisi farklıdır.
export async function gelisimKaydiEkle(
  kurumId: string,
  ogrenciId: string,
  girenKullaniciId: string,
  girdi: GelisimKaydiGirdisi,
): Promise<GelisimKaydi> {
  const alanlar = girdiyiDogrula(girdi);
  const { data, error } = await supabase
    .from('gelisim_kaydi')
    .insert({ kurum_id: kurumId, ogrenci_id: ogrenciId, giren_kullanici_id: girenKullaniciId, ...alanlar })
    .select()
    .single();
  if (error) throw new Error(kayitHatasi(error.message, error.code));

  // Bildirim en iyi çabadır (best-effort): kayıt zaten başarılı, bildirim gönderiminde yaşanan
  // bir hata bu işlemi geçersiz kılmamalı — hata sessizce yutulur. Yalnızca yeni kayıtta
  // gönderilir; düzeltmeler veliye tekrar bildirilmez.
  supabase.functions.invoke('gelisim-bildirim-gonder', { body: { gelisim_kaydi_id: data.id } }).catch(() => {});

  return data;
}

export async function gelisimKaydiGuncelle(id: string, girdi: GelisimKaydiGirdisi): Promise<GelisimKaydi> {
  const alanlar = girdiyiDogrula(girdi);
  const { data, error } = await supabase.from('gelisim_kaydi').update(alanlar).eq('id', id).select().single();
  if (error) throw new Error(kayitHatasi(error.message, error.code));
  return data;
}

export async function gelisimKaydiSil(id: string): Promise<void> {
  const { error } = await supabase.from('gelisim_kaydi').delete().eq('id', id);
  if (error) throw new Error(kayitHatasi(error.message, error.code));
}
