-- Duyurular ve etkinlikler.
--
-- Kapsam `kurum_id` + `sinif_id` ile belirlenir:
--   sinif_id dolu            -> yalnızca o sınıf (öğretmenleri ve öğrencilerinin velileri)
--   sinif_id null, kök kurum -> tüm müşteri (şubeler dahil)
--   sinif_id null, şube      -> yalnızca o şube
--
-- Yazan: kurum admini (yönettiği kurumlar), öğretmen (yalnızca atandığı sınıfa; yalnızca kendi
-- yazdığını değiştirir/siler). Okuyan: kapsamdaki herkes. Push bildirimi `duyuru-bildirim-gonder`
-- Edge Function'ından gider.

create type public.duyuru_turu as enum ('duyuru', 'etkinlik');

-- Aynı transaction'da kullanılmaz (yeni enum değeri commit'ten sonra kullanılabilir).
alter type public.bildirim_tipi add value if not exists 'duyuru';

create table public.duyuru (
  id uuid primary key default gen_random_uuid(),
  kurum_id uuid not null references public.kurum (id),
  -- Müşteri (kök kurum); trigger doldurur.
  kok_kurum_id uuid not null references public.kurum (id),
  sinif_id uuid,
  tur public.duyuru_turu not null default 'duyuru',
  baslik text not null,
  icerik text not null,
  -- Yalnızca etkinlikte: ne zaman ve nerede.
  etkinlik_zamani timestamptz,
  yer text,
  giren_kullanici_id uuid not null references public.kullanici (id),
  olusturma_tarihi timestamptz not null default now(),
  guncelleme_tarihi timestamptz not null default now(),
  constraint duyuru_baslik_uzunluk check (char_length(btrim(baslik)) between 1 and 120),
  constraint duyuru_icerik_uzunluk check (char_length(btrim(icerik)) between 1 and 4000),
  constraint duyuru_yer_uzunluk check (yer is null or char_length(btrim(yer)) between 1 and 120),
  constraint duyuru_etkinlik_alanlari check (
    (tur = 'etkinlik' and etkinlik_zamani is not null)
    or (tur = 'duyuru' and etkinlik_zamani is null and yer is null)
  ),
  -- Sınıf silinince o sınıfa özel duyurular da silinir.
  constraint duyuru_sinif_ayni_kurum_fkey
    foreign key (sinif_id, kurum_id) references public.sinif (id, kurum_id) on delete cascade
);

create index duyuru_kurum_id_idx on public.duyuru (kurum_id, olusturma_tarihi desc);
create index duyuru_kok_kurum_id_idx on public.duyuru (kok_kurum_id);
create index duyuru_sinif_id_idx on public.duyuru (sinif_id);

create function gizli.duyuru_turetilen_alanlar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.kok_kurum_id := gizli.kok_kurum_id(new.kurum_id);
  if tg_op = 'UPDATE' then
    new.guncelleme_tarihi := now();
  end if;
  return new;
end;
$$;

revoke all on function gizli.duyuru_turetilen_alanlar() from public, anon;

create trigger duyuru_turetilen
  before insert or update on public.duyuru
  for each row execute function gizli.duyuru_turetilen_alanlar();

alter table public.duyuru enable row level security;
revoke all on public.duyuru from anon;
-- Kapsam (kurum, sınıf) ve yazan kişi sonradan değiştirilemez; kok_kurum_id istemciden yazılamaz.
revoke insert, update on public.duyuru from authenticated;
grant insert (kurum_id, sinif_id, tur, baslik, icerik, etkinlik_zamani, yer, giren_kullanici_id)
  on public.duyuru to authenticated;
grant update (tur, baslik, icerik, etkinlik_zamani, yer) on public.duyuru to authenticated;

create policy duyuru_super_admin on public.duyuru
  for all to authenticated
  using ((select gizli.mevcut_rol()) = 'super_admin')
  with check ((select gizli.mevcut_rol()) = 'super_admin');

-- Kurum geneli duyuru: kullanıcının kendi kurumuna ya da müşterinin tamamına (kök kuruma) yazılmış,
-- sınıfa özel olmayan duyuruyu müşterinin herkesi okur (şube admini, öğretmen, veli dahil).
create policy duyuru_kurum_geneli_oku on public.duyuru
  for select to authenticated
  using (
    sinif_id is null
    and kurum_id in ((select gizli.mevcut_kurum_id()), (select gizli.mevcut_kok_kurum_id()))
  );

-- Sınıfa özel duyuru: sınıfın öğretmeni ve o sınıfta çocuğu olan veli.
create policy duyuru_sinif_oku on public.duyuru
  for select to authenticated
  using (
    sinif_id is not null
    and (gizli.ogretmen_sinifi_mi(sinif_id) or gizli.veli_sinifi_mi(sinif_id))
  );

create policy duyuru_kurum_admin_oku on public.duyuru
  for select to authenticated
  using (kurum_id in (select gizli.yonetilen_kurum_idleri()));

create policy duyuru_kurum_admin_yaz on public.duyuru
  for insert to authenticated
  with check (
    kurum_id in (select gizli.yonetilen_kurum_idleri())
    and giren_kullanici_id = (select gizli.mevcut_kullanici_id())
  );

create policy duyuru_kurum_admin_guncelle on public.duyuru
  for update to authenticated
  using (kurum_id in (select gizli.yonetilen_kurum_idleri()))
  with check (kurum_id in (select gizli.yonetilen_kurum_idleri()));

create policy duyuru_kurum_admin_sil on public.duyuru
  for delete to authenticated
  using (kurum_id in (select gizli.yonetilen_kurum_idleri()));

-- Öğretmen yalnızca atandığı sınıfa yazar; kurum geneli duyuru yazamaz.
create policy duyuru_ogretmen_yaz on public.duyuru
  for insert to authenticated
  with check (
    sinif_id is not null
    and gizli.ogretmen_sinifi_mi(sinif_id)
    and giren_kullanici_id = (select gizli.mevcut_kullanici_id())
  );

create policy duyuru_ogretmen_guncelle on public.duyuru
  for update to authenticated
  using (
    sinif_id is not null
    and gizli.ogretmen_sinifi_mi(sinif_id)
    and giren_kullanici_id = (select gizli.mevcut_kullanici_id())
  )
  with check (
    sinif_id is not null
    and gizli.ogretmen_sinifi_mi(sinif_id)
    and giren_kullanici_id = (select gizli.mevcut_kullanici_id())
  );

create policy duyuru_ogretmen_sil on public.duyuru
  for delete to authenticated
  using (
    sinif_id is not null
    and gizli.ogretmen_sinifi_mi(sinif_id)
    and giren_kullanici_id = (select gizli.mevcut_kullanici_id())
  );
