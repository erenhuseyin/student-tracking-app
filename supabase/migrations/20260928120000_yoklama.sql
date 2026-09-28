-- Yoklama: öğretmen girer, veli görür. Spec Bölüm 4: yoklama — id, ogrenci_id, tarih,
-- durum (geldi/gelmedi/geç), giren_kullanici_id. Diğer tablolardaki desen gereği kurum_id
-- eklendi ve kurumlar arası yanlış bağ bileşik FK ile engellendi.

create type public.yoklama_durumu as enum ('geldi', 'gelmedi', 'gec');

create table public.yoklama (
  id uuid primary key default gen_random_uuid(),
  kurum_id uuid not null references public.kurum (id),
  ogrenci_id uuid not null,
  tarih date not null,
  durum public.yoklama_durumu not null,
  giren_kullanici_id uuid not null,
  olusturma_tarihi timestamptz not null default now(),
  -- Bir öğrenciye günde tek kayıt; öğretmen aynı günü tekrar işaretlerse upsert güncellenir.
  constraint yoklama_ogrenci_tarih_key unique (ogrenci_id, tarih),
  constraint yoklama_ogrenci_ayni_kurum_fkey
    foreign key (ogrenci_id, kurum_id) references public.ogrenci (id, kurum_id)
);

-- Devamı (giren_kullanici_id FK'si, index'ler, RLS, politikalar): 20260928120100_yoklama_tamamla.sql
