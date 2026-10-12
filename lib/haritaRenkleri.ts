// Pano haritasının sıralı renk ölçeği: tek ton, 5 basamak. Açık temada düşük değer açık, yüksek
// değer koyudur; karanlık temada tersine, yüksek değer parlaktır (koyu zeminde öne çıkan odur).
// Verisi olmayan il nötr kalır. Saf fonksiyonlar; hem harita hem lejant kullanır.
import type { PanoIli } from '@/lib/pano';
import type { Tema } from '@/lib/tema';

export type HaritaOlcusu = 'katilim' | 'ogrenci';
export const BASAMAK_SAYISI = 5;

function ayristir(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const tam = h.length === 3 ? [...h].map((k) => k + k).join('') : h;
  return [0, 2, 4].map((i) => parseInt(tam.slice(i, i + 2), 16)) as [number, number, number];
}

function karistir(a: string, b: string, t: number): string {
  const [x, y] = [ayristir(a), ayristir(b)];
  return `#${x.map((k, i) => Math.round(k + (y[i] - k) * t).toString(16).padStart(2, '0')).join('')}`;
}

// 0 (en düşük) … 4 (en yüksek) basamağın rengi.
export function basamakRengi(tema: Tema, basamak: number): string {
  const t = basamak / (BASAMAK_SAYISI - 1);
  return tema.mod === 'acik'
    ? karistir(tema.renkler.anaSoluk, tema.renkler.ana, t)
    : karistir(karistir(tema.renkler.yuzey, tema.renkler.anaParlak, 0.35), karistir(tema.renkler.anaParlak, '#FFFFFF', 0.45), t);
}

export function veriYokRengi(tema: Tema): string {
  // Kart zemininden ayırt edilebilen, ölçekle karışmayan nötr gri.
  return tema.mod === 'acik' ? tema.renkler.ayirici : karistir(tema.renkler.yuzey, tema.renkler.metinIkincil, 0.22);
}

// Katılım için sabit eşikler (iller arası ve dönemler arası aynı renk aynı anlama gelsin diye).
const KATILIM_ESIKLERI = [0.5, 0.65, 0.8, 0.9];
export const KATILIM_BASAMAK_ETIKETLERI = ['%50 altı', '%50–64', '%65–79', '%80–89', '%90 ve üstü'];

// İlin basamağı; verisi yoksa null. Öğrenci sayısında basamaklar en kalabalık ile göre eşit aralıklıdır.
export function ilBasamagi(il: PanoIli, olcu: HaritaOlcusu, enCokOgrenci: number): number | null {
  if (olcu === 'katilim') {
    const toplam = il.katildi + il.gelmedi;
    if (toplam === 0) return null;
    const o = il.katildi / toplam;
    return KATILIM_ESIKLERI.filter((e) => o >= e).length;
  }
  if (il.ogrenci === 0 || enCokOgrenci === 0) return null;
  const adim = Math.max(1, Math.ceil(enCokOgrenci / BASAMAK_SAYISI));
  return Math.min(BASAMAK_SAYISI - 1, Math.floor((il.ogrenci - 1) / adim));
}

export function ogrenciBasamakEtiketleri(enCokOgrenci: number): string[] {
  const adim = Math.max(1, Math.ceil(enCokOgrenci / BASAMAK_SAYISI));
  return Array.from({ length: BASAMAK_SAYISI }, (_, i) =>
    i === BASAMAK_SAYISI - 1 ? `${i * adim + 1}+` : `${i === 0 ? 1 : i * adim + 1}–${(i + 1) * adim}`,
  );
}
