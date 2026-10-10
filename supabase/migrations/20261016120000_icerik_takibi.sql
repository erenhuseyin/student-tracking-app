-- İçerik takibi: kademe (müfredat) -> ders -> konu, ezber maddeleri, kitap okuma.
--
-- Tanımlar müşteri (kök kurum) düzeyindedir ve şubeler ortak kullanır (gelisim_kategorisi deseni):
--   kademe        : sınıfın izlediği müfredat (ör. Kademe I)
--   kademe_dersi  : kademenin dersleri (ör. Siyer)
--   ders_konusu   : dersin sıralı konuları
--   ezber_maddesi : kademenin ezber listesi
-- Takip kayıtları sınıfın / öğrencinin kurumunda durur:
--   sinif.kademe_id       : sınıfın izlediği kademe
--   sinif_konu_ilerleme   : sınıfın işlediği konular (satır varsa konu işlenmiştir)
--   ogrenci_ezber         : öğrencinin ezber durumu (satır yoksa "başlamadı")
--   kitap_okuma           : öğrencinin okuduğu kitaplar
--
-- Tanımları yalnızca kök kurumun admini yönetir; takibi sınıfın öğretmeni ve yönettiği kurumlarda
-- kurum admini girer; veli çocuğununkini okur. Özellik müşteri bazında açılır
-- (kurum.ozellikler.icerik_takibi) — bu yalnızca arayüzü belirler, yetkiyi RLS verir.

create type public.ezber_durumu as enum ('devam', 'tamam');
create type public.kitap_durumu as enum ('baslamadi', 'okuyor', 'bitti');

-- ---------------------------------------------------------------------------
-- 1. Tanımlar (kök kurumda)
-- ---------------------------------------------------------------------------
create table public.kademe (
  id uuid primary key default gen_random_uuid(),
  kurum_id uuid not null references public.kurum (id) on delete cascade,
  ad text not null,
  sira integer not null default 0,
  olusturma_tarihi timestamptz not null default now(),
  constraint kademe_id_kurum_id_key unique (id, kurum_id),
  constraint kademe_kurum_ad_key unique (kurum_id, ad),
  constraint kademe_ad_uzunluk check (char_length(btrim(ad)) between 1 and 60)
);

create table public.kademe_dersi (
  id uuid primary key default gen_random_uuid(),
  kurum_id uuid not null references public.kurum (id) on delete cascade,
  kademe_id uuid not null,
  ad text not null,
  sira integer not null default 0,
  constraint kademe_dersi_id_kurum_id_key unique (id, kurum_id),
  constraint kademe_dersi_kademe_ad_key unique (kademe_id, ad),
  constraint kademe_dersi_ad_uzunluk check (char_length(btrim(ad)) between 1 and 60),
  constraint kademe_dersi_kademe_ayni_kurum_fkey
    foreign key (kademe_id, kurum_id) references public.kademe (id, kurum_id) on delete cascade
);

create table public.ders_konusu (
  id uuid primary key default gen_random_uuid(),
  kurum_id uuid not null references public.kurum (id) on delete cascade,
  ders_id uuid not null,
  ad text not null,
  sira integer not null default 0,
  constraint ders_konusu_ad_uzunluk check (char_length(btrim(ad)) between 1 and 200),
  constraint ders_konusu_ders_ayni_kurum_fkey
    foreign key (ders_id, kurum_id) references public.kademe_dersi (id, kurum_id) on delete cascade
);

create table public.ezber_maddesi (
  id uuid primary key default gen_random_uuid(),
  kurum_id uuid not null references public.kurum (id) on delete cascade,
  kademe_id uuid not null,
  ad text not null,
  sira integer not null default 0,
  constraint ezber_maddesi_ad_uzunluk check (char_length(btrim(ad)) between 1 and 200),
  constraint ezber_maddesi_kademe_ayni_kurum_fkey
    foreign key (kademe_id, kurum_id) references public.kademe (id, kurum_id) on delete cascade
);

create index kademe_dersi_kademe_idx on public.kademe_dersi (kademe_id, sira);
create index ders_konusu_ders_idx on public.ders_konusu (ders_id, sira);
create index ezber_maddesi_kademe_idx on public.ezber_maddesi (kademe_id, sira);

-- Kademe yalnızca ana kurumda tanımlanır (alt tablolar bileşik FK ile aynı kurumu devralır).
create function gizli.kademe_kok_dogrula()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.kurum k where k.id = new.kurum_id and k.ust_kurum_id is not null) then
    raise exception 'Kademe yalnızca ana kurumda tanımlanır'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke all on function gizli.kademe_kok_dogrula() from public, anon;

create trigger kademe_kok
  before insert or update of kurum_id on public.kademe
  for each row execute function gizli.kademe_kok_dogrula();

alter table public.kademe enable row level security;
revoke all on public.kademe from anon;

create policy kademe_super_admin on public.kademe
  for all to authenticated
  using ((select gizli.mevcut_rol()) = 'super_admin')
  with check ((select gizli.mevcut_rol()) = 'super_admin');

create policy kademe_musteri_oku on public.kademe
  for select to authenticated
  using (kurum_id = (select gizli.mevcut_kok_kurum_id()));

create policy kademe_kok_admin on public.kademe
  for all to authenticated
  using ((select gizli.mevcut_rol()) = 'kurum_admin' and kurum_id = (select gizli.mevcut_kurum_id()))
  with check ((select gizli.mevcut_rol()) = 'kurum_admin' and kurum_id = (select gizli.mevcut_kurum_id()));

alter table public.kademe_dersi enable row level security;
revoke all on public.kademe_dersi from anon;

create policy kademe_dersi_super_admin on public.kademe_dersi
  for all to authenticated
  using ((select gizli.mevcut_rol()) = 'super_admin')
  with check ((select gizli.mevcut_rol()) = 'super_admin');

create policy kademe_dersi_musteri_oku on public.kademe_dersi
  for select to authenticated
  using (kurum_id = (select gizli.mevcut_kok_kurum_id()));

create policy kademe_dersi_kok_admin on public.kademe_dersi
  for all to authenticated
  using ((select gizli.mevcut_rol()) = 'kurum_admin' and kurum_id = (select gizli.mevcut_kurum_id()))
  with check ((select gizli.mevcut_rol()) = 'kurum_admin' and kurum_id = (select gizli.mevcut_kurum_id()));

alter table public.ders_konusu enable row level security;
revoke all on public.ders_konusu from anon;

create policy ders_konusu_super_admin on public.ders_konusu
  for all to authenticated
  using ((select gizli.mevcut_rol()) = 'super_admin')
  with check ((select gizli.mevcut_rol()) = 'super_admin');

create policy ders_konusu_musteri_oku on public.ders_konusu
  for select to authenticated
  using (kurum_id = (select gizli.mevcut_kok_kurum_id()));

create policy ders_konusu_kok_admin on public.ders_konusu
  for all to authenticated
  using ((select gizli.mevcut_rol()) = 'kurum_admin' and kurum_id = (select gizli.mevcut_kurum_id()))
  with check ((select gizli.mevcut_rol()) = 'kurum_admin' and kurum_id = (select gizli.mevcut_kurum_id()));

alter table public.ezber_maddesi enable row level security;
revoke all on public.ezber_maddesi from anon;

create policy ezber_maddesi_super_admin on public.ezber_maddesi
  for all to authenticated
  using ((select gizli.mevcut_rol()) = 'super_admin')
  with check ((select gizli.mevcut_rol()) = 'super_admin');

create policy ezber_maddesi_musteri_oku on public.ezber_maddesi
  for select to authenticated
  using (kurum_id = (select gizli.mevcut_kok_kurum_id()));

create policy ezber_maddesi_kok_admin on public.ezber_maddesi
  for all to authenticated
  using ((select gizli.mevcut_rol()) = 'kurum_admin' and kurum_id = (select gizli.mevcut_kurum_id()))
  with check ((select gizli.mevcut_rol()) = 'kurum_admin' and kurum_id = (select gizli.mevcut_kurum_id()));

-- kurum_id ve üst bağ sonradan değiştirilemez (tanım başka müşteriye/kademeye taşınamaz).
revoke insert, update on public.kademe, public.kademe_dersi, public.ders_konusu, public.ezber_maddesi from authenticated;
grant insert (kurum_id, ad, sira) on public.kademe to authenticated;
grant update (ad, sira) on public.kademe to authenticated;
grant insert (kurum_id, kademe_id, ad, sira) on public.kademe_dersi to authenticated;
grant update (ad, sira) on public.kademe_dersi to authenticated;
grant insert (kurum_id, ders_id, ad, sira) on public.ders_konusu to authenticated;
grant update (ad, sira) on public.ders_konusu to authenticated;
grant insert (kurum_id, kademe_id, ad, sira) on public.ezber_maddesi to authenticated;
grant update (ad, sira) on public.ezber_maddesi to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Sınıfın kademesi
-- ---------------------------------------------------------------------------
-- Kademe silinirse sınıfın bağı boşalır (takip kayıtları konu/madde silindiği için cascade gider).
alter table public.sinif add column kademe_id uuid references public.kademe (id) on delete set null;

-- Sınıf yalnızca kendi müşterisinin kademesini izleyebilir (sınıf şubede, kademe ana kurumda olabilir).
create function gizli.sinif_kademe_dogrula()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kademe_id is not null and not exists (
    select 1 from public.kademe k
    where k.id = new.kademe_id and k.kurum_id = gizli.kok_kurum_id(new.kurum_id)
  ) then
    raise exception 'Kademe bu kuruma ait değil'
      using errcode = 'foreign_key_violation';
  end if;
  return new;
end;
$$;

revoke all on function gizli.sinif_kademe_dogrula() from public, anon;

create trigger sinif_kademe
  before insert or update of kademe_id, kurum_id on public.sinif
  for each row execute function gizli.sinif_kademe_dogrula();

-- ---------------------------------------------------------------------------
-- 3. Sınıfın konu ilerlemesi (satır varsa konu işlenmiştir)
-- ---------------------------------------------------------------------------
create table public.sinif_konu_ilerleme (
  kurum_id uuid not null references public.kurum (id),
  sinif_id uuid not null,
  konu_id uuid not null references public.ders_konusu (id) on delete cascade,
  tamamlanma_tarihi date not null default current_date,
  giren_kullanici_id uuid references public.kullanici (id) on delete set null,
  primary key (sinif_id, konu_id),
  constraint sinif_konu_ilerleme_sinif_ayni_kurum_fkey
    foreign key (sinif_id, kurum_id) references public.sinif (id, kurum_id) on delete cascade
);

create index sinif_konu_ilerleme_kurum_idx on public.sinif_konu_ilerleme (kurum_id);

alter table public.sinif_konu_ilerleme enable row level security;
revoke all on public.sinif_konu_ilerleme from anon;
revoke insert, update on public.sinif_konu_ilerleme from authenticated;
grant insert (kurum_id, sinif_id, konu_id, tamamlanma_tarihi, giren_kullanici_id) on public.sinif_konu_ilerleme to authenticated;
grant update (tamamlanma_tarihi) on public.sinif_konu_ilerleme to authenticated;

create policy sinif_konu_ilerleme_super_admin on public.sinif_konu_ilerleme
  for all to authenticated
  using ((select gizli.mevcut_rol()) = 'super_admin')
  with check ((select gizli.mevcut_rol()) = 'super_admin');

create policy sinif_konu_ilerleme_kurum_admin on public.sinif_konu_ilerleme
  for all to authenticated
  using (kurum_id in (select gizli.yonetilen_kurum_idleri()))
  with check (kurum_id in (select gizli.yonetilen_kurum_idleri()));

create policy sinif_konu_ilerleme_ogretmen on public.sinif_konu_ilerleme
  for all to authenticated
  using (gizli.ogretmen_sinifi_mi(sinif_id))
  with check (gizli.ogretmen_sinifi_mi(sinif_id));

create policy sinif_konu_ilerleme_veli_oku on public.sinif_konu_ilerleme
  for select to authenticated
  using (gizli.veli_sinifi_mi(sinif_id));

-- ---------------------------------------------------------------------------
-- 4. Öğrencinin ezber durumu (satır yoksa "başlamadı")
-- ---------------------------------------------------------------------------
create table public.ogrenci_ezber (
  kurum_id uuid not null references public.kurum (id),
  ogrenci_id uuid not null,
  madde_id uuid not null references public.ezber_maddesi (id) on delete cascade,
  durum public.ezber_durumu not null,
  guncelleme_tarihi date not null default current_date,
  primary key (ogrenci_id, madde_id),
  constraint ogrenci_ezber_ogrenci_ayni_kurum_fkey
    foreign key (ogrenci_id, kurum_id) references public.ogrenci (id, kurum_id) on delete cascade
);

create index ogrenci_ezber_kurum_idx on public.ogrenci_ezber (kurum_id);

alter table public.ogrenci_ezber enable row level security;
revoke all on public.ogrenci_ezber from anon;
revoke insert, update on public.ogrenci_ezber from authenticated;
grant insert (kurum_id, ogrenci_id, madde_id, durum, guncelleme_tarihi) on public.ogrenci_ezber to authenticated;
grant update (durum, guncelleme_tarihi) on public.ogrenci_ezber to authenticated;

create policy ogrenci_ezber_super_admin on public.ogrenci_ezber
  for all to authenticated
  using ((select gizli.mevcut_rol()) = 'super_admin')
  with check ((select gizli.mevcut_rol()) = 'super_admin');

create policy ogrenci_ezber_kurum_admin on public.ogrenci_ezber
  for all to authenticated
  using (kurum_id in (select gizli.yonetilen_kurum_idleri()))
  with check (kurum_id in (select gizli.yonetilen_kurum_idleri()));

create policy ogrenci_ezber_ogretmen on public.ogrenci_ezber
  for all to authenticated
  using (gizli.ogretmen_ogrencisi_mi(ogrenci_id))
  with check (gizli.ogretmen_ogrencisi_mi(ogrenci_id));

create policy ogrenci_ezber_veli_oku on public.ogrenci_ezber
  for select to authenticated
  using (gizli.veli_ogrencisi_mi(ogrenci_id));

-- ---------------------------------------------------------------------------
-- 5. Kitap okuma
-- ---------------------------------------------------------------------------
create table public.kitap_okuma (
  id uuid primary key default gen_random_uuid(),
  kurum_id uuid not null references public.kurum (id),
  ogrenci_id uuid not null,
  baslik text not null,
  yazar text,
  durum public.kitap_durumu not null default 'okuyor',
  baslama_tarihi date,
  bitis_tarihi date,
  not_metni text,
  olusturma_tarihi timestamptz not null default now(),
  constraint kitap_okuma_baslik_uzunluk check (char_length(btrim(baslik)) between 1 and 160),
  constraint kitap_okuma_yazar_uzunluk check (yazar is null or char_length(btrim(yazar)) between 1 and 120),
  constraint kitap_okuma_not_uzunluk check (not_metni is null or char_length(not_metni) <= 500),
  constraint kitap_okuma_tarih_sirasi check (baslama_tarihi is null or bitis_tarihi is null or bitis_tarihi >= baslama_tarihi),
  constraint kitap_okuma_ogrenci_ayni_kurum_fkey
    foreign key (ogrenci_id, kurum_id) references public.ogrenci (id, kurum_id) on delete cascade
);

create index kitap_okuma_ogrenci_idx on public.kitap_okuma (ogrenci_id, olusturma_tarihi desc);
create index kitap_okuma_kurum_idx on public.kitap_okuma (kurum_id);

alter table public.kitap_okuma enable row level security;
revoke all on public.kitap_okuma from anon;
revoke insert, update on public.kitap_okuma from authenticated;
grant insert (kurum_id, ogrenci_id, baslik, yazar, durum, baslama_tarihi, bitis_tarihi, not_metni) on public.kitap_okuma to authenticated;
grant update (baslik, yazar, durum, baslama_tarihi, bitis_tarihi, not_metni) on public.kitap_okuma to authenticated;

create policy kitap_okuma_super_admin on public.kitap_okuma
  for all to authenticated
  using ((select gizli.mevcut_rol()) = 'super_admin')
  with check ((select gizli.mevcut_rol()) = 'super_admin');

create policy kitap_okuma_kurum_admin on public.kitap_okuma
  for all to authenticated
  using (kurum_id in (select gizli.yonetilen_kurum_idleri()))
  with check (kurum_id in (select gizli.yonetilen_kurum_idleri()));

create policy kitap_okuma_ogretmen on public.kitap_okuma
  for all to authenticated
  using (gizli.ogretmen_ogrencisi_mi(ogrenci_id))
  with check (gizli.ogretmen_ogrencisi_mi(ogrenci_id));

create policy kitap_okuma_veli_oku on public.kitap_okuma
  for select to authenticated
  using (gizli.veli_ogrencisi_mi(ogrenci_id));
