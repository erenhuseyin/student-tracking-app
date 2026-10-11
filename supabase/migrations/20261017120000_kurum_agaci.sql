-- Kurum ağacı: 2 seviyeden (ana kurum -> şube) 4 seviyeye (ör. Genel Merkez -> Bölge -> İlçe -> Semt).
--
-- Roller değişmez. kurum_admin'in yetki alanı bağlı olduğu düğüm ve o düğümün altındaki
-- tüm düğümlerdir. Veri tablolarındaki yönetici politikaları zaten
-- `kurum_id in (select gizli.yonetilen_kurum_idleri())` ile yazılı olduğundan yalnızca bu
-- fonksiyonun tanımı değişir; politikalar tek tek yeniden yazılmaz.
--
-- Ağaç, her satırda saklanan türetilmiş üç kolonla sorgulanır (özyinelemeli sorgu yok):
--   kok_kurum_id : müşteri (kök kurum)
--   seviye       : 1 (kök) .. 4
--   yol          : kökten kendisine kadar düğümler, kendisi dahil
-- Üçünü de trigger doldurur; istemcinin yazdığı değer ezilir.

alter table public.kurum
  add column kok_kurum_id uuid references public.kurum (id),
  add column seviye smallint,
  add column yol uuid[];

update public.kurum set kok_kurum_id = id, seviye = 1, yol = array[id] where ust_kurum_id is null;
update public.kurum set kok_kurum_id = ust_kurum_id, seviye = 2, yol = array[ust_kurum_id, id] where ust_kurum_id is not null;

alter table public.kurum
  alter column kok_kurum_id set not null,
  alter column seviye set not null,
  alter column yol set not null,
  add constraint kurum_seviye_araligi check (seviye between 1 and 4);

create index kurum_kok_kurum_id_idx on public.kurum (kok_kurum_id);
create index kurum_yol_idx on public.kurum using gin (yol);

-- ---------------------------------------------------------------------------
-- Türetilmiş kolonlar + 4 seviye sınırı. Altı olan düğüm taşınamaz (altındakilerin
-- yol'u ve veri tablolarındaki kok_kurum_id eskirdi).
-- ---------------------------------------------------------------------------
create or replace function gizli.kurum_hiyerarsi_dogrula()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ust public.kurum;
begin
  if tg_op = 'UPDATE' and exists (select 1 from public.kurum k where k.ust_kurum_id = new.id) then
    raise exception 'Altında birim olan kurum taşınamaz'
      using errcode = 'check_violation';
  end if;

  if new.ust_kurum_id is null then
    new.kok_kurum_id := new.id;
    new.seviye := 1;
    new.yol := array[new.id];
    return new;
  end if;

  select * into v_ust from public.kurum k where k.id = new.ust_kurum_id;
  if not found then
    raise exception 'Üst kurum bulunamadı'
      using errcode = 'foreign_key_violation';
  end if;
  if new.id = any (v_ust.yol) then
    raise exception 'Kurum kendi altına bağlanamaz'
      using errcode = 'check_violation';
  end if;
  if v_ust.seviye >= 4 then
    raise exception 'Bu birimin altına yeni birim açılamaz (en fazla 4 seviye)'
      using errcode = 'check_violation';
  end if;

  new.kok_kurum_id := v_ust.kok_kurum_id;
  new.seviye := v_ust.seviye + 1;
  new.yol := v_ust.yol || new.id;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Yardımcılar
-- ---------------------------------------------------------------------------
create or replace function gizli.kok_kurum_id(p_kurum_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select k.kok_kurum_id from public.kurum k where k.id = p_kurum_id
$$;

create or replace function gizli.mevcut_kok_kurum_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select k.kok_kurum_id
  from public.kullanici c
  join public.kurum k on k.id = c.kurum_id
  where c.auth_id = (select auth.uid()) and c.aktif
$$;

-- Çağıran kurum_admin ise yönettiği kurumlar: kendi düğümü + altındaki tüm düğümler.
create or replace function gizli.yonetilen_kurum_idleri()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select k.id
  from public.kullanici c
  join public.kurum k on k.yol @> array[c.kurum_id]
  where c.auth_id = (select auth.uid())
    and c.rol = 'kurum_admin'
    and c.aktif
$$;

-- Çağıranın kendi kurumu + üstündeki tüm düğümler (her rol için). Üst düğüme yazılan
-- genel içeriğin (duyuru) alt düğümlerde görünmesi için kullanılır.
create function gizli.ust_kurum_idleri()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select unnest(k.yol)
  from public.kullanici c
  join public.kurum k on k.id = c.kurum_id
  where c.auth_id = (select auth.uid()) and c.aktif
$$;

revoke all on function gizli.ust_kurum_idleri() from public, anon;
grant execute on function gizli.ust_kurum_idleri() to authenticated;

-- ---------------------------------------------------------------------------
-- kurum politikaları
--   Herkes kendi düğümünü ve üstlerini okur (kök: marka bilgisi; aradakiler: yol adları).
--   Yönetici altındaki tüm düğümleri okur, günceller; altına düğüm ekler ve siler.
--
-- Yönetici politikaları bilerek yonetilen_kurum_idleri() yerine satırın kendi `yol`
-- kolonuyla yazıldı: `insert ... returning` sırasında yeni satır fonksiyonun snapshot'ında
-- henüz görünmez. `yol`'u BEFORE trigger doldurduğu için with check onu görür.
-- ---------------------------------------------------------------------------
drop policy kurum_kendi_ve_kok_oku on public.kurum;
drop policy kurum_admin_sube_oku on public.kurum;
drop policy kurum_admin_guncelle on public.kurum;
drop policy kurum_admin_sube_ekle on public.kurum;
drop policy kurum_admin_sube_sil on public.kurum;

create policy kurum_kendi_ve_ustleri_oku on public.kurum
  for select to authenticated
  using (id in (select gizli.ust_kurum_idleri()));

create policy kurum_admin_alt_oku on public.kurum
  for select to authenticated
  using (
    (select gizli.mevcut_rol()) = 'kurum_admin'
    and (select gizli.mevcut_kurum_id()) = any (yol)
  );

create policy kurum_admin_guncelle on public.kurum
  for update to authenticated
  using (
    (select gizli.mevcut_rol()) = 'kurum_admin'
    and (select gizli.mevcut_kurum_id()) = any (yol)
  )
  with check (
    (select gizli.mevcut_rol()) = 'kurum_admin'
    and (select gizli.mevcut_kurum_id()) = any (yol)
  );

-- 4. seviyedeki yönetici kendi altına düğüm açmayı denerse kurum_hiyerarsi trigger'ı reddeder.
create policy kurum_admin_alt_ekle on public.kurum
  for insert to authenticated
  with check (
    (select gizli.mevcut_rol()) = 'kurum_admin'
    and (select gizli.mevcut_kurum_id()) = any (yol)
    and id <> (select gizli.mevcut_kurum_id())
  );

create policy kurum_admin_alt_sil on public.kurum
  for delete to authenticated
  using (
    (select gizli.mevcut_rol()) = 'kurum_admin'
    and (select gizli.mevcut_kurum_id()) = any (yol)
    and id <> (select gizli.mevcut_kurum_id())
  );

-- Kurum adı: süper admin her kurumun, yönetici yalnızca altındaki düğümlerin adını değiştirir
-- (kendi kurumunun adını değiştiremez).
create or replace function gizli.kurum_ad_degisikligi_yetki_kontrol()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cagiran_rol public.rol;
  v_cagiran_kurum uuid;
begin
  -- auth.uid() null ise (service role, SQL Editor, migration) kontrol uygulanmaz.
  if new.ad is distinct from old.ad and (select auth.uid()) is not null then
    v_cagiran_rol := gizli.mevcut_rol();
    if v_cagiran_rol = 'super_admin' then
      return new;
    end if;
    v_cagiran_kurum := gizli.mevcut_kurum_id();
    if v_cagiran_rol = 'kurum_admin' and v_cagiran_kurum = any (old.yol) and old.id <> v_cagiran_kurum then
      return new;
    end if;
    raise exception 'Bu kurumun adını değiştirme yetkiniz yok'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Duyuru: bir düğüme yazılan genel duyuruyu o düğümün ve altındaki tüm düğümlerin
-- kullanıcıları okur (önce yalnızca kendi kurumu + kök).
-- ---------------------------------------------------------------------------
drop policy duyuru_kurum_geneli_oku on public.duyuru;

create policy duyuru_kurum_geneli_oku on public.duyuru
  for select to authenticated
  using (
    sinif_id is null
    and kurum_id in (select gizli.ust_kurum_idleri())
  );
