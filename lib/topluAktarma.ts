// Toplu öğrenci ekleme: Excel'den kopyalanıp yapıştırılan (ya da elle yazılan) satırları ayrıştırır
// ve doğrular. Saf fonksiyonlardır (ağ yok); ekleme lib/ogrenciler.ts > ogrencileriTopluEkle'dedir.
//
// Her satır bir öğrenci: Ad Soyad | Doğum tarihi | TC kimlik no (isteğe bağlı).
// Sütunlar sekmeyle (Excel'den yapıştırma), noktalı virgülle ya da virgülle ayrılabilir.
// Tarih GG.AA.YYYY, GG/AA/YYYY, GG-AA-YYYY ya da YYYY-AA-GG olabilir.
import { tcknGecerliMi } from '@/lib/tckn';
import { bugununTarihi, tarihGecerliMi } from '@/lib/tarih';

export const TOPLU_AKTARMA_SINIRI = 200;

export type AktarmaSatiri = {
  satirNo: number;
  adSoyad: string;
  // YYYY-AA-GG; ayrıştırılamadıysa girilen metin.
  dogumTarihi: string;
  tckn: string | null;
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
  const gorulenTcknler = new Set<string>();
  const bugun = bugununTarihi();

  satirlar.forEach((satir, i) => {
    const [adSoyad = '', tarihMetni = '', tcknMetni = ''] = sutunlaraAyir(satir);
    // Başlık satırı (ör. "Ad Soyad | Doğum Tarihi | TC"): ilk satırda tarih yerinde rakam yoksa atlanır.
    if (i === 0 && !/\d/.test(tarihMetni) && /ad|isim/i.test(adSoyad)) return;

    const tarih = tarihiCevir(tarihMetni);
    const tckn = tcknMetni.replace(/\s/g, '') || null;
    let hata: string | null = null;
    if (!adSoyad) hata = 'Ad soyad boş';
    else if (adSoyad.length > 120) hata = 'Ad soyad çok uzun';
    else if (!tarih || !tarihGecerliMi(tarih)) hata = 'Doğum tarihi okunamadı (örn. 03.03.2019)';
    else if (tarih > bugun) hata = 'Doğum tarihi ileri bir tarih';
    else if (tckn && !tcknGecerliMi(tckn)) hata = 'TC kimlik no geçersiz';
    else if (tckn && gorulenTcknler.has(tckn)) hata = 'Bu TC kimlik no listede iki kez var';
    if (tckn) gorulenTcknler.add(tckn);

    sonuc.push({ satirNo: sonuc.length + 1, adSoyad, dogumTarihi: tarih ?? tarihMetni, tckn, hata });
  });
  return sonuc;
}
