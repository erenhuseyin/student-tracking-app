-- İki erişim genişletmesi:
--   1. Kurum admini kendi kurumunun `ayarlar` alanını düzenleyebilir (ad'ı değil).
--   2. Öğretmen, atandığı sınıflardaki öğrencilerin velilerini (kullanici satırı) görebilir.

-- ---------------------------------------------------------------------------
-- 1. kurum.ayarlar — kurum admini düzenleyebilir
-- ---------------------------------------------------------------------------
-- Kolon yetkisi role göre verilir (politikaya göre değil): süper admin de `ad`'ı güncelleyebilsin
-- diye ad + ayarlar açılır, `ad` değişikliği trigger ile yalnızca süper admine bırakılır.
revoke update on public.kurum from authenticated;
grant update (ad, ayarlar) on public.kurum to authenticated;

create function gizli.kurum_ad_degisikligi_yetki_kontrol()
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
    if v_cagiran_rol is distinct from 'super_admin' then
      raise exception 'Kurum adını yalnızca süper admin değiştirebilir'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function gizli.kurum_ad_degisikligi_yetki_kontrol() from public, anon;

create trigger kurum_ad_yetki
  before update of ad on public.kurum
  for each row execute function gizli.kurum_ad_degisikligi_yetki_kontrol();

create policy kurum_admin_ayarlar_guncelle on public.kurum
  for update to authenticated
  using (
    (select gizli.mevcut_rol()) = 'kurum_admin'
    and id = (select gizli.mevcut_kurum_id())
  )
  with check (
    (select gizli.mevcut_rol()) = 'kurum_admin'
    and id = (select gizli.mevcut_kurum_id())
  );

-- UYARI: `ayarlar` kurum admini tarafından serbestçe yazılabilir. Plan/abonelik gibi
-- kurum admininin DEĞİŞTİRMEMESİ gereken alanlar `ayarlar` içine konmamalı; ayrı kolon
-- olarak eklenip kolon yetkisi verilmemeli.

-- ---------------------------------------------------------------------------
-- 2. Öğretmen -> atandığı sınıflardaki öğrencilerin velilerini görür
-- ---------------------------------------------------------------------------
create function gizli.ogretmen_velisi_mi(p_kullanici_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.veli_ogrenci vo
    join public.ogrenci o on o.id = vo.ogrenci_id
    join public.ogretmen_sinif os on os.sinif_id = o.sinif_id
    where vo.veli_id = p_kullanici_id
      and os.ogretmen_id = gizli.mevcut_kullanici_id()
  )
$$;

revoke all on function gizli.ogretmen_velisi_mi(uuid) from public, anon;
grant execute on function gizli.ogretmen_velisi_mi(uuid) to authenticated;

create policy kullanici_ogretmen_velisini_oku on public.kullanici
  for select to authenticated
  using (gizli.ogretmen_velisi_mi(id));

-- UYARI: RLS satırı süzer, kolonu değil. Öğretmen bu velilerin kullanici satırının TÜM
-- kolonlarını görür. kullanici'ya telefon/e-posta gibi hassas kolon eklenirse öğretmene
-- de açılır; iletişim bilgisini ayrı bir tabloda (kendi RLS'iyle) tut.
