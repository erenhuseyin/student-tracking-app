-- Çekirdek şema: kurum, kullanici, sinif, ogrenci, veli_ogrenci, ogretmen_sinif
--
-- Multi-tenant kuralı: her tabloda kurum_id vardır. Kurumlar arası yanlış bağı
-- veritabanı seviyesinde engellemek için bağ kurulan tablolarda bileşik FK
-- (x_id, kurum_id) kullanılır. RLS politikaları 20260925120200_rls.sql içindedir.

-- API'ye açık olmayan yardımcı şema (fonksiyonlar 20260925120100'de)
create schema if not exists gizli;

create type public.rol as enum ('super_admin', 'kurum_admin', 'ogretmen', 'veli');

-- ---------------------------------------------------------------------------
-- kurum
-- ---------------------------------------------------------------------------
create table public.kurum (
  id uuid primary key default gen_random_uuid(),
  ad text not null,
  ayarlar jsonb not null default '{}'::jsonb,
  olusturma_tarihi timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- kullanici (Supabase auth kullanıcısının uygulama profili)
-- Süper admin hiçbir kuruma bağlı değildir; diğer roller için kurum_id zorunludur.
-- ---------------------------------------------------------------------------
create table public.kullanici (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid not null unique references auth.users (id) on delete cascade,
  rol public.rol not null,
  kurum_id uuid references public.kurum (id),
  ad_soyad text not null,
  olusturma_tarihi timestamptz not null default now(),
  constraint kullanici_rol_kurum_tutarli check ((rol = 'super_admin') = (kurum_id is null)),
  constraint kullanici_id_kurum_id_key unique (id, kurum_id)
);

create index kullanici_kurum_id_idx on public.kullanici (kurum_id);

-- ---------------------------------------------------------------------------
-- sinif
-- ---------------------------------------------------------------------------
create table public.sinif (
  id uuid primary key default gen_random_uuid(),
  kurum_id uuid not null references public.kurum (id),
  ad text not null,
  donem text not null,
  olusturma_tarihi timestamptz not null default now(),
  constraint sinif_id_kurum_id_key unique (id, kurum_id)
);

create index sinif_kurum_id_idx on public.sinif (kurum_id);

-- ---------------------------------------------------------------------------
-- ogrenci
-- ---------------------------------------------------------------------------
create table public.ogrenci (
  id uuid primary key default gen_random_uuid(),
  kurum_id uuid not null references public.kurum (id),
  sinif_id uuid not null,
  ad_soyad text not null,
  dogum_tarihi date not null,
  olusturma_tarihi timestamptz not null default now(),
  constraint ogrenci_id_kurum_id_key unique (id, kurum_id),
  constraint ogrenci_sinif_ayni_kurum_fkey
    foreign key (sinif_id, kurum_id) references public.sinif (id, kurum_id)
);

create index ogrenci_kurum_id_idx on public.ogrenci (kurum_id);
create index ogrenci_sinif_id_idx on public.ogrenci (sinif_id);

-- ---------------------------------------------------------------------------
-- veli_ogrenci (çoka çok: bir veli birden fazla çocuk, bir öğrenci birden fazla veli)
-- Spesifikasyonda kurum_id yok; "her tabloda kurum_id" kuralı gereği eklendi.
-- ---------------------------------------------------------------------------
create table public.veli_ogrenci (
  kurum_id uuid not null references public.kurum (id),
  veli_id uuid not null,
  ogrenci_id uuid not null,
  olusturma_tarihi timestamptz not null default now(),
  primary key (veli_id, ogrenci_id),
  constraint veli_ogrenci_veli_ayni_kurum_fkey
    foreign key (veli_id, kurum_id) references public.kullanici (id, kurum_id) on delete cascade,
  constraint veli_ogrenci_ogrenci_ayni_kurum_fkey
    foreign key (ogrenci_id, kurum_id) references public.ogrenci (id, kurum_id) on delete cascade
);

create index veli_ogrenci_kurum_id_idx on public.veli_ogrenci (kurum_id);
create index veli_ogrenci_ogrenci_id_idx on public.veli_ogrenci (ogrenci_id);

-- ---------------------------------------------------------------------------
-- ogretmen_sinif (atama tablosu)
-- ---------------------------------------------------------------------------
create table public.ogretmen_sinif (
  kurum_id uuid not null references public.kurum (id),
  ogretmen_id uuid not null,
  sinif_id uuid not null,
  olusturma_tarihi timestamptz not null default now(),
  primary key (ogretmen_id, sinif_id),
  constraint ogretmen_sinif_ogretmen_ayni_kurum_fkey
    foreign key (ogretmen_id, kurum_id) references public.kullanici (id, kurum_id) on delete cascade,
  constraint ogretmen_sinif_sinif_ayni_kurum_fkey
    foreign key (sinif_id, kurum_id) references public.sinif (id, kurum_id) on delete cascade
);

create index ogretmen_sinif_kurum_id_idx on public.ogretmen_sinif (kurum_id);
create index ogretmen_sinif_sinif_id_idx on public.ogretmen_sinif (sinif_id);

-- ---------------------------------------------------------------------------
-- Rol doğrulama trigger'ları
-- FK yalnızca "bu kurumda bir kullanıcı var" der; rolünü doğrulamak için trigger gerekir.
-- ---------------------------------------------------------------------------
create function gizli.veli_rolu_dogrula()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.kullanici k where k.id = new.veli_id and k.rol = 'veli'
  ) then
    raise exception 'veli_ogrenci.veli_id rolü "veli" olan bir kullanıcıyı göstermeli'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger veli_ogrenci_veli_rolu
  before insert or update of veli_id on public.veli_ogrenci
  for each row execute function gizli.veli_rolu_dogrula();

create function gizli.ogretmen_rolu_dogrula()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.kullanici k where k.id = new.ogretmen_id and k.rol = 'ogretmen'
  ) then
    raise exception 'ogretmen_sinif.ogretmen_id rolü "ogretmen" olan bir kullanıcıyı göstermeli'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger ogretmen_sinif_ogretmen_rolu
  before insert or update of ogretmen_id on public.ogretmen_sinif
  for each row execute function gizli.ogretmen_rolu_dogrula();

-- Bağı olan bir kullanıcının rolü değiştirilirse bağlar sessizce geçersiz kalır; engelle.
create function gizli.rol_degisikligi_bagi_koru()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.rol is distinct from old.rol and (
    exists (select 1 from public.veli_ogrenci where veli_id = old.id)
    or exists (select 1 from public.ogretmen_sinif where ogretmen_id = old.id)
  ) then
    raise exception 'Öğrenci/sınıf bağı olan kullanıcının rolü değiştirilemez; önce bağları kaldırın'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger kullanici_rol_degisikligi
  before update of rol on public.kullanici
  for each row execute function gizli.rol_degisikligi_bagi_koru();
