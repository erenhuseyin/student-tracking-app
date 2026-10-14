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

// Sınıfın haftalık ders günleri; `baslangic_tarihi` haftasından itibaren geçerlidir.
export type SinifDersPlani = Tables<'sinif_ders_plani'>;

export const BILDIRIM_TIPLERI = Constants.public.Enums.bildirim_tipi;

export type BildirimTipi = (typeof BILDIRIM_TIPLERI)[number];

export type BildirimLog = Tables<'bildirim_log'>;

// Müşteri (kök kurum) düzeyinde tanımlanır; şubeler ortak kullanır.
export type GelisimKategorisi = Tables<'gelisim_kategorisi'>;

export type GelisimKaydi = Tables<'gelisim_kaydi'>;

export const DUYURU_TURLERI = Constants.public.Enums.duyuru_turu;

export type DuyuruTuru = (typeof DUYURU_TURLERI)[number];

// Kapsam: sinif_id doluysa o sınıf; boşsa kurum_id'nin tamamı (kök kurumsa şubeler dahil).
export type Duyuru = Tables<'duyuru'>;

// Sınıfın haftalık programındaki tek bir ders saati (gun: 1 = Pzt ... 7 = Paz; saatler 'SS:DD:SS').
export type DersSaati = Tables<'ders_programi'>;

// Uygulamadan yapılan öğrenci ön kaydı ya da personel başvurusu; kurum yöneticisi sonuçlandırır.
export type Basvuru = Tables<'basvuru'>;

export type BasvuruTuru = Basvuru['tur'];

export type BasvuruDurumu = Basvuru['durum'];

// Velinin "çocuğum şu gün gelmeyecek" bildirimi; öğretmen o günün yoklamasında görür.
export type DevamsizlikBildirimi = Tables<'devamsizlik_bildirimi'>;

// Velinin kuruma yazdığı tek yönlü öneri/görüş; yalnızca kurum yöneticileri okur.
export type Oneri = Tables<'oneri'>;

// İçerik takibi tanımları (müşteri düzeyinde): kademe -> ders -> konu, ezber maddeleri.
export type Kademe = Tables<'kademe'>;
export type KademeDersi = Tables<'kademe_dersi'>;
export type DersKonusu = Tables<'ders_konusu'>;
export type EzberMaddesi = Tables<'ezber_maddesi'>;

export type EzberDurumu = Tables<'ogrenci_ezber'>['durum'];
export type OgrenciEzber = Tables<'ogrenci_ezber'>;

export const KITAP_DURUMLARI = Constants.public.Enums.kitap_durumu;
export type KitapDurumu = (typeof KITAP_DURUMLARI)[number];
export type KitapOkuma = Tables<'kitap_okuma'>;


// Müşterinin tanımladığı görev: bir temel role bağlıdır, o görevdeki kişilere gizlenen menü
// öğelerini tutar (görünürlük ayarı; veri yetkisi temel rolden gelir).
export type Gorev = Tables<'gorev'>;

export const CINSIYETLER = Constants.public.Enums.cinsiyet;

// Hoca ve öğrencide isteğe bağlı; null = belirtilmemiş.
export type Cinsiyet = (typeof CINSIYETLER)[number];
