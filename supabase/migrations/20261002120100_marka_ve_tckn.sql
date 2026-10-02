-- Müşteriye özel uygulama (white-label) için veri tarafı:
--   1. kurum.marka_kodu  — kök kurumun (müşterinin) hangi uygulamaya ait olduğu
--   2. kurum.ozellikler  — müşteriye özel özellik bayrakları (yalnızca süper admin yazar)
--   3. ogrenci.tckn      — sistem genelinde değil, müşteri (kök kurum) başına tekil

-- ---------------------------------------------------------------------------
-- 1-2. marka_kodu ve ozellikler
-- ---------------------------------------------------------------------------
-- marka_kodu uygulamanın derleme zamanı marka koduyla (markalar/<kod>/) eşleşir ve veli
-- auth e-postasının parçasıdır: {tckn}@{marka_kodu}.veli.internal. Bu yüzden bir kez
-- atandıktan sonra değiştirilemez. Yalnızca kök kurumda bulunur; şubeler kökünkini kullanır.
--
-- ozellikler bilerek `ayarlar`dan ayrı: `ayarlar` kurum admini tarafından yazılabilir,
-- neyin açık olduğuna (satılan özelliklere) ise yalnızca süper admin karar verir.
alter table public.kurum
  add column marka_kodu text,
  add column ozellikler jsonb not null default '{}'::jsonb,
  add constraint kurum_marka_kodu_key unique (marka_kodu),
  add constraint kurum_marka_kodu_format check (marka_kodu is null or marka_kodu ~ '^[a-z][a-z0-9-]{1,30}$'),
  add constraint kurum_marka_kodu_yalnizca_kokte check (ust_kurum_id is null or marka_kodu is null);

-- Mevcut kalıcı test kurumu bugünkü uygulamaya (varsayilan markası) bağlanır.
update public.kurum set marka_kodu = 'varsayilan' where ad = 'Test Okulu' and ust_kurum_id is null;

revoke update on public.kurum from authenticated;
grant update (ad, ayarlar, marka_kodu, ozellikler) on public.kurum to authenticated;

-- Kolon yetkisi role göre verildiği için (süper admin de `authenticated`) asıl kısıt burada.
create function gizli.kurum_korunan_alan_yetki_kontrol()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_super_admin boolean;
begin
  -- auth.uid() null ise (service role, SQL Editor, migration) kontrol uygulanmaz.
  if (select auth.uid()) is null then
    return new;
  end if;
  v_super_admin := gizli.mevcut_rol() is not distinct from 'super_admin';

  if tg_op = 'INSERT' then
    if not v_super_admin and (new.marka_kodu is not null or new.ozellikler <> '{}'::jsonb) then
      raise exception 'Marka kodu ve özellikleri yalnızca süper admin belirleyebilir'
        using errcode = 'insufficient_privilege';
    end if;
    return new;
  end if;

  if new.marka_kodu is distinct from old.marka_kodu then
    if not v_super_admin then
      raise exception 'Marka kodunu yalnızca süper admin belirleyebilir'
        using errcode = 'insufficient_privilege';
    end if;
    if old.marka_kodu is not null then
      raise exception 'Marka kodu atandıktan sonra değiştirilemez (veli hesapları buna bağlı)'
        using errcode = 'check_violation';
    end if;
  end if;
  if new.ozellikler is distinct from old.ozellikler and not v_super_admin then
    raise exception 'Özellikleri yalnızca süper admin değiştirebilir'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

revoke all on function gizli.kurum_korunan_alan_yetki_kontrol() from public, anon;

create trigger kurum_korunan_alan_yetki
  before insert or update on public.kurum
  for each row execute function gizli.kurum_korunan_alan_yetki_kontrol();

-- ---------------------------------------------------------------------------
-- 3. TCKN müşteri başına tekil
-- ---------------------------------------------------------------------------
-- kok_kurum_id trigger ile doldurulur; istemcinin bu kolona yazma yetkisi yoktur
-- (ogrenci üzerindeki insert/update yetkisi kolon bazlıdır, bkz. 20260928120200).
-- Bir şube SQL ile başka bir köke taşınırsa öğrencilerinin kok_kurum_id'si elle yenilenmelidir.
alter table public.ogrenci add column kok_kurum_id uuid references public.kurum (id);

update public.ogrenci o set kok_kurum_id = gizli.kok_kurum_id(o.kurum_id);

alter table public.ogrenci alter column kok_kurum_id set not null;

create function gizli.ogrenci_kok_kurum_doldur()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.kok_kurum_id := gizli.kok_kurum_id(new.kurum_id);
  return new;
end;
$$;

revoke all on function gizli.ogrenci_kok_kurum_doldur() from public, anon;

create trigger ogrenci_kok_kurum
  before insert or update on public.ogrenci
  for each row execute function gizli.ogrenci_kok_kurum_doldur();

alter table public.ogrenci
  drop constraint ogrenci_tckn_key,
  add constraint ogrenci_kok_kurum_tckn_key unique (kok_kurum_id, tckn);
