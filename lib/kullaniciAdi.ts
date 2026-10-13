// Veli giriş adı ("kullanıcı adı"): öğrencinin adından sunucuda üretilir (ahmet.yilmaz; çakışmada
// ahmet.yilmaz1 …), müşteri başına tekildir ve değişmez. Üretim kuralı veritabanındadır
// (migration 20261021120000 > gizli.kullanici_adi_tabani); buradaki fonksiyon yalnızca kullanıcının
// YAZDIĞINI aynı biçime getirir ("Ali.Yılmaz " -> ali.yilmaz). Sunucudaki kopyalarıyla
// (supabase/functions/veli-giris, veli-kardes-ekle) aynı kalmalı.
const HARF_CEVIRISI: Record<string, string> = {
  Ş: 's', ş: 's', Ç: 'c', ç: 'c', Ğ: 'g', ğ: 'g', İ: 'i', I: 'i', ı: 'i', Ö: 'o', ö: 'o', Ü: 'u', ü: 'u',
  Â: 'a', â: 'a', Î: 'i', î: 'i', Û: 'u', û: 'u',
};

const KULLANICI_ADI_RE = /^[a-z0-9]+(\.[a-z0-9]+)*$/;

export function kullaniciAdiniDuzelt(ham: string): string {
  return [...ham]
    .map((h) => HARF_CEVIRISI[h] ?? h)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
}

export function kullaniciAdiGecerliMi(ad: string): boolean {
  return ad.length <= 60 && KULLANICI_ADI_RE.test(ad);
}
