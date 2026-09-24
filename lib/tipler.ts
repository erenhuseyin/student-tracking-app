// Temel entity tipleri — docs/proje-spesifikasyonu.md Bölüm 4.
// Alan adları veritabanı kolonlarıyla birebir aynıdır (snake_case, ASCII).

export const ROLLER = ['super_admin', 'kurum_admin', 'ogretmen', 'veli'] as const;

export type Rol = (typeof ROLLER)[number];

export type Kurum = {
  id: string;
  ad: string;
  // Kuruma özel ayarlar; plan/abonelik alanları ileride buraya ya da ayrı kolonlara eklenebilir.
  ayarlar: Record<string, unknown> | null;
};

export type Sinif = {
  id: string;
  kurum_id: string;
  ad: string;
  donem: string;
};

export type Kullanici = {
  id: string;
  // Supabase auth kullanıcısının id'si
  auth_id: string;
  rol: Rol;
  // Süper admin hiçbir kuruma bağlı değildir; diğer roller için zorunlu.
  kurum_id: string | null;
  ad_soyad: string;
};

export type Ogrenci = {
  id: string;
  kurum_id: string;
  sinif_id: string;
  ad_soyad: string;
  // ISO tarih (YYYY-MM-DD)
  dogum_tarihi: string;
};

// Not: Veli-öğrenci ilişkisi çoka çoktur (veli_ogrenci tablosu); Ogrenci üzerinde veli_id tutulmaz.
