// Dışa aktarma: yönetici raporlarını Excel'in açtığı CSV dosyası olarak indirir. Yalnızca web'de
// çalışır (dosyayı tarayıcı indirir); telefonda dosya yazmak native bağımlılık gerektirir ve
// raporlar zaten bilgisayardan alınır. Hangi satırların geldiğini RLS belirler (yönettiği kurumlar).
import { Platform } from 'react-native';

import { katilimHesapla, yuzdeMetni } from '@/lib/katilim';
import { KITAP_DURUMU_ETIKETLERI } from '@/lib/kitaplar';
import { kurumAdlariniGetir, kurumYolu } from '@/lib/kurumlar';
import { supabase } from '@/lib/supabase';
import { bugununTarihi, gunEkle } from '@/lib/tarih';
import { YOKLAMA_ETIKETLERI } from '@/lib/yoklama';

export const disaAktarmaDestekleniyor = Platform.OS === 'web';

type Hucre = string | number | null | undefined;

// Türkçe Excel noktalı virgülle ayrılmış dosyayı doğrudan sütunlara böler; baştaki BOM Türkçe
// karakterlerin doğru görünmesini sağlar.
export function csvOlustur(basliklar: string[], satirlar: Hucre[][]): string {
  const hucre = (h: Hucre) => {
    const metin = h === null || h === undefined ? '' : String(h);
    return /[";\n\r]/.test(metin) ? `"${metin.replace(/"/g, '""')}"` : metin;
  };
  return '\uFEFF' + [basliklar, ...satirlar].map((s) => s.map(hucre).join(';')).join('\r\n');
}

function indir(dosyaAdi: string, icerik: string): void {
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

const SAYFA = 1000;
const hata = (mesaj: string) =>
  new Error(/network|fetch/i.test(mesaj) ? 'Bağlantı sorunu, lütfen tekrar deneyin.' : 'Veri alınamadı, lütfen tekrar deneyin.');

// PostgREST tek istekte en fazla 1000 satır döndürür; hepsi sayfa sayfa toplanır.
async function tumSatirlar<T>(sayfaGetir: (bas: number, son: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const hepsi: T[] = [];
  for (let bas = 0; ; bas += SAYFA) {
    const { data, error } = await sayfaGetir(bas, bas + SAYFA - 1);
    if (error) throw hata(error.message);
    hepsi.push(...(data ?? []));
    if (!data || data.length < SAYFA) return hepsi;
  }
}

async function ortakVeri() {
  const [siniflar, ogrenciler, kurumlar] = await Promise.all([
    tumSatirlar((b, s) => supabase.from('sinif').select('id, ad').order('ad').range(b, s)),
    tumSatirlar((b, s) =>
      supabase.from('ogrenci').select('id, ad_soyad, sinif_id, kurum_id, dogum_tarihi, tckn, aktif').order('ad_soyad').range(b, s),
    ),
    kurumAdlariniGetir(),
  ]);
  // Birim: kökten öğrencinin kurumuna yol ("Genel Merkez › İstanbul › İkitelli").
  const birim = (kurumId: string) => kurumYolu(kurumlar, kurumId);
  return { ogrenciler, birim, sinifAdi: new Map(siniflar.map((x) => [x.id, x.ad])) };
}

export type RaporTuru = 'ogrenciler' | 'yoklama' | 'katilim' | 'ezber' | 'kitap';

export const RAPORLAR: { tur: RaporTuru; baslik: string; aciklama: string; icerik?: true }[] = [
  { tur: 'ogrenciler', baslik: 'Öğrenci listesi', aciklama: 'Tüm öğrenciler: sınıf, doğum tarihi, TC, durum' },
  { tur: 'yoklama', baslik: 'Yoklama kayıtları (son 30 gün)', aciklama: 'Gün gün: öğrenci, sınıf, durum' },
  { tur: 'katilim', baslik: 'Katılım özeti (son 30 gün)', aciklama: 'Öğrenci başına katıldı / gelmedi / geç / mazeretli ve oran' },
  { tur: 'ezber', baslik: 'Ezber özeti', aciklama: 'Öğrenci başına tamamlanan ve devam eden madde sayısı', icerik: true },
  { tur: 'kitap', baslik: 'Kitap kayıtları', aciklama: 'Öğrenci, kitap, yazar, durum, tarihler', icerik: true },
];

// Raporu hazırlar ve indirir; satır sayısını döndürür.
export async function raporuIndir(tur: RaporTuru): Promise<number> {
  const bugun = bugununTarihi();
  const baslangic = gunEkle(bugun, -30);
  const { ogrenciler, birim, sinifAdi } = await ortakVeri();
  const ogrenci = new Map(ogrenciler.map((o) => [o.id, o]));
  const sinifi = (ogrenciId: string) => sinifAdi.get(ogrenci.get(ogrenciId)?.sinif_id ?? '') ?? '';
  const birimi = (ogrenciId: string) => birim(ogrenci.get(ogrenciId)?.kurum_id ?? '');
  let basliklar: string[];
  let satirlar: Hucre[][];

  if (tur === 'ogrenciler') {
    basliklar = ['Ad Soyad', 'Birim', 'Sınıf', 'Doğum Tarihi', 'TC Kimlik No', 'Durum'];
    satirlar = ogrenciler.map((o) => [o.ad_soyad, birim(o.kurum_id), sinifAdi.get(o.sinif_id) ?? '', o.dogum_tarihi, o.tckn, o.aktif ? 'Aktif' : 'Pasif']);
  } else if (tur === 'yoklama' || tur === 'katilim') {
    const yoklamalar = await tumSatirlar((b, s) =>
      supabase.from('yoklama').select('ogrenci_id, tarih, durum').gte('tarih', baslangic).order('tarih').range(b, s),
    );
    if (tur === 'yoklama') {
      basliklar = ['Tarih', 'Ad Soyad', 'Birim', 'Sınıf', 'Durum'];
      satirlar = yoklamalar.map((y) => [y.tarih, ogrenci.get(y.ogrenci_id)?.ad_soyad ?? '', birimi(y.ogrenci_id), sinifi(y.ogrenci_id), YOKLAMA_ETIKETLERI[y.durum]]);
    } else {
      basliklar = ['Ad Soyad', 'Birim', 'Sınıf', 'Katıldı', 'Gelmedi', 'Geç', 'Mazeretli', 'Katılım'];
      satirlar = ogrenciler
        .filter((o) => o.aktif)
        .map((o) => {
          const k = katilimHesapla(yoklamalar.filter((y) => y.ogrenci_id === o.id));
          return [o.ad_soyad, birim(o.kurum_id), sinifAdi.get(o.sinif_id) ?? '', k.katildi, k.gelmedi, k.gec, k.mazeretli, yuzdeMetni(k.oran)];
        });
    }
  } else if (tur === 'ezber') {
    const ezberler = await tumSatirlar((b, s) => supabase.from('ogrenci_ezber').select('ogrenci_id, durum').range(b, s));
    basliklar = ['Ad Soyad', 'Birim', 'Sınıf', 'Tamamlanan', 'Devam Eden'];
    satirlar = ogrenciler
      .filter((o) => o.aktif)
      .map((o) => {
        const kendi = ezberler.filter((e) => e.ogrenci_id === o.id);
        return [o.ad_soyad, birim(o.kurum_id), sinifAdi.get(o.sinif_id) ?? '', kendi.filter((e) => e.durum === 'tamam').length, kendi.filter((e) => e.durum === 'devam').length];
      });
  } else {
    const kitaplar = await tumSatirlar((b, s) =>
      supabase.from('kitap_okuma').select('ogrenci_id, baslik, yazar, durum, baslama_tarihi, bitis_tarihi').order('olusturma_tarihi').range(b, s),
    );
    basliklar = ['Ad Soyad', 'Birim', 'Sınıf', 'Kitap', 'Yazar', 'Durum', 'Başlama', 'Bitiş'];
    satirlar = kitaplar.map((k) => [
      ogrenci.get(k.ogrenci_id)?.ad_soyad ?? '',
      birimi(k.ogrenci_id),
      sinifi(k.ogrenci_id),
      k.baslik,
      k.yazar,
      KITAP_DURUMU_ETIKETLERI[k.durum],
      k.baslama_tarihi,
      k.bitis_tarihi,
    ]);
  }

  indir(`${tur}-${bugun}.csv`, csvOlustur(basliklar, satirlar));
  return satirlar.length;
}
