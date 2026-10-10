-- 1. Yoklamada "mazeretli" durumu: öğrenci gelmedi ama mazereti var (ör. veli önceden bildirdi).
--    Katılım oranında ne katıldı ne katılmadı sayılır: paydaya girmez (bkz. lib/katilim.ts).
--    Yeni enum değeri aynı transaction'da kullanılmaz.
alter type public.yoklama_durumu add value if not exists 'mazeretli';

-- 2. Öğrenciyi silmek yerine pasife alma: ayrılan öğrencinin yoklama, gelişim, ezber ve kitap
--    kayıtları korunur; öğrenci sınıf listelerinde ve yoklamada görünmez. (Yoklaması olan öğrenci
--    zaten silinemiyordu — yoklama FK'sinde cascade yok.)
alter table public.ogrenci add column aktif boolean not null default true;

create index ogrenci_sinif_aktif_idx on public.ogrenci (sinif_id) where aktif;

-- Kurum admini aktifliği değiştirebilir (ogrenci_kurum_admin politikası); öğretmenin ogrenci
-- üzerinde yazma politikası yoktur.
grant update (aktif) on public.ogrenci to authenticated;
