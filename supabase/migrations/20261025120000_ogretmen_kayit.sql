-- Hoca kendi sınıfını ve öğrencisini açar (YAPILACAKLAR B2, 2026-10-15).
--
-- Kurallar (kullanıcı kararları):
--   * Hoca yalnızca kendi birimine (kullanici.kurum_id) sınıf açar; kendisi o sınıfa atanır.
--     Açarken kademe seçebilir (kademe doğrulaması mevcut sinif_kademe trigger'ında).
--   * Hoca atandığı sınıfı düzenler (ad, dönem, kademe), sınıfına öğrenci ekler, öğrencisini
--     düzenler ve pasife alır / geri açar. Silme yöneticide kalır (silme politikası açılmaz).
--   * Müşteri bazında özellik bayrağı: kök kurumun ozellikler->ogretmen_kayit, varsayılan AÇIK
--     (yalnızca false yazılırsa kapalı; yalnızca süper admin yazar). Kapalıyken hocanın buradaki
--     tüm yazma yetkileri kalkar — bugünkü davranışın aynısı.
--   * Veli girişini (veli-hesap-olustur) hoca da açar; PIN sıfırlama yöneticide kalır.

-- ---------------------------------------------------------------------------
-- 1. Bayrak
-- ---------------------------------------------------------------------------
-- Çağıran öğretmen mi ve müşterisinde hocanın kayıt açması açık mı.
create function gizli.ogretmen_kaydi_acik()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.kullanici c
    join public.kurum k on k.id = c.kurum_id
    join public.kurum kok on kok.id = k.kok_kurum_id
    where c.auth_id = (select auth.uid())
      and c.aktif
      and c.rol = 'ogretmen'
      and coalesce(kok.ozellikler ->> 'ogretmen_kayit', 'true') <> 'false'
  )
$$;

revoke all on function gizli.ogretmen_kaydi_acik() from public, anon;
grant execute on function gizli.ogretmen_kaydi_acik() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Sınıf açma
-- ---------------------------------------------------------------------------
-- RPC: hocanın sınıf okuma politikası ogretmen_sinif satırına baktığı için `insert ... returning`
-- yeni sınıfı göremez; ayrıca hocanın kendini ataması için ogretmen_sinif'e istemciden yazma
-- açılmasın diye sınıf ve atama burada tek işlemde yazılır.
create function public.ogretmen_sinif_ac(p_ad text, p_donem text, p_kademe_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kullanici_id uuid := gizli.mevcut_kullanici_id();
  v_kurum_id uuid := gizli.mevcut_kurum_id();
  v_ad text := btrim(coalesce(p_ad, ''));
  v_donem text := btrim(coalesce(p_donem, ''));
  v_sinif_id uuid;
begin
  if not gizli.ogretmen_kaydi_acik() then
    raise exception 'Bu işlem için yetkiniz yok' using errcode = '42501';
  end if;
  if v_ad = '' then
    raise exception 'Sınıf adı gerekli' using errcode = '22023';
  end if;
  if v_donem = '' then
    raise exception 'Dönem gerekli' using errcode = '22023';
  end if;

  insert into public.sinif (kurum_id, ad, donem, kademe_id)
  values (v_kurum_id, v_ad, v_donem, p_kademe_id)
  returning id into v_sinif_id;

  insert into public.ogretmen_sinif (kurum_id, ogretmen_id, sinif_id)
  values (v_kurum_id, v_kullanici_id, v_sinif_id);

  return v_sinif_id;
end;
$$;

revoke all on function public.ogretmen_sinif_ac(text, text, uuid) from public, anon;
grant execute on function public.ogretmen_sinif_ac(text, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Sınıf düzenleme
-- ---------------------------------------------------------------------------
create policy sinif_ogretmen_guncelle on public.sinif
  for update to authenticated
  using (gizli.ogretmen_sinifi_mi(id) and (select gizli.ogretmen_kaydi_acik()))
  with check (gizli.ogretmen_sinifi_mi(id) and (select gizli.ogretmen_kaydi_acik()));

-- sinif'te kolon grant'ı yok (yönetici tüm kolonları yazar); hoca yalnızca ad, dönem ve kademeyi
-- değiştirebilir. "Eski değer"e bakan kural olduğu için with check'e değil trigger'a yazılır.
create function gizli.sinif_ogretmen_alanlari()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if gizli.mevcut_rol() = 'ogretmen'
    and (new.id is distinct from old.id
      or new.kurum_id is distinct from old.kurum_id
      or new.olusturma_tarihi is distinct from old.olusturma_tarihi) then
    raise exception 'Öğretmen sınıfın yalnızca adını, dönemini ve kademesini değiştirebilir'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function gizli.sinif_ogretmen_alanlari() from public, anon;

create trigger sinif_ogretmen_alanlari
  before update on public.sinif
  for each row execute function gizli.sinif_ogretmen_alanlari();

-- ---------------------------------------------------------------------------
-- 4. Öğrenci
-- ---------------------------------------------------------------------------
-- Okuma politikası satırın kendi sinif_id'sine bakacak şekilde yeniden yazılır (anlam aynı):
-- ogretmen_ogrencisi_mi(id) ogrenci tablosunu okuduğu için `insert ... returning` yeni satırı
-- göremezdi.
drop policy ogrenci_ogretmen_oku on public.ogrenci;

create policy ogrenci_ogretmen_oku on public.ogrenci
  for select to authenticated
  using (gizli.ogretmen_sinifi_mi(sinif_id));

-- Yazılabilir kolonlar mevcut grant'larla sınırlı (kullanici_adi yalnızca sunucuda); kurum
-- tutarlılığı bileşik FK (sinif_id, kurum_id) ile sağlanır. Silme politikası yok.
create policy ogrenci_ogretmen_ekle on public.ogrenci
  for insert to authenticated
  with check (gizli.ogretmen_sinifi_mi(sinif_id) and (select gizli.ogretmen_kaydi_acik()));

create policy ogrenci_ogretmen_guncelle on public.ogrenci
  for update to authenticated
  using (gizli.ogretmen_sinifi_mi(sinif_id) and (select gizli.ogretmen_kaydi_acik()))
  with check (gizli.ogretmen_sinifi_mi(sinif_id) and (select gizli.ogretmen_kaydi_acik()));
