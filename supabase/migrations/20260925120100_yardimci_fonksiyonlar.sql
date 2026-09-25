-- RLS politikalarının kullandığı yardımcı fonksiyonlar.
--
-- SECURITY DEFINER olmalarının sebebi: kullanici tablosunun politikası kendi tablosunu
-- sorgularsa RLS sonsuz özyinelemeye girer. Fonksiyonlar API'ye açık olmayan `gizli`
-- şemasındadır ve search_path boş bırakılarak (şema adı açık yazılır) search_path
-- saldırısına karşı korunur.
--
-- `(select auth.uid())` deseni: Postgres bunu sorgu başına bir kez değerlendirir.

create function gizli.mevcut_kullanici_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select k.id from public.kullanici k where k.auth_id = (select auth.uid())
$$;

create function gizli.mevcut_rol()
returns public.rol
language sql
stable
security definer
set search_path = ''
as $$
  select k.rol from public.kullanici k where k.auth_id = (select auth.uid())
$$;

create function gizli.mevcut_kurum_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select k.kurum_id from public.kullanici k where k.auth_id = (select auth.uid())
$$;

-- Öğretmen bu sınıfa atanmış mı?
create function gizli.ogretmen_sinifi_mi(p_sinif_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.ogretmen_sinif os
    where os.sinif_id = p_sinif_id
      and os.ogretmen_id = gizli.mevcut_kullanici_id()
  )
$$;

-- Öğretmen bu öğrencinin sınıfına atanmış mı?
create function gizli.ogretmen_ogrencisi_mi(p_ogrenci_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.ogrenci o
    join public.ogretmen_sinif os on os.sinif_id = o.sinif_id
    where o.id = p_ogrenci_id
      and os.ogretmen_id = gizli.mevcut_kullanici_id()
  )
$$;

-- Veli bu öğrencinin velisi mi?
create function gizli.veli_ogrencisi_mi(p_ogrenci_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.veli_ogrenci vo
    where vo.ogrenci_id = p_ogrenci_id
      and vo.veli_id = gizli.mevcut_kullanici_id()
  )
$$;

-- Velinin çocuklarından biri bu sınıfta mı?
create function gizli.veli_sinifi_mi(p_sinif_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.ogrenci o
    join public.veli_ogrenci vo on vo.ogrenci_id = o.id
    where o.sinif_id = p_sinif_id
      and vo.veli_id = gizli.mevcut_kullanici_id()
  )
$$;

-- Yalnızca giriş yapmış kullanıcılar çağırabilir (anon yok).
-- Fonksiyonlar varsayılan olarak PUBLIC'e açıktır; önce herkesten geri alınır.
revoke all on schema gizli from public;
revoke all on all functions in schema gizli from public, anon;
grant usage on schema gizli to authenticated;
grant execute on function
  gizli.mevcut_kullanici_id(),
  gizli.mevcut_rol(),
  gizli.mevcut_kurum_id(),
  gizli.ogretmen_sinifi_mi(uuid),
  gizli.ogretmen_ogrencisi_mi(uuid),
  gizli.veli_ogrencisi_mi(uuid),
  gizli.veli_sinifi_mi(uuid)
to authenticated;
