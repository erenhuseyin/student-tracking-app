-- Kurum hiyerarşisi: ana kurum (kök) -> şube. En fazla 2 seviye.
--
-- Kök kurum = müşteri. Kök kurumun kurum_admin'i kendi kurumunu VE tüm şubelerini yönetir;
-- şube admini yalnızca kendi şubesini yönetir. Yeni rol/tablo yok: veri tablolarındaki
-- kurum_id ve bileşik FK'ler aynen kalır, yalnızca "kurum admini hangi kurumları yönetir"
-- sorusunun cevabı tek kurumdan (kendi kurumu + şubeleri) kümesine genişler.

alter table public.kurum
  add column ust_kurum_id uuid references public.kurum (id),
  add constraint kurum_kendi_ustu_olamaz check (ust_kurum_id is distinct from id);

create index kurum_ust_kurum_id_idx on public.kurum (ust_kurum_id);

-- ---------------------------------------------------------------------------
-- 2 seviye sınırı: üst kurum kök olmalı; şubesi olan kurum başka kurumun şubesi olamaz.
-- ---------------------------------------------------------------------------
create function gizli.kurum_hiyerarsi_dogrula()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.ust_kurum_id is null then
    return new;
  end if;
  if exists (select 1 from public.kurum k where k.id = new.ust_kurum_id and k.ust_kurum_id is not null) then
    raise exception 'Şubenin altına şube açılamaz (en fazla 2 seviye)'
      using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.kurum k where k.ust_kurum_id = new.id) then
    raise exception 'Şubesi olan kurum başka bir kurumun şubesi yapılamaz'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke all on function gizli.kurum_hiyerarsi_dogrula() from public, anon;

create trigger kurum_hiyerarsi
  before insert or update of ust_kurum_id on public.kurum
  for each row execute function gizli.kurum_hiyerarsi_dogrula();

-- ---------------------------------------------------------------------------
-- Yardımcılar
-- ---------------------------------------------------------------------------
create function gizli.kok_kurum_id(p_kurum_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(k.ust_kurum_id, k.id) from public.kurum k where k.id = p_kurum_id
$$;

create function gizli.mevcut_kok_kurum_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(k.ust_kurum_id, k.id)
  from public.kullanici c
  join public.kurum k on k.id = c.kurum_id
  where c.auth_id = (select auth.uid())
$$;

-- Çağıran kurum_admin ise yönettiği kurumlar: kendi kurumu + (kökse) şubeleri.
-- Diğer roller için boş küme. Politikalarda `kurum_id in (select ...)` olarak kullanılır;
-- alt sorgu satıra bağlı olmadığından sorgu başına bir kez değerlendirilir.
create function gizli.yonetilen_kurum_idleri()
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
$$;

revoke all on function gizli.kok_kurum_id(uuid), gizli.mevcut_kok_kurum_id(), gizli.yonetilen_kurum_idleri()
  from public, anon;
grant execute on function gizli.kok_kurum_id(uuid), gizli.mevcut_kok_kurum_id(), gizli.yonetilen_kurum_idleri()
  to authenticated;

-- ---------------------------------------------------------------------------
-- kurum politikaları
--   Herkes kendi kurumunu ve kökünü okur (kök: marka bilgisi için).
--   Kök admin şubelerini okur, günceller, ekler, siler.
--
-- Bu tablodaki politikalar bilerek yonetilen_kurum_idleri() yerine satırın kendi
-- kolonlarıyla yazıldı: `insert ... returning` sırasında yeni satır fonksiyonun
-- snapshot'ında henüz görünmez ve select politikası yeni eklenen şubeyi reddederdi.
-- ---------------------------------------------------------------------------
drop policy kurum_kendi_kurumu_oku on public.kurum;
drop policy kurum_admin_ayarlar_guncelle on public.kurum;

create policy kurum_kendi_ve_kok_oku on public.kurum
  for select to authenticated
  using (
    id = (select gizli.mevcut_kurum_id())
    or id = (select gizli.mevcut_kok_kurum_id())
  );

create policy kurum_admin_sube_oku on public.kurum
  for select to authenticated
  using (
    (select gizli.mevcut_rol()) = 'kurum_admin'
    and ust_kurum_id = (select gizli.mevcut_kurum_id())
  );

create policy kurum_admin_guncelle on public.kurum
  for update to authenticated
  using (
    (select gizli.mevcut_rol()) = 'kurum_admin'
    and (id = (select gizli.mevcut_kurum_id()) or ust_kurum_id = (select gizli.mevcut_kurum_id()))
  )
  with check (
    (select gizli.mevcut_rol()) = 'kurum_admin'
    and (id = (select gizli.mevcut_kurum_id()) or ust_kurum_id = (select gizli.mevcut_kurum_id()))
  );

-- Şube admini kendi altına şube açmayı denerse kurum_hiyerarsi trigger'ı reddeder.
create policy kurum_admin_sube_ekle on public.kurum
  for insert to authenticated
  with check (
    (select gizli.mevcut_rol()) = 'kurum_admin'
    and ust_kurum_id = (select gizli.mevcut_kurum_id())
  );

create policy kurum_admin_sube_sil on public.kurum
  for delete to authenticated
  using (
    (select gizli.mevcut_rol()) = 'kurum_admin'
    and ust_kurum_id = (select gizli.mevcut_kurum_id())
  );

-- Kurum adı: süper admin her kurumun, kök admin yalnızca şubelerinin adını değiştirir
-- (kendi kurumunun adını değiştiremez).
create or replace function gizli.kurum_ad_degisikligi_yetki_kontrol()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cagiran_rol public.rol;
begin
  -- auth.uid() null ise (service role, SQL Editor, migration) kontrol uygulanmaz.
  if new.ad is distinct from old.ad and (select auth.uid()) is not null then
    v_cagiran_rol := gizli.mevcut_rol();
    if v_cagiran_rol = 'super_admin' then
      return new;
    end if;
    if v_cagiran_rol = 'kurum_admin' and old.ust_kurum_id = gizli.mevcut_kurum_id() then
      return new;
    end if;
    raise exception 'Bu kurumun adını değiştirme yetkiniz yok'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Kurum admini politikaları: "kendi kurumu" -> "yönettiği kurumlar"
-- ---------------------------------------------------------------------------
drop policy kullanici_kurum_admin_oku on public.kullanici;
drop policy kullanici_kurum_admin_guncelle on public.kullanici;
drop policy sinif_kurum_admin on public.sinif;
drop policy ogrenci_kurum_admin on public.ogrenci;
drop policy veli_ogrenci_kurum_admin on public.veli_ogrenci;
drop policy ogretmen_sinif_kurum_admin on public.ogretmen_sinif;
drop policy yoklama_kurum_admin on public.yoklama;
drop policy bildirim_log_kurum_admin_oku on public.bildirim_log;

create policy kullanici_kurum_admin_oku on public.kullanici
  for select to authenticated
  using (kurum_id in (select gizli.yonetilen_kurum_idleri()));

-- Süper adminlerin kurum_id'si null olduğundan using koşulu onları zaten dışarıda bırakır.
create policy kullanici_kurum_admin_guncelle on public.kullanici
  for update to authenticated
  using (kurum_id in (select gizli.yonetilen_kurum_idleri()))
  with check (
    kurum_id in (select gizli.yonetilen_kurum_idleri())
    and rol <> 'super_admin'
  );

create policy sinif_kurum_admin on public.sinif
  for all to authenticated
  using (kurum_id in (select gizli.yonetilen_kurum_idleri()))
  with check (kurum_id in (select gizli.yonetilen_kurum_idleri()));

create policy ogrenci_kurum_admin on public.ogrenci
  for all to authenticated
  using (kurum_id in (select gizli.yonetilen_kurum_idleri()))
  with check (kurum_id in (select gizli.yonetilen_kurum_idleri()));

create policy veli_ogrenci_kurum_admin on public.veli_ogrenci
  for all to authenticated
  using (kurum_id in (select gizli.yonetilen_kurum_idleri()))
  with check (kurum_id in (select gizli.yonetilen_kurum_idleri()));

create policy ogretmen_sinif_kurum_admin on public.ogretmen_sinif
  for all to authenticated
  using (kurum_id in (select gizli.yonetilen_kurum_idleri()))
  with check (kurum_id in (select gizli.yonetilen_kurum_idleri()));

create policy yoklama_kurum_admin on public.yoklama
  for all to authenticated
  using (kurum_id in (select gizli.yonetilen_kurum_idleri()))
  with check (kurum_id in (select gizli.yonetilen_kurum_idleri()));

create policy bildirim_log_kurum_admin_oku on public.bildirim_log
  for select to authenticated
  using (kurum_id in (select gizli.yonetilen_kurum_idleri()));
