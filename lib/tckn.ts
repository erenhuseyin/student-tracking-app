const TCKN_RE = /^[1-9][0-9]{10}$/;

// Resmi TCKN doğrulama algoritması (biçim/checksum kontrolü — gerçek kişiye ait olup
// olmadığını doğrulamaz). Edge Function'daki (tckn-hesap-olustur) aynı fonksiyonun kopyasıdır;
// Deno ve React Native arasında paylaşılan bir paket olmadığı için burada tekrarlanır.
// Ağ ya da React Native bağımlılığı yoktur (saf fonksiyon).
export function tcknGecerliMi(tckn: string): boolean {
  if (!TCKN_RE.test(tckn)) return false;
  const d = tckn.split('').map(Number);
  const tek = d[0] + d[2] + d[4] + d[6] + d[8];
  const cift = d[1] + d[3] + d[5] + d[7];
  const d10 = (tek * 7 - cift) % 10;
  if (d10 !== d[9]) return false;
  const toplam10 = d.slice(0, 10).reduce((a, b) => a + b, 0);
  return toplam10 % 10 === d[10];
}
