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
