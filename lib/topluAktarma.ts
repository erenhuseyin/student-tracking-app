// Toplu öğrenci ekleme: Excel'den kopyalanıp yapıştırılan (ya da elle yazılan) satırları ayrıştırır
// ve doğrular. Saf fonksiyonlardır (ağ yok); ekleme lib/ogrenciler.ts > ogrencileriTopluEkle'dedir.
//
// Her satır bir öğrenci: Ad Soyad | Doğum tarihi | Cinsiyet (isteğe bağlı: K / E, Kadın / Kız / Erkek).
// Fazladan sütun varsa yok sayılır.
// Sütunlar sekmeyle (Excel'den yapıştırma), noktalı virgülle ya da virgülle ayrılabilir.
// Tarih GG.AA.YYYY, GG/AA/YYYY, GG-AA-YYYY ya da YYYY-AA-GG olabilir.
import { bugununTarihi, tarihGecerliMi } from '@/lib/tarih';
import type { Cinsiyet } from '@/lib/tipler';

export const TOPLU_AKTARMA_SINIRI = 200;

export type AktarmaSatiri = {
  satirNo: number;
  adSoyad: string;
  // YYYY-AA-GG; ayrıştırılamadıysa girilen metin.
  dogumTarihi: string;
  cinsiyet: Cinsiyet | null;
  hata: string | null;
};

function tarihiCevir(metin: string): string | null {
  const temiz = metin.trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(temiz);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(temiz);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

// Boş = belirtilmemiş; tanınmayan değer undefined (hata).
function cinsiyetiCevir(metin: string): Cinsiyet | null | undefined {
  const temiz = metin.trim().toLocaleLowerCase('tr-TR');
  if (!temiz) return null;
  if (['k', 'kadın', 'kadin', 'kız', 'kiz'].includes(temiz)) return 'kadin';
  if (['e', 'erkek'].includes(temiz)) return 'erkek';
  return undefined;
}

function sutunlaraAyir(satir: string): string[] {
  const ayirici = satir.includes('\t') ? '\t' : satir.includes(';') ? ';' : ',';
  return satir.split(ayirici).map((h) => h.trim());
}

export function aktarmaMetniniAyristir(metin: string): AktarmaSatiri[] {
  const satirlar = metin
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const sonuc: AktarmaSatiri[] = [];
  const bugun = bugununTarihi();

  satirlar.forEach((satir, i) => {
    const [adSoyad = '', tarihMetni = '', cinsiyetMetni = ''] = sutunlaraAyir(satir);
    // Başlık satırı (ör. "Ad Soyad | Doğum Tarihi"): ilk satırda tarih yerinde rakam yoksa atlanır.
    if (i === 0 && !/\d/.test(tarihMetni) && /ad|isim/i.test(adSoyad)) return;

    const tarih = tarihiCevir(tarihMetni);
    let hata: string | null = null;
    if (!adSoyad) hata = 'Ad soyad boş';
    else if (adSoyad.length > 120) hata = 'Ad soyad çok uzun';
    else if (!tarih || !tarihGecerliMi(tarih)) hata = 'Doğum tarihi okunamadı (örn. 03.03.2019)';
    else if (tarih > bugun) hata = 'Doğum tarihi ileri bir tarih';
    const cinsiyet = cinsiyetiCevir(cinsiyetMetni);
    if (!hata && cinsiyet === undefined) hata = 'Cinsiyet okunamadı (K ya da E)';

    sonuc.push({ satirNo: sonuc.length + 1, adSoyad, dogumTarihi: tarih ?? tarihMetni, cinsiyet: cinsiyet ?? null, hata });
  });
  return sonuc;
}
