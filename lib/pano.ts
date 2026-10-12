// Pano (dashboard) verisi: seçilen birimin ve altındaki tüm birimlerin toplamları.
//
// Erişim: kurum_admin müşterisinin HERHANGİ bir biriminin (ve tüm kurumun) toplamlarını görür;
// öğretmen yalnızca kendi biriminin; veli göremez. Bu, satır düzeyindeki RLS'ten ("yönetici üstünü
// ve yanını göremez") bilinçli bir istisnadır ve yalnızca toplamlar için geçerlidir: yetkiyi
// sunucudaki pano_ozeti / pano_iller fonksiyonları denetler ve yalnızca sayı ile birim adı
// döndürür (öğrenci, veli, sınıf adı döndürmez). Bkz. supabase/migrations/20261019120000_pano.sql.
//
// Toplamlar sunucuda hesaplanır; istemcide yalnızca oran ve sıralama türetilir.
import { ilAdi } from '@/lib/iller';
import { supabase } from '@/lib/supabase';
import { bugununTarihi, gunEkle, haftaBaslangici } from '@/lib/tarih';

export type PanoDonemi = 'hafta' | 'dort_hafta' | 'on_iki_hafta';

export const PANO_DONEMLERI: { deger: PanoDonemi; etiket: string }[] = [
  { deger: 'hafta', etiket: 'Bu hafta' },
  { deger: 'dort_hafta', etiket: 'Son 4 hafta' },
  { deger: 'on_iki_hafta', etiket: 'Son 12 hafta' },
];

// "Bu hafta" pazartesiden pazara; diğerleri bugün dahil geriye doğru.
export function donemAraligi(donem: PanoDonemi, bugun = bugununTarihi()): { baslangic: string; bitis: string } {
  if (donem === 'hafta') {
    const pazartesi = haftaBaslangici(bugun);
    return { baslangic: pazartesi, bitis: gunEkle(pazartesi, 6) };
  }
  return { baslangic: gunEkle(bugun, donem === 'dort_hafta' ? -27 : -83), bitis: bugun };
}

// Bir birimin kendi alt ağacını kapsayan toplamları.
export type PanoBirimi = {
  id: string;
  ad: string;
  seviye: number;
  ust_kurum_id: string | null;
  // Kendi ili, yoksa en yakın üstünün ili.
  il_kodu: number | null;
  ogrenci: number;
  sinif: number;
  ogretmen: number;
  // Doğrudan altındaki birim sayısı.
  alt_birim: number;
  katildi: number;
  gelmedi: number;
  // Dönemde planlı ders günü (sınıf × gün) ve yoklaması alınanlar.
  planli: number;
  alinan: number;
};

export type PanoOzeti = {
  bugun: string;
  birim: { id: string; ad: string; seviye: number; yol: { id: string; ad: string }[] };
  sayilar: {
    ogrenci: number;
    sinif: number;
    ogretmen: number;
    yonetici: number;
    // Altındaki tüm birimler (her seviyeden).
    alt_birim: number;
    veli_girisi_acik: number;
    pasif_ogrenci: number;
    yeni_kayit: number;
  };
  katilim: { geldi: number; gec: number; gelmedi: number; mazeretli: number };
  onceki_katilim: { katildi: number; gelmedi: number };
  // Son 12 hafta, eskiden yeniye; `hafta` haftanın pazartesisi.
  haftalik: { hafta: string; katildi: number; gelmedi: number }[];
  yoklama_duzeni: { bugun_dersi_olan: number; bugun_alinan: number; planli: number; alinan: number };
  egitim: {
    toplam_konu: number;
    islenen_konu: number;
    ezber_tamam: number;
    ezber_devam: number;
    kitap_biten: number;
    kitap_okunan: number;
    gelisim_kaydi: number;
  };
  // Seçilen birimin altındaki tüm birimler.
  birimler: PanoBirimi[];
};

export type PanoIli = {
  il_kodu: number;
  // İli doğrudan atanmış birimler (haritada ile tıklanınca seçilecek birim).
  dugumler: { id: string; ad: string }[];
  ogrenci: number;
  sinif: number;
  // İl birimlerinin doğrudan altındaki birim sayısı ("ilçe temsilciliği").
  alt_birim: number;
  katildi: number;
  gelmedi: number;
};

function hataMesajinaCevir(mesaj: string, kod?: string): string {
  if (kod === '42501') return 'Bu birimin özetini görme yetkiniz yok.';
  if (kod === 'PGRST202' || kod === '42883') return 'Pano henüz kurulmamış (veritabanı güncellemesi bekleniyor).';
  if (/network|fetch/i.test(mesaj)) return 'Bağlantı sorunu, lütfen tekrar deneyin.';
  return 'Özet alınamadı, lütfen tekrar deneyin.';
}

export async function panoOzetiniGetir(kurumId: string, donem: PanoDonemi): Promise<PanoOzeti> {
  const { baslangic, bitis } = donemAraligi(donem);
  const { data, error } = await supabase.rpc('pano_ozeti', { p_kurum_id: kurumId, p_baslangic: baslangic, p_bitis: bitis });
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
  return data as unknown as PanoOzeti;
}

// Erişim: yalnızca kurum_admin (müşterinin tamamı).
export async function panoIlleriniGetir(donem: PanoDonemi): Promise<PanoIli[]> {
  const { baslangic, bitis } = donemAraligi(donem);
  const { data, error } = await supabase.rpc('pano_iller', { p_baslangic: baslangic, p_bitis: bitis });
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
  return data as unknown as PanoIli[];
}

// Katılım oranı: katıldı / (katıldı + gelmedi). Mazeretli paydaya girmez (bkz. lib/katilim.ts).
// Hiç yoklama yoksa null.
export function oran(katildi: number, gelmedi: number): number | null {
  const toplam = katildi + gelmedi;
  return toplam === 0 ? null : katildi / toplam;
}

// Küçük sayılar yanıltmasın: oran sıralamalarına ancak bu kadar kaydı olan birim girer.
const EN_AZ_YOKLAMA = 10;
const EN_AZ_PLANLI = 5;

export type PanoEni = {
  anahtar: string;
  baslik: string;
  birim: PanoBirimi;
  deger: string;
  // 'dikkat': olumsuz uç (ör. katılımı en düşük birim).
  ton: 'olumlu' | 'dikkat';
};

// `birimler`: aynı seviyedeki (karşılaştırılabilir) birimler — seçilen birimin doğrudan altındakiler.
// `seviyeAdi`: o seviyenin küçük harfli adı ("bölge", "ilçe").
export function enleriBul(birimler: PanoBirimi[], seviyeAdi: string): PanoEni[] {
  const enBuyuk = <T,>(liste: T[], deger: (b: T) => number) =>
    liste.reduce<T | null>((en, b) => (en === null || deger(b) > deger(en) ? b : en), null);
  const yuzde = (o: number) => `%${Math.round(o * 100)}`;
  const enler: PanoEni[] = [];

  const kalabalik = enBuyuk(birimler.filter((b) => b.ogrenci > 0), (b) => b.ogrenci);
  if (kalabalik) {
    enler.push({ anahtar: 'kalabalik', baslik: `En kalabalık ${seviyeAdi}`, birim: kalabalik, deger: `${kalabalik.ogrenci} öğrenci`, ton: 'olumlu' });
  }

  const oranlilar = birimler.filter((b) => b.katildi + b.gelmedi >= EN_AZ_YOKLAMA);
  const katilim = (b: PanoBirimi) => b.katildi / (b.katildi + b.gelmedi);
  const enYuksek = enBuyuk(oranlilar, katilim);
  if (enYuksek) {
    enler.push({ anahtar: 'katilim_yuksek', baslik: 'Katılımı en yüksek', birim: enYuksek, deger: yuzde(katilim(enYuksek)), ton: 'olumlu' });
  }
  const enDusuk = enBuyuk(oranlilar, (b) => -katilim(b));
  if (enDusuk && enYuksek && enDusuk.id !== enYuksek.id) {
    enler.push({ anahtar: 'katilim_dusuk', baslik: 'Katılımı en düşük', birim: enDusuk, deger: yuzde(katilim(enDusuk)), ton: 'dikkat' });
  }

  const enCokAlt = enBuyuk(birimler.filter((b) => b.alt_birim > 0), (b) => b.alt_birim);
  if (enCokAlt) {
    enler.push({ anahtar: 'alt_birim', baslik: 'En çok alt birimi olan', birim: enCokAlt, deger: `${enCokAlt.alt_birim} birim`, ton: 'olumlu' });
  }

  const duzenliler = birimler.filter((b) => b.planli >= EN_AZ_PLANLI);
  const enDuzenli = enBuyuk(duzenliler, (b) => b.alinan / b.planli);
  if (enDuzenli) {
    enler.push({
      anahtar: 'duzenli',
      baslik: 'Yoklamayı en düzenli giren',
      birim: enDuzenli,
      deger: yuzde(enDuzenli.alinan / enDuzenli.planli),
      ton: 'olumlu',
    });
  }
  return enler;
}

// İl sıralaması tablosu ve harita ipucu için.
export function ilEtiketi(il: PanoIli): string {
  return ilAdi(il.il_kodu) || `İl ${il.il_kodu}`;
}
