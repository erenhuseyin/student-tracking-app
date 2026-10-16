// Dışa aktarma: yönetici listelerini ve raporlarını ("Rapor İndir") Excel'in açtığı CSV dosyası
// olarak indirir. Yalnızca web'de çalışır (dosyayı tarayıcı indirir); telefonda dosya yazmak native
// bağımlılık gerektirir ve raporlar zaten bilgisayardan alınır. Hangi satırların geldiğini RLS
// belirler (yönettiği kurumlar). Rapor verisi: lib/raporlar.ts.
import { Platform } from 'react-native';

import { type DersRaporuSatiri, ilerlemeOrani } from '@/lib/dersRaporu';
import { bugununTarihi } from '@/lib/tarih';

export const disaAktarmaDestekleniyor = Platform.OS === 'web';

export type Hucre = string | number | null | undefined;

// Türkçe Excel noktalı virgülle ayrılmış dosyayı doğrudan sütunlara böler; baştaki BOM Türkçe
// karakterlerin doğru görünmesini sağlar.
export function csvOlustur(basliklar: string[], satirlar: Hucre[][]): string {
  const hucre = (h: Hucre) => {
    const metin = h === null || h === undefined ? '' : String(h);
    return /[";\n\r]/.test(metin) ? `"${metin.replace(/"/g, '""')}"` : metin;
  };
  return '\uFEFF' + [basliklar, ...satirlar].map((s) => s.map(hucre).join(';')).join('\r\n');
}

// Ekranda süzülmüş bir listeyi indirir: `<ad>-<bugün>.csv`. Satır sayısını döndürür.
export function listeyiIndir(ad: string, basliklar: string[], satirlar: Hucre[][]): number {
  indir(`${ad}-${bugununTarihi()}.csv`, csvOlustur(basliklar, satirlar));
  return satirlar.length;
}

export function indir(dosyaAdi: string, icerik: string): void {
  if (!disaAktarmaDestekleniyor) throw new Error('Dışa aktarma yalnızca bilgisayardan (web) yapılabilir.');
  const baglanti = document.createElement('a');
  const adres = URL.createObjectURL(new Blob([icerik], { type: 'text/csv;charset=utf-8' }));
  baglanti.href = adres;
  baglanti.download = dosyaAdi;
  document.body.appendChild(baglanti);
  baglanti.click();
  baglanti.remove();
  URL.revokeObjectURL(adres);
}

// Ders raporu (sınıf başına); Ders Raporu ekranı süzülmüş satırlarla da kullanır.
export function dersRaporuCsv(satirlar: DersRaporuSatiri[], birim: (kurumId: string) => string): string {
  return csvOlustur(
    ['Sınıf', 'Birim', 'Kademe', 'Hoca', 'Öğrenci', 'İşlenen Konu', 'Toplam Konu', 'İlerleme', 'Son İşlenme', 'Okunmamış Not'],
    satirlar.map((s) => {
      const oran = ilerlemeOrani(s);
      return [
        s.sinif_adi,
        birim(s.kurum_id),
        s.kademe_adi ?? '',
        s.hocalar ?? '',
        s.ogrenci_sayisi,
        s.islenen_konu,
        s.toplam_konu,
        oran === null ? '' : `%${Math.round(oran * 100)}`,
        s.son_islenme ?? '',
        s.okunmamis_not,
      ];
    }),
  );
}

const SAYFA = 1000;
const hata = (mesaj: string) =>
  new Error(/network|fetch/i.test(mesaj) ? 'Bağlantı sorunu, lütfen tekrar deneyin.' : 'Veri alınamadı, lütfen tekrar deneyin.');

// PostgREST tek istekte en fazla 1000 satır döndürür; hepsi sayfa sayfa toplanır.
export async function tumSatirlar<T>(sayfaGetir: (bas: number, son: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const hepsi: T[] = [];
  for (let bas = 0; ; bas += SAYFA) {
    const { data, error } = await sayfaGetir(bas, bas + SAYFA - 1);
    if (error) throw hata(error.message);
    hepsi.push(...(data ?? []));
    if (!data || data.length < SAYFA) return hepsi;
  }
}
