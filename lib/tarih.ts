// Tarih yardımcıları. Veritabanındaki `date` kolonları 'YYYY-AA-GG' metni olarak gelir ve
// yerel gün olarak yorumlanır.

// Bugünün tarihi, yerel saatle YYYY-AA-GG (Date.toISOString() UTC kullandığı için gece
// yarısına yakın saatlerde yanlış günü verebilir; bu yüzden yerel bileşenlerden kurulur).
export function bugununTarihi(): string {
  const d = new Date();
  const yil = d.getFullYear();
  const ay = String(d.getMonth() + 1).padStart(2, '0');
  const gun = String(d.getDate()).padStart(2, '0');
  return `${yil}-${ay}-${gun}`;
}

// 'YYYY-AA-GG' -> '5 Ekim Pazartesi' (yıl, bu yıl değilse eklenir). Tarih yerel gün olarak
// yorumlanır; `new Date('YYYY-AA-GG')` UTC varsaydığı için bileşenlerden kurulur.
export function tarihiBicimle(tarih: string): string {
  const [yil, ay, gun] = tarih.split('-').map(Number);
  const d = new Date(yil, ay - 1, gun);
  return d.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
    year: yil === new Date().getFullYear() ? undefined : 'numeric',
  });
}

// Biçimi doğru ve takvimde var olan bir gün mü (31 Şubat gibi değerleri eler).
export function tarihGecerliMi(tarih: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih)) return false;
  const [yil, ay, gun] = tarih.split('-').map(Number);
  const d = new Date(yil, ay - 1, gun);
  return d.getFullYear() === yil && d.getMonth() === ay - 1 && d.getDate() === gun;
}

// ---------------------------------------------------------------------------
// Hafta hesapları. Hafta pazartesi başlar; günler ISO numarasıyla anılır (1 = Pzt ... 7 = Paz).
// ---------------------------------------------------------------------------

export const GUN_KISA_ADLARI = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'] as const;
export const GUN_ADLARI = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'] as const;

function nesneye(tarih: string): Date {
  const [yil, ay, gun] = tarih.split('-').map(Number);
  return new Date(yil, ay - 1, gun);
}

function metne(d: Date): string {
  const ay = String(d.getMonth() + 1).padStart(2, '0');
  const gun = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${ay}-${gun}`;
}

export function gunEkle(tarih: string, gunSayisi: number): string {
  const d = nesneye(tarih);
  d.setDate(d.getDate() + gunSayisi);
  return metne(d);
}

export function isoGun(tarih: string): number {
  return ((nesneye(tarih).getDay() + 6) % 7) + 1;
}

// Tarihin içinde bulunduğu haftanın pazartesisi.
export function haftaBaslangici(tarih: string): string {
  return gunEkle(tarih, 1 - isoGun(tarih));
}

// Pazartesiden pazara 7 tarih.
export function haftaGunleri(pazartesi: string): string[] {
  return Array.from({ length: 7 }, (_, i) => gunEkle(pazartesi, i));
}

// '2026-10-05' -> '5 – 11 Ekim'; ay değişiyorsa '28 Eylül – 4 Ekim'.
export function haftaAraligiBicimle(pazartesi: string): string {
  const bas = nesneye(pazartesi);
  const son = nesneye(gunEkle(pazartesi, 6));
  const ayAdi = (d: Date) => d.toLocaleDateString('tr-TR', { month: 'long' });
  const basMetni = bas.getMonth() === son.getMonth() ? String(bas.getDate()) : `${bas.getDate()} ${ayAdi(bas)}`;
  return `${basMetni} – ${son.getDate()} ${ayAdi(son)}`;
}

// 'Pzt 5' — haftalık tablo sütun başlığı.
export function gunBasligi(tarih: string): string {
  return `${GUN_KISA_ADLARI[isoGun(tarih) - 1]} ${nesneye(tarih).getDate()}`;
}

// ---------------------------------------------------------------------------
// Ay takvimi (Takvim ekranı). Ay 'YYYY-AA' metniyle anılır.
// ---------------------------------------------------------------------------

export function ayAnahtari(tarih: string): string {
  return tarih.slice(0, 7);
}

export function ayEkle(ay: string, ayFarki: number): string {
  const [yil, a] = ay.split('-').map(Number);
  return metne(new Date(yil, a - 1 + ayFarki, 1)).slice(0, 7);
}

// '2026-10' -> 'Ekim 2026'
export function ayBasligi(ay: string): string {
  const [yil, a] = ay.split('-').map(Number);
  return new Date(yil, a - 1, 1).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
}

// Ay ızgarası: ayın ilk gününün haftasının pazartesisinden başlayan, tam haftalardan oluşan günler
// (5 ya da 6 hafta). `buAy` false olan günler önceki/sonraki aya aittir.
export function ayIzgarasi(ay: string): { tarih: string; buAy: boolean }[] {
  const ilk = `${ay}-01`;
  const son = gunEkle(`${ayEkle(ay, 1)}-01`, -1);
  const bas = haftaBaslangici(ilk);
  const bitis = gunEkle(haftaBaslangici(son), 6);
  const gunler: { tarih: string; buAy: boolean }[] = [];
  for (let t = bas; t <= bitis; t = gunEkle(t, 1)) gunler.push({ tarih: t, buAy: t.startsWith(ay) });
  return gunler;
}
