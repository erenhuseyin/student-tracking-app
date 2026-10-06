// Katılım oranı hesapları. Hepsi saf fonksiyondur (veri çekmez); girdileri lib/yoklama.ts ve
// lib/dersPlani.ts sağlar.
//
// Kurallar:
//   - "Geç" derse katılmış sayılır: oran = (geldi + geç) / yoklaması alınmış ders sayısı.
//   - Yoklaması alınmamış gün öğrencinin aleyhine sayılmaz (paydaya girmez); planlı olup hiç
//     işaretlenmemiş geçmiş günler ayrıca uyarı olarak gösterilir.
//   - Plan dışı bir günde alınmış yoklama (telafi dersi) da sayılır.
import { gunEkle, haftaGunleri, isoGun } from '@/lib/tarih';
import type { SinifDersPlani, YoklamaDurumu } from '@/lib/tipler';

export type Katilim = {
  katildi: number; // geldi + geç
  gec: number;
  gelmedi: number;
  alinan: number; // yoklaması alınmış ders sayısı
  oran: number | null; // 0-1; hiç yoklama yoksa null
};

export function katilimHesapla(kayitlar: { durum: YoklamaDurumu }[]): Katilim {
  const gec = kayitlar.filter((k) => k.durum === 'gec').length;
  const gelmedi = kayitlar.filter((k) => k.durum === 'gelmedi').length;
  const alinan = kayitlar.length;
  const katildi = alinan - gelmedi;
  return { katildi, gec, gelmedi, alinan, oran: alinan === 0 ? null : katildi / alinan };
}

// '%67' ya da oran yoksa '—'.
export function yuzdeMetni(oran: number | null): string {
  return oran === null ? '—' : `%${Math.round(oran * 100)}`;
}

// '2/3 derse katıldı · 1 geç'; hiç yoklama yoksa null.
export function katilimMetni({ katildi, alinan, gec }: Katilim): string | null {
  if (alinan === 0) return null;
  return `${katildi}/${alinan} derse katıldı${gec > 0 ? ` · ${gec} geç` : ''}`;
}

// [baslangic, bitis] aralığındaki (uçlar dahil) kayıtlar.
export function araliktakiler<T extends { tarih: string }>(kayitlar: T[], baslangic: string, bitis: string): T[] {
  return kayitlar.filter((k) => k.tarih >= baslangic && k.tarih <= bitis);
}

export function haftadakiler<T extends { tarih: string }>(kayitlar: T[], pazartesi: string): T[] {
  return araliktakiler(kayitlar, pazartesi, gunEkle(pazartesi, 6));
}

// Haftalık tablonun sütunları: planlı ders günleri ile o hafta yoklaması alınmış günlerin
// birleşimi, tarih sırasıyla. Plan yoksa yalnızca yoklaması alınmış günler.
export function haftaSutunlari(
  planGunleri: number[] | null,
  kayitlar: { tarih: string }[],
  pazartesi: string,
): string[] {
  const kayitliGunler = new Set(haftadakiler(kayitlar, pazartesi).map((k) => k.tarih));
  return haftaGunleri(pazartesi).filter((t) => kayitliGunler.has(t) || (planGunleri ?? []).includes(isoGun(t)));
}

// Planlı olup bugün dahil geçmişte kalan ve sınıfta hiç kimse için yoklaması alınmamış günler.
export function islenmemisGunler(
  planGunleri: number[] | null,
  kayitlar: { tarih: string }[],
  pazartesi: string,
  bugun: string,
): string[] {
  if (!planGunleri) return [];
  const kayitliGunler = new Set(kayitlar.map((k) => k.tarih));
  return haftaGunleri(pazartesi).filter(
    (t) => t <= bugun && planGunleri.includes(isoGun(t)) && !kayitliGunler.has(t),
  );
}

// Verilen hafta (pazartesisi) için geçerli ders günleri: o haftada ya da öncesinde başlayan en
// yeni plan. Hiç plan yoksa ya da hafta ilk plandan önceyse null. `planlar` en yeni üstte olmalı
// (dersPlanlariniGetir böyle döndürür).
export function haftaninPlani(planlar: SinifDersPlani[], pazartesi: string): number[] | null {
  return planlar.find((p) => p.baslangic_tarihi <= pazartesi)?.ders_gunleri ?? null;
}
