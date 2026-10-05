-- Gelişim kaydı (Faz 2): öğretmen öğrenciye kategori + not + isteğe bağlı 1-5 puan girer,
-- veli çocuğunun zaman çizelgesini görür.
--
--   1. gelisim_kategorisi — müşteri (kök kurum) düzeyinde tanımlanır, şubeler ortak kullanır;
--      yalnızca kök kurumun admini yönetir.
--   2. gelisim_kaydi      — öğrencinin kurumunda durur (şube öğrencisi ise şubede).
--
-- Fotoğraf bu migration'ın kapsamında değil; `foto_yolu` kolonu ileride private storage
-- yolunu tutmak için şimdiden eklendi ve istemciden yazılamaz.

-- ---------------------------------------------------------------------------
-- 1. gelisim_kategorisi
-- ---------------------------------------------------------------------------
-- kurum_id her zaman kök kurumdur (trigger doğrular). Kurum silinirse kategorileri de gider:
-- her kök kuruma varsayılan kategoriler eklendiği için aksi halde boş bir kurum silinemezdi
-- (kaydı olan kurum zaten gelisim_kaydi.kurum_id FK'si yüzünden silinemez).
create table public.gelisim_kategorisi (
  id uuid primary key default gen_random_uuid(),
  kurum_id uuid not null references public.kurum (id) on delete cascade,
  ad text not null,
  sira integer not null default 0,
  -- Kullanılmış kategori silinemez (gelisim_kaydi FK'si); yeni kayıtlarda görünmesin diye pasifleştirilir.
  aktif boolean not null default true,
  olusturma_tarihi timestamptz not null default now(),
  constraint gelisim_kategorisi_id_kurum_id_key unique (id, kurum_id),
  constraint gelisim_kategorisi_kurum_ad_key unique (kurum_id, ad),
  constraint gelisim_kategorisi_ad_uzunluk check (char_length(btrim(ad)) between 1 and 40)
);

create index gelisim_kategorisi_kurum_id_idx on public.gelisim_kategorisi (kurum_id);

create function gizli.gelisim_kategorisi_kok_dogrula()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.kurum k where k.id = new.kurum_id and k.ust_kurum_id is not null) then
    raise exception 'Gelişim kategorisi yalnızca ana kurumda tanımlanır'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke all on function gizli.gelisim_kategorisi_kok_dogrula() from public, anon;

create trigger gelisim_kategorisi_kok
  before insert or update of kurum_id on public.gelisim_kategorisi
  for each row execute function gizli.gelisim_kategorisi_kok_dogrula();

-- Varsayılan kategoriler: mevcut kök kurumlara şimdi, yeni açılanlara trigger ile.
insert into public.gelisim_kategorisi (kurum_id, ad, sira)
select k.id, v.ad, v.sira
from public.kurum k
cross join (values ('Akademik', 1), ('Sosyal', 2), ('Davranış', 3), ('Diğer', 4)) as v (ad, sira)
where k.ust_kurum_id is null;

create function gizli.varsayilan_gelisim_kategorileri_ekle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.gelisim_kategorisi (kurum_id, ad, sira)
  values (new.id, 'Akademik', 1), (new.id, 'Sosyal', 2), (new.id, 'Davranış', 3), (new.id, 'Diğer', 4);
  return null;
end;
$$;

revoke all on function gizli.varsayilan_gelisim_kategorileri_ekle() from public, anon;

create trigger kurum_varsayilan_gelisim_kategorileri
  after insert on public.kurum
  for each row when (new.ust_kurum_id is null)
  execute function gizli.varsayilan_gelisim_kategorileri_ekle();

alter table public.gelisim_kategorisi enable row level security;
revoke all on public.gelisim_kategorisi from anon;
-- kurum_id sonradan değiştirilemez (kategori başka müşteriye taşınamaz).
revoke insert, update on public.gelisim_kategorisi from authenticated;
grant insert (kurum_id, ad, sira, aktif) on public.gelisim_kategorisi to authenticated;
grant update (ad, sira, aktif) on public.gelisim_kategorisi to authenticated;

create policy gelisim_kategorisi_super_admin on public.gelisim_kategorisi
  for all to authenticated
  using ((select gizli.mevcut_rol()) = 'super_admin')
  with check ((select gizli.mevcut_rol()) = 'super_admin');

-- Müşterinin herkesi (şube personeli ve veliler dahil) kategorileri okur.
create policy gelisim_kategorisi_musteri_oku on public.gelisim_kategorisi
  for select to authenticated
  using (kurum_id = (select gizli.mevcut_kok_kurum_id()));

-- Yalnızca kök kurumun admini yazar: kategori kök kurumda durduğu için şube admininin
-- kurum_id'si hiçbir kategoriyle eşleşmez. Bilerek yonetilen_kurum_idleri() kullanılmadı —
-- o küme şubeleri de içerir ama burada aranan "yönetilen kurum" değil "kendi kök kurumu".
create policy gelisim_kategorisi_kok_admin on public.gelisim_kategorisi
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
-- 2. gelisim_kaydi
-- ---------------------------------------------------------------------------
create table public.gelisim_kaydi (
  id uuid primary key default gen_random_uuid(),
  kurum_id uuid not null references public.kurum (id),
  -- Müşteri (kök kurum); trigger doldurur. Kategorinin aynı müşteriye ait olmasını bileşik FK ile sağlar.
  kok_kurum_id uuid not null references public.kurum (id),
  ogrenci_id uuid not null,
  kategori_id uuid not null,
  -- Spec'teki "not" alanı (`not` SQL'de ayrılmış sözcük).
  not_metni text not null,
  olcek_degeri smallint,
  tarih date not null default current_date,
  giren_kullanici_id uuid not null references public.kullanici (id),
  foto_yolu text,
  olusturma_tarihi timestamptz not null default now(),
  guncelleme_tarihi timestamptz not null default now(),
  constraint gelisim_kaydi_not_uzunluk check (char_length(btrim(not_metni)) between 1 and 2000),
  constraint gelisim_kaydi_olcek_araligi check (olcek_degeri is null or olcek_degeri between 1 and 5),
  -- Öğrenci silinince kayıtları da silinir (yoksa kaydı olan öğrenci silinemezdi).
  constraint gelisim_kaydi_ogrenci_ayni_kurum_fkey
    foreign key (ogrenci_id, kurum_id) references public.ogrenci (id, kurum_id) on delete cascade,
  constraint gelisim_kaydi_kategori_ayni_musteri_fkey
    foreign key (kategori_id, kok_kurum_id) references public.gelisim_kategorisi (id, kurum_id)
);

create index gelisim_kaydi_kurum_id_idx on public.gelisim_kaydi (kurum_id);
create index gelisim_kaydi_ogrenci_tarih_idx on public.gelisim_kaydi (ogrenci_id, tarih desc);
create index gelisim_kaydi_kategori_id_idx on public.gelisim_kaydi (kategori_id);

create function gizli.gelisim_kaydi_turetilen_alanlar()
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

revoke all on function gizli.gelisim_kaydi_turetilen_alanlar() from public, anon;

create trigger gelisim_kaydi_turetilen
  before insert or update on public.gelisim_kaydi
  for each row execute function gizli.gelisim_kaydi_turetilen_alanlar();

alter table public.gelisim_kaydi enable row level security;
revoke all on public.gelisim_kaydi from anon;
-- Kayıt başka öğrenciye/kuruma taşınamaz, giren kişi sonradan değiştirilemez;
-- kok_kurum_id ve foto_yolu istemciden hiç yazılamaz.
revoke insert, update on public.gelisim_kaydi from authenticated;
grant insert (kurum_id, ogrenci_id, kategori_id, not_metni, olcek_degeri, tarih, giren_kullanici_id)
  on public.gelisim_kaydi to authenticated;
grant update (kategori_id, not_metni, olcek_degeri, tarih) on public.gelisim_kaydi to authenticated;

-- ---------------------------------------------------------------------------
-- super_admin: tümü
-- kurum_admin: yönettiği kurumlarda tümü; kayıt eklerken giren kişi kendisi olmalı
-- ogretmen: kendi öğrencilerinin tüm kayıtlarını okur; yalnızca kendi girdiğini değiştirir/siler
-- veli: kendi çocuklarına yalnızca select
-- ---------------------------------------------------------------------------
create policy gelisim_kaydi_super_admin on public.gelisim_kaydi
  for all to authenticated
  using ((select gizli.mevcut_rol()) = 'super_admin')
  with check ((select gizli.mevcut_rol()) = 'super_admin');

create policy gelisim_kaydi_kurum_admin_oku on public.gelisim_kaydi
  for select to authenticated
  using (kurum_id in (select gizli.yonetilen_kurum_idleri()));

create policy gelisim_kaydi_kurum_admin_yaz on public.gelisim_kaydi
  for insert to authenticated
  with check (
    kurum_id in (select gizli.yonetilen_kurum_idleri())
    and giren_kullanici_id = (select gizli.mevcut_kullanici_id())
  );

create policy gelisim_kaydi_kurum_admin_guncelle on public.gelisim_kaydi
  for update to authenticated
  using (kurum_id in (select gizli.yonetilen_kurum_idleri()))
  with check (kurum_id in (select gizli.yonetilen_kurum_idleri()));

create policy gelisim_kaydi_kurum_admin_sil on public.gelisim_kaydi
  for delete to authenticated
  using (kurum_id in (select gizli.yonetilen_kurum_idleri()));

create policy gelisim_kaydi_ogretmen_oku on public.gelisim_kaydi
  for select to authenticated
  using (gizli.ogretmen_ogrencisi_mi(ogrenci_id));

create policy gelisim_kaydi_ogretmen_yaz on public.gelisim_kaydi
  for insert to authenticated
  with check (
    gizli.ogretmen_ogrencisi_mi(ogrenci_id)
    and giren_kullanici_id = (select gizli.mevcut_kullanici_id())
  );

create policy gelisim_kaydi_ogretmen_guncelle on public.gelisim_kaydi
  for update to authenticated
  using (
    gizli.ogretmen_ogrencisi_mi(ogrenci_id)
    and giren_kullanici_id = (select gizli.mevcut_kullanici_id())
  )
  with check (
    gizli.ogretmen_ogrencisi_mi(ogrenci_id)
    and giren_kullanici_id = (select gizli.mevcut_kullanici_id())
  );

create policy gelisim_kaydi_ogretmen_sil on public.gelisim_kaydi
  for delete to authenticated
  using (
    gizli.ogretmen_ogrencisi_mi(ogrenci_id)
    and giren_kullanici_id = (select gizli.mevcut_kullanici_id())
  );

create policy gelisim_kaydi_veli_oku on public.gelisim_kaydi
  for select to authenticated
  using (gizli.veli_ogrencisi_mi(ogrenci_id));
