-- Yetki yükseltme açığı düzeltmesi.
--
-- Sorun: kullanici_kendi_satiri_guncelle politikası "rol değişmemeli" kuralını
-- `with check (rol = gizli.mevcut_rol())` ile uyguluyordu. Güncelleme sırasında bu
-- fonksiyon eski rolü değil yeni yazılan rolü görüyor; koşul hep sağlanıyor ve bir
-- öğretmen kendi rolünü kurum_admin yapabiliyordu (supabase/tests/rls.test.sql yakaladı).
--
-- Çözüm: kontrol BEFORE UPDATE trigger'a taşındı. Trigger satır yazılmadan önce çalışır,
-- bu yüzden fonksiyon gerçek (eski) rolü okur.
--   * Kimse kendi rolünü değiştiremez (kurum_admin dahil).
--   * Rolü yalnızca super_admin ve kurum_admin değiştirebilir.
--   * auth.uid() null ise (service role, SQL Editor, migration) kontrol uygulanmaz.
-- Kurum admininin başkasını super_admin yapamaması: kolon yetkisi kurum_id'yi kapattığı
-- için kullanici_rol_kurum_tutarli check'i + kullanici_kurum_admin_guncelle with check'i.

create function gizli.rol_degisikligi_yetki_kontrol()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cagiran_rol public.rol;
begin
  if new.rol is distinct from old.rol and (select auth.uid()) is not null then
    if old.auth_id = (select auth.uid()) then
      raise exception 'Kullanıcı kendi rolünü değiştiremez'
        using errcode = 'insufficient_privilege';
    end if;

    v_cagiran_rol := gizli.mevcut_rol();
    if v_cagiran_rol is null or v_cagiran_rol not in ('super_admin', 'kurum_admin') then
      raise exception 'Rol değiştirme yetkiniz yok'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function gizli.rol_degisikligi_yetki_kontrol() from public, anon;

create trigger kullanici_rol_yetki
  before update of rol on public.kullanici
  for each row execute function gizli.rol_degisikligi_yetki_kontrol();

-- Kendi satırı politikasından hatalı rol koşulunu kaldır (kontrol artık trigger'da).
drop policy kullanici_kendi_satiri_guncelle on public.kullanici;

create policy kullanici_kendi_satiri_guncelle on public.kullanici
  for update to authenticated
  using (auth_id = (select auth.uid()))
  with check (auth_id = (select auth.uid()));
