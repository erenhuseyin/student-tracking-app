// Uygulama içi kısa tip adları. Kaynak: lib/veritabani.tipleri.ts (veritabanı şemasından;
// bkz. dosyanın başındaki not). Buraya elle alan yazma — şema değişince orası güncellenir.
// Alan adları DB kolonlarıyla birebir aynıdır (snake_case, ASCII: `donem`, `dogum_tarihi`).

import { Constants, type Tables } from '@/lib/veritabani.tipleri';

export const ROLLER = Constants.public.Enums.rol;

export type Rol = (typeof ROLLER)[number];

export type Kurum = Tables<'kurum'>;

export type Sinif = Tables<'sinif'>;

// Süper admin hiçbir kuruma bağlı değildir (kurum_id null); diğer roller için zorunludur.
export type Kullanici = Tables<'kullanici'>;

export type Ogrenci = Tables<'ogrenci'>;

// Veli-öğrenci ilişkisi çoka çoktur; Ogrenci üzerinde veli_id tutulmaz.
export type VeliOgrenci = Tables<'veli_ogrenci'>;

// Öğretmen-sınıf atama tablosu
export type OgretmenSinif = Tables<'ogretmen_sinif'>;

export const YOKLAMA_DURUMLARI = Constants.public.Enums.yoklama_durumu;

export type YoklamaDurumu = (typeof YOKLAMA_DURUMLARI)[number];

export type Yoklama = Tables<'yoklama'>;

export const BILDIRIM_TIPLERI = Constants.public.Enums.bildirim_tipi;

export type BildirimTipi = (typeof BILDIRIM_TIPLERI)[number];

export type BildirimLog = Tables<'bildirim_log'>;

// Müşteri (kök kurum) düzeyinde tanımlanır; şubeler ortak kullanır.
export type GelisimKategorisi = Tables<'gelisim_kategorisi'>;

export type GelisimKaydi = Tables<'gelisim_kaydi'>;
