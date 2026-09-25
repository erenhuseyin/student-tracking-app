-- Row Level Security: kurum_id bazlı izolasyon + rol bazlı erişim.
--
-- Kurallar:
--   * Tüm politikalar yalnızca `authenticated` içindir; `anon` hiçbir tabloya erişemez.
--   * `kullanici` tablosunda kaydı olmayan biri (rol = null) hiçbir satır göremez (varsayılan red).
--   * Kullanıcı oluşturma/silme istemciden yapılamaz; davet akışı (Edge Function, service role) yapar.
--   * Erişim matrisi: docs/ILERLEME.md ve bu dosya. Yeni tablo eklenirken RLS politikası
--     olmadan bırakılmaz (CLAUDE.md).
--
-- Not: FORCE ROW LEVEL SECURITY kullanılmadı. Tablo sahibi (postgres) Supabase'de zaten
-- BYPASSRLS'dir ve SECURITY DEFINER yardımcı fonksiyonlar sahip olarak çalışır; FORCE
-- bunlarda özyinelemeye yol açabilir. İstemci rolleri (anon/authenticated) RLS'e tabidir.

-- ---------------------------------------------------------------------------
-- Yetkiler
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
-- Bu migration'dan sonra eklenecek tablolar da anon'a açık gelmesin.
alter default privileges for role postgres in schema public revoke all on tables from anon;

-- kullanici: istemci yalnızca ad_soyad ve rol güncelleyebilir (rol değişimi politikalarla sınırlı).
-- kurum_id / auth_id istemciden değiştirilemez; insert/delete yalnızca service role.
revoke insert, update, delete on public.kullanici from authenticated;
grant update (ad_soyad, rol) on public.kullanici to authenticated;

alter table public.kurum enable row level security;
alter table public.kullanici enable row level security;
alter table public.sinif enable row level security;
alter table public.ogrenci enable row level security;
alter table public.veli_ogrenci enable row level security;
alter table public.ogretmen_sinif enable row level security;

-- ---------------------------------------------------------------------------
-- kurum
--   super_admin: tümü | kurum_admin, ogretmen, veli: yalnızca kendi kurumunu okur
-- ---------------------------------------------------------------------------
create policy kurum_super_admin on public.kurum
  for all to authenticated
  using ((select gizli.mevcut_rol()) = 'super_admin')
  with check ((select gizli.mevcut_rol()) = 'super_admin');

create policy kurum_kendi_kurumu_oku on public.kurum
  for select to authenticated
  using (id = (select gizli.mevcut_kurum_id()));

-- ---------------------------------------------------------------------------
-- kullanici
--   super_admin: tümü | kurum_admin: kendi kurumu (okuma + güncelleme)
--   ogretmen, veli: yalnızca kendi satırı
-- ---------------------------------------------------------------------------
create policy kullanici_super_admin on public.kullanici
  for all to authenticated
  using ((select gizli.mevcut_rol()) = 'super_admin')
  with check ((select gizli.mevcut_rol()) = 'super_admin');

create policy kullanici_kendi_satiri_oku on public.kullanici
  for select to authenticated
  using (auth_id = (select auth.uid()));

-- Kendi rolünü değiştiremez (yetki yükseltme koruması); ad_soyad serbest.
create policy kullanici_kendi_satiri_guncelle on public.kullanici
  for update to authenticated
  using (auth_id = (select auth.uid()))
  with check (
    auth_id = (select auth.uid())
    and rol = (select gizli.mevcut_rol())
  );

create policy kullanici_kurum_admin_oku on public.kullanici
  for select to authenticated
  using (
    (select gizli.mevcut_rol()) = 'kurum_admin'
    and kurum_id = (select gizli.mevcut_kurum_id())
  );

-- Kurum admini kendi kurumundaki kullanıcıları günceller ama süper admin yapamaz.
-- (Süper adminlerin kurum_id'si null olduğundan using koşulu onları zaten dışarıda bırakır.)
create policy kullanici_kurum_admin_guncelle on public.kullanici
  for update to authenticated
  using (
    (select gizli.mevcut_rol()) = 'kurum_admin'
    and kurum_id = (select gizli.mevcut_kurum_id())
  )
  with check (
    kurum_id = (select gizli.mevcut_kurum_id())
    and rol <> 'super_admin'
  );

-- ---------------------------------------------------------------------------
-- sinif
--   super_admin: tümü | kurum_admin: kendi kurumu (tümü)
--   ogretmen: atandığı sınıflar (okuma) | veli: çocuklarının sınıfı (okuma)
-- ---------------------------------------------------------------------------
create policy sinif_super_admin on public.sinif
  for all to authenticated
  using ((select gizli.mevcut_rol()) = 'super_admin')
  with check ((select gizli.mevcut_rol()) = 'super_admin');

create policy sinif_kurum_admin on public.sinif
  for all to authenticated
  using (
    (select gizli.mevcut_rol()) = 'kurum_admin'
    and kurum_id = (select gizli.mevcut_kurum_id())
  )
  with check (
    (select gizli.mevcut_rol()) = 'kurum_admin'
    and kurum_id = (select gizli.mevcut_kurum_id())
  );

create policy sinif_ogretmen_oku on public.sinif
  for select to authenticated
  using (gizli.ogretmen_sinifi_mi(id));

create policy sinif_veli_oku on public.sinif
  for select to authenticated
  using (gizli.veli_sinifi_mi(id));

-- ---------------------------------------------------------------------------
-- ogrenci
--   super_admin: tümü | kurum_admin: kendi kurumu (tümü)
--   ogretmen: atandığı sınıfların öğrencileri (okuma) | veli: bağlı çocukları (okuma)
-- ---------------------------------------------------------------------------
create policy ogrenci_super_admin on public.ogrenci
  for all to authenticated
  using ((select gizli.mevcut_rol()) = 'super_admin')
  with check ((select gizli.mevcut_rol()) = 'super_admin');

create policy ogrenci_kurum_admin on public.ogrenci
  for all to authenticated
  using (
    (select gizli.mevcut_rol()) = 'kurum_admin'
    and kurum_id = (select gizli.mevcut_kurum_id())
  )
  with check (
    (select gizli.mevcut_rol()) = 'kurum_admin'
    and kurum_id = (select gizli.mevcut_kurum_id())
  );

create policy ogrenci_ogretmen_oku on public.ogrenci
  for select to authenticated
  using (gizli.ogretmen_ogrencisi_mi(id));

create policy ogrenci_veli_oku on public.ogrenci
  for select to authenticated
  using (gizli.veli_ogrencisi_mi(id));

-- ---------------------------------------------------------------------------
-- veli_ogrenci
--   super_admin: tümü | kurum_admin: kendi kurumu (tümü)
--   ogretmen: kendi sınıflarındaki öğrencilerin bağları (okuma) | veli: kendi bağları (okuma)
-- ---------------------------------------------------------------------------
create policy veli_ogrenci_super_admin on public.veli_ogrenci
  for all to authenticated
  using ((select gizli.mevcut_rol()) = 'super_admin')
  with check ((select gizli.mevcut_rol()) = 'super_admin');

create policy veli_ogrenci_kurum_admin on public.veli_ogrenci
  for all to authenticated
  using (
    (select gizli.mevcut_rol()) = 'kurum_admin'
    and kurum_id = (select gizli.mevcut_kurum_id())
  )
  with check (
    (select gizli.mevcut_rol()) = 'kurum_admin'
    and kurum_id = (select gizli.mevcut_kurum_id())
  );

create policy veli_ogrenci_ogretmen_oku on public.veli_ogrenci
  for select to authenticated
  using (gizli.ogretmen_ogrencisi_mi(ogrenci_id));

create policy veli_ogrenci_veli_oku on public.veli_ogrenci
  for select to authenticated
  using (veli_id = (select gizli.mevcut_kullanici_id()));

-- ---------------------------------------------------------------------------
-- ogretmen_sinif
--   super_admin: tümü | kurum_admin: kendi kurumu (tümü) | ogretmen: kendi atamaları (okuma)
-- ---------------------------------------------------------------------------
create policy ogretmen_sinif_super_admin on public.ogretmen_sinif
  for all to authenticated
  using ((select gizli.mevcut_rol()) = 'super_admin')
  with check ((select gizli.mevcut_rol()) = 'super_admin');

create policy ogretmen_sinif_kurum_admin on public.ogretmen_sinif
  for all to authenticated
  using (
    (select gizli.mevcut_rol()) = 'kurum_admin'
    and kurum_id = (select gizli.mevcut_kurum_id())
  )
  with check (
    (select gizli.mevcut_rol()) = 'kurum_admin'
    and kurum_id = (select gizli.mevcut_kurum_id())
  );

create policy ogretmen_sinif_ogretmen_oku on public.ogretmen_sinif
  for select to authenticated
  using (ogretmen_id = (select gizli.mevcut_kullanici_id()));
