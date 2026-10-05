-- Personel yönetimi (öğretmen / kurum yöneticisi daveti, pasifleştirme) için veri tarafı.
-- Hesap açma, kod gönderme ve pasifleştirme `personel-yonet` Edge Function'ındadır (service role);
-- sınıf ataması istemciden doğrudan `ogretmen_sinif` üzerinde yapılır (mevcut RLS yeterli).

-- ---------------------------------------------------------------------------
-- 1. kullanici: personel kolonları
-- ---------------------------------------------------------------------------
-- eposta: yöneticinin personelin giriş adresini görebilmesi için (asıl kaynak auth.users, oraya
--   istemci erişemez). YALNIZCA personelde doldurulur, velide null kalır: veli e-postası TCKN
--   içerir ve öğretmen kendi sınıfının veli satırlarını okuyabilir (kullanici_ogretmen_velisini_oku).
-- aktif: personel silinmez (yoklama.giren_kullanici_id FK'si engeller), pasifleştirilir.
-- sifre_belirlendi: daveti kabul edip şifresini belirledi mi ("davet bekliyor" göstergesi).
-- son_kod_gonderim: kod e-postası için kişi başına bekleme süresi.
--
-- Bu kolonlara istemci yazamaz: kullanici üzerindeki update yetkisi kolon bazlıdır
-- (ad_soyad, rol, expo_push_token — bkz. 20260930120000_bildirim.sql) ve değişmedi.
alter table public.kullanici
  add column eposta text,
  add column aktif boolean not null default true,
  add column sifre_belirlendi boolean not null default false,
  add column son_kod_gonderim timestamptz;

update public.kullanici k
set eposta = lower(u.email), sifre_belirlendi = true
from auth.users u
where u.id = k.auth_id and k.rol <> 'veli';

-- Veli hesapları PIN ile açılır; bu bayrak onlar için "davet bekliyor" anlamı taşımaz.
update public.kullanici set sifre_belirlendi = true where rol = 'veli';

create index kullanici_eposta_idx on public.kullanici (eposta) where eposta is not null;

-- ---------------------------------------------------------------------------
-- 2. Pasif kullanıcı hiçbir veriye erişemez
-- ---------------------------------------------------------------------------
-- Auth tarafında ban, mevcut access token'ı süresi dolana kadar geçersiz kılmaz. Tüm politikalar
-- bu fonksiyonlara (ya da bunları çağıran diğer gizli.* fonksiyonlara) dayandığı için `aktif`
-- koşulu burada eklenince pasif kullanıcının geçerli token'ı da hiçbir satır döndürmez.
-- İstisna: kullanici_kendi_satiri_oku (auth_id ile) — uygulama "hesabınız kapatılmış" diyebilsin.
create or replace function gizli.mevcut_kullanici_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select k.id from public.kullanici k where k.auth_id = (select auth.uid()) and k.aktif
$$;

create or replace function gizli.mevcut_rol()
returns public.rol
language sql
stable
security definer
set search_path = ''
as $$
  select k.rol from public.kullanici k where k.auth_id = (select auth.uid()) and k.aktif
$$;

create or replace function gizli.mevcut_kurum_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select k.kurum_id from public.kullanici k where k.auth_id = (select auth.uid()) and k.aktif
$$;

create or replace function gizli.mevcut_kok_kurum_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(k.ust_kurum_id, k.id)
  from public.kullanici c
  join public.kurum k on k.id = c.kurum_id
  where c.auth_id = (select auth.uid()) and c.aktif
$$;

create or replace function gizli.yonetilen_kurum_idleri()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select k.id
  from public.kullanici c
  join public.kurum k on k.id = c.kurum_id or k.ust_kurum_id = c.kurum_id
  where c.auth_id = (select auth.uid())
    and c.rol = 'kurum_admin'
    and c.aktif
$$;
