-- Görev tanımları ("rol tanımlama") ve göreve bağlı menü yetkisi.
--
-- Roller sabit kalır (kurum_admin, ogretmen, veli). Müşteri kendi görevlerini tanımlar
-- (ör. İstişare üyesi, Eğitim sorumlusu, Abi); her görev bir TEMEL ROLE bağlıdır ve o görevdeki
-- kişilere hangi menü öğelerinin gösterilmeyeceğini tutar (kapali_ogeler).
--
-- Bu bir GÖRÜNÜRLÜK ayarıdır, güvenlik sınırı değildir (bkz. kapali_bolum): veriye erişimi
-- kişinin temel rolü ve bağlı olduğu kurum belirler; diğer tabloların RLS politikaları değişmez.
-- Sistem rolleri (görevsiz Öğretmen ve Veli) için bölüm görünürlüğü kapali_bolum'da kalır.

create table public.gorev (
  id uuid primary key default gen_random_uuid(),
  -- Her zaman kök kurum (trigger doğrular); alt birimler müşterinin görevlerini kullanır.
  kurum_id uuid not null references public.kurum (id) on delete cascade,
  ad text not null,
  temel_rol public.rol not null,
  aciklama text,
  -- Bu görevde gizlenen menü öğesi anahtarları (lib/menu.ts). Boş = hepsi açık.
  -- Bilinmeyen anahtar zararsızdır, yok sayılır.
  kapali_ogeler text[] not null default '{}',
  olusturma_tarihi timestamptz not null default now(),
  constraint gorev_kurum_ad_key unique (kurum_id, ad),
  constraint gorev_temel_rol check (temel_rol in ('kurum_admin', 'ogretmen')),
  constraint gorev_ad_uzunluk check (char_length(btrim(ad)) between 1 and 40),
  constraint gorev_aciklama_uzunluk check (aciklama is null or char_length(aciklama) <= 300)
);

create index gorev_kurum_id_idx on public.gorev (kurum_id);

create function gizli.gorev_kok_dogrula()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.kurum k where k.id = new.kurum_id and k.ust_kurum_id is not null) then
    raise exception 'Görev yalnızca ana kurumda tanımlanır'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke all on function gizli.gorev_kok_dogrula() from public, anon;

create trigger gorev_kok
  before insert on public.gorev
  for each row execute function gizli.gorev_kok_dogrula();

alter table public.gorev enable row level security;
revoke all on public.gorev from anon;
-- Temel rol ve kurum sonradan değiştirilemez.
revoke insert, update on public.gorev from authenticated;
grant insert (kurum_id, ad, temel_rol, aciklama, kapali_ogeler) on public.gorev to authenticated;
grant update (ad, aciklama, kapali_ogeler) on public.gorev to authenticated;

create policy gorev_super_admin on public.gorev
  for all to authenticated
  using ((select gizli.mevcut_rol()) = 'super_admin')
  with check ((select gizli.mevcut_rol()) = 'super_admin');

-- Müşterinin herkesi okur: uygulama kendi menüsünü ve rol etiketini buna göre kurar.
create policy gorev_musteri_oku on public.gorev
  for select to authenticated
  using (kurum_id = (select gizli.mevcut_kok_kurum_id()));

-- Yalnızca kök kurumun yöneticisi yazar (gelisim_kategorisi ile aynı desen: alt birim
-- yöneticisinin kurum_id'si hiçbir görevle eşleşmez).
create policy gorev_kok_admin on public.gorev
  for all to authenticated
  using (
    (select gizli.mevcut_rol()) = 'kurum_admin'
    and kurum_id = (select gizli.mevcut_kurum_id())
  )
  with check (
    (select gizli.mevcut_rol()) = 'kurum_admin'
    and kurum_id = (select gizli.mevcut_kurum_id())
  );

-- ---------------------------------------------------------------------------
-- Kişinin görevi. Kullanılan görev silinemez (restrict).
-- Atamayı her yönetici kendi kapsamındaki kişilere yapar (kullanici_kurum_admin_guncelle).
-- ---------------------------------------------------------------------------
alter table public.kullanici
  add column gorev_id uuid references public.gorev (id) on delete restrict;

create index kullanici_gorev_id_idx on public.kullanici (gorev_id);

grant update (gorev_id) on public.kullanici to authenticated;

create function gizli.kullanici_gorev_dogrula()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    -- Rol değişince eski görev (başka temel role ait) geçersizdir.
    if new.rol is distinct from old.rol and new.gorev_id is not distinct from old.gorev_id then
      new.gorev_id := null;
    end if;
    -- Kimse kendi görevini (dolayısıyla kendi menü yetkisini) değiştiremez.
    -- auth.uid() null ise (service role, SQL Editor, migration) kontrol uygulanmaz.
    if new.gorev_id is distinct from old.gorev_id
       and (select auth.uid()) is not null
       and old.auth_id = (select auth.uid()) then
      raise exception 'Kullanıcı kendi görevini değiştiremez'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  if new.gorev_id is not null and not exists (
    select 1 from public.gorev g
    where g.id = new.gorev_id
      and g.temel_rol = new.rol
      and g.kurum_id = gizli.kok_kurum_id(new.kurum_id)
  ) then
    raise exception 'Görev bu kişinin rolüne ya da kurumuna uygun değil'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke all on function gizli.kullanici_gorev_dogrula() from public, anon;

create trigger kullanici_gorev
  before insert or update of gorev_id, rol on public.kullanici
  for each row execute function gizli.kullanici_gorev_dogrula();
