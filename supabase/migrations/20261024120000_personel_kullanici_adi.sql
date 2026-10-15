-- Personele kullanıcı adı (YAPILACAKLAR B1, 2026-10-15).
--
-- Öğretmen ve yönetici, girişte e-posta yerine `ad.soyad` biçiminde bir kullanıcı adı da yazabilir
-- (supabase/functions/personel-giris adı e-postaya çevirip giriş yapar). Hesap açma değişmez:
-- davet ve kod yine e-postayla gider.
--
-- Kurallar (kullanıcı kararları):
--   * Ad soyaddan otomatik üretilir; öğrencideki kural kullanılır (gizli.kullanici_adi_tabani):
--     "Ali Yılmaz" -> ali.yilmaz, çakışmada ali.yilmaz1, ali.yilmaz2 …
--   * Müşteri (kök kurum) başına tekildir; öğrenci adlarından AYRI havuzdur (veli girişi ayrı ekranda).
--   * Yalnızca personelde (kurum_admin, ogretmen) dolu; velide ve süper adminde boştur.
--   * Yönetici kapsamındaki kişinin adını başka bir uygun ada çevirebilir; öğretmen kendi adını
--     değiştiremez. Ad soyad ya da rol değişince ad değişmez.
--   * Ayrı deneme sınırı yoktur (şifre en az 8 karakter; Supabase Auth'un kendi sınırı geçerlidir).

alter table public.kullanici
  add column kok_kurum_id uuid references public.kurum (id) on delete cascade,
  add column kullanici_adi text,
  add constraint kullanici_kullanici_adi_bicim
    check (kullanici_adi is null or kullanici_adi ~ '^[a-z0-9]+(\.[a-z0-9]+)*$' and char_length(kullanici_adi) <= 60),
  add constraint kullanici_kok_kurum_kullanici_adi_key unique (kok_kurum_id, kullanici_adi);

create function gizli.kullanici_adi_hazirla()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_taban text;
  v_aday text;
  v_ek integer := 0;
begin
  -- Müşteri: tekilliğin kapsamı ve personel-giris'in arama anahtarı.
  if new.kurum_id is null then
    new.kok_kurum_id := null;
  else
    select k.kok_kurum_id into new.kok_kurum_id from public.kurum k where k.id = new.kurum_id;
  end if;

  -- Veli ve süper adminde ad tutulmaz (velinin giriş adı öğrencidedir: ogrenci.kullanici_adi).
  if new.rol not in ('kurum_admin', 'ogretmen') or new.kok_kurum_id is null then
    new.kullanici_adi := null;
    return new;
  end if;

  if tg_op = 'UPDATE' and new.kullanici_adi is distinct from old.kullanici_adi then
    -- auth.uid() boşsa (service role, SQL Editor, migration) kontrol uygulanmaz.
    if (select auth.uid()) is not null and coalesce(gizli.mevcut_rol()::text, '') not in ('kurum_admin', 'super_admin') then
      raise exception 'Kullanıcı adını yalnızca yönetici değiştirebilir'
        using errcode = 'insufficient_privilege';
    end if;
    if new.kullanici_adi is null then
      raise exception 'Kullanıcı adı boş bırakılamaz'
        using errcode = 'check_violation';
    end if;
  end if;

  -- Ad yoksa (yeni personel ya da ilk kurulum) üretilir.
  if new.kullanici_adi is null then
    v_taban := gizli.kullanici_adi_tabani(new.ad_soyad);
    loop
      v_aday := v_taban || case when v_ek = 0 then '' else v_ek::text end;
      exit when not exists (
        select 1 from public.kullanici k
        where k.kok_kurum_id = new.kok_kurum_id and k.kullanici_adi = v_aday and k.id <> new.id
      );
      v_ek := v_ek + 1;
      if v_ek > 999 then
        raise exception 'Kullanıcı adı üretilemedi' using errcode = 'unique_violation';
      end if;
    end loop;
    new.kullanici_adi := v_aday;
  end if;
  return new;
end;
$$;

revoke all on function gizli.kullanici_adi_hazirla() from public, anon;

-- Mevcut personel eklenme sırasıyla ad alır (trigger kurulmadan önce, tek tek: her biri bir
-- öncekinin adını görür).
update public.kullanici k
set kok_kurum_id = (select x.kok_kurum_id from public.kurum x where x.id = k.kurum_id)
where k.kurum_id is not null;

create trigger kullanici_adi
  before insert or update of kurum_id, rol, kullanici_adi on public.kullanici
  for each row execute function gizli.kullanici_adi_hazirla();

do $$
declare r record;
begin
  for r in
    select id from public.kullanici
    where rol in ('kurum_admin', 'ogretmen') and kurum_id is not null and kullanici_adi is null
    order by olusturma_tarihi, id
  loop
    -- Trigger, "update of rol" ile tetiklenir ve boş adı üretir.
    update public.kullanici set rol = rol where id = r.id;
  end loop;
end $$;

-- Yönetici kapsamındaki kişinin adını değiştirir (satırı kullanici_kurum_admin_guncelle sınırlar);
-- kimin değiştirebildiğini trigger denetler.
grant update (kullanici_adi) on public.kullanici to authenticated;
