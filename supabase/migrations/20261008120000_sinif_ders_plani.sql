-- Sınıfın haftalık ders planı: hangi günler ders var. Haftalık yoklama tablosunun sütunlarını
-- ve "işaretlenmemiş ders günü" uyarısını belirler; katılım oranı istemcide yoklama
-- kayıtlarından hesaplanır (yoklama tablosu ve politikaları değişmedi).
--
-- Plan "şu haftadan itibaren geçerli" olarak saklanır: ders günleri değişince yeni bir satır
-- eklenir, önceki haftaların planı (ve dolayısıyla geçmiş tabloları) değişmez.
-- Bir hafta için geçerli plan = baslangic_tarihi <= o haftanın pazartesisi olan en yeni satır.

create table public.sinif_ders_plani (
  id uuid primary key default gen_random_uuid(),
  kurum_id uuid not null references public.kurum (id),
  sinif_id uuid not null,
  -- Planın geçerli olduğu ilk haftanın pazartesisi.
  baslangic_tarihi date not null,
  -- ISO hafta günleri: 1 = Pazartesi ... 7 = Pazar.
  ders_gunleri smallint[] not null,
  olusturma_tarihi timestamptz not null default now(),
  constraint sinif_ders_plani_sinif_hafta_key unique (sinif_id, baslangic_tarihi),
  constraint sinif_ders_plani_pazartesi check (extract(isodow from baslangic_tarihi) = 1),
  constraint sinif_ders_plani_gunler_gecerli check (
    cardinality(ders_gunleri) between 1 and 7
    and ders_gunleri <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
  ),
  constraint sinif_ders_plani_sinif_ayni_kurum_fkey
    foreign key (sinif_id, kurum_id) references public.sinif (id, kurum_id) on delete cascade
);

create index sinif_ders_plani_kurum_id_idx on public.sinif_ders_plani (kurum_id);

alter table public.sinif_ders_plani enable row level security;
revoke all on public.sinif_ders_plani from anon;
-- Plan başka sınıfa/kuruma/haftaya taşınamaz; yalnızca günleri değişir.
revoke insert, update on public.sinif_ders_plani from authenticated;
grant insert (kurum_id, sinif_id, baslangic_tarihi, ders_gunleri) on public.sinif_ders_plani to authenticated;
grant update (ders_gunleri) on public.sinif_ders_plani to authenticated;

-- ---------------------------------------------------------------------------
-- super_admin: tümü | kurum_admin: yönettiği kurumlarda tümü
-- ogretmen: atandığı sınıfın planını okur, ekler, günceller (delete yok)
-- veli: çocuğunun sınıfının planını yalnızca okur (haftalık katılım oranı için)
-- ---------------------------------------------------------------------------
create policy sinif_ders_plani_super_admin on public.sinif_ders_plani
  for all to authenticated
  using ((select gizli.mevcut_rol()) = 'super_admin')
  with check ((select gizli.mevcut_rol()) = 'super_admin');

create policy sinif_ders_plani_kurum_admin on public.sinif_ders_plani
  for all to authenticated
  using (kurum_id in (select gizli.yonetilen_kurum_idleri()))
  with check (kurum_id in (select gizli.yonetilen_kurum_idleri()));

create policy sinif_ders_plani_ogretmen_oku on public.sinif_ders_plani
  for select to authenticated
  using (gizli.ogretmen_sinifi_mi(sinif_id));

create policy sinif_ders_plani_ogretmen_yaz on public.sinif_ders_plani
  for insert to authenticated
  with check (gizli.ogretmen_sinifi_mi(sinif_id));

create policy sinif_ders_plani_ogretmen_guncelle on public.sinif_ders_plani
  for update to authenticated
  using (gizli.ogretmen_sinifi_mi(sinif_id))
  with check (gizli.ogretmen_sinifi_mi(sinif_id));

create policy sinif_ders_plani_veli_oku on public.sinif_ders_plani
  for select to authenticated
  using (gizli.veli_sinifi_mi(sinif_id));
