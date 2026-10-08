-- Haftalık ders programı: bir sınıfın hangi gün hangi saatte hangi dersi yaptığı.
--
-- "Kurumun haftalık programı" ayrı veri değildir; tüm sınıfların satırlarının birleşik görünümüdür.
-- Program tek sürümdür (haftaya göre geçmişi tutulmaz) ve bilgilendirme amaçlıdır: yoklama günde
-- tek kalır (bkz. sinif_ders_plani). Uygulama, program değişince sınıfın ders günlerini
-- (sinif_ders_plani) programdaki günlerle günceller.
--
-- Ders adı serbest metindir (ayrı bir ders tablosu yok); uygulama kurumda daha önce kullanılan
-- adları öneri olarak sunar.

create table public.ders_programi (
  id uuid primary key default gen_random_uuid(),
  kurum_id uuid not null references public.kurum (id),
  sinif_id uuid not null,
  -- ISO hafta günü: 1 = Pazartesi ... 7 = Pazar.
  gun smallint not null,
  baslangic_saati time not null,
  bitis_saati time not null,
  ders_adi text not null,
  olusturma_tarihi timestamptz not null default now(),
  constraint ders_programi_gun_araligi check (gun between 1 and 7),
  constraint ders_programi_saat_sirasi check (bitis_saati > baslangic_saati),
  constraint ders_programi_ders_adi_uzunluk check (char_length(btrim(ders_adi)) between 1 and 60),
  -- Aynı sınıfta aynı gün aynı saatte başlayan iki ders olamaz.
  constraint ders_programi_sinif_gun_saat_key unique (sinif_id, gun, baslangic_saati),
  constraint ders_programi_sinif_ayni_kurum_fkey
    foreign key (sinif_id, kurum_id) references public.sinif (id, kurum_id) on delete cascade
);

create index ders_programi_kurum_id_idx on public.ders_programi (kurum_id);

alter table public.ders_programi enable row level security;
revoke all on public.ders_programi from anon;
-- Satır başka sınıfa/kuruma taşınamaz.
revoke insert, update on public.ders_programi from authenticated;
grant insert (kurum_id, sinif_id, gun, baslangic_saati, bitis_saati, ders_adi) on public.ders_programi to authenticated;
grant update (gun, baslangic_saati, bitis_saati, ders_adi) on public.ders_programi to authenticated;

-- ---------------------------------------------------------------------------
-- super_admin: tümü | kurum_admin: yönettiği kurumlarda tümü
-- ogretmen: atandığı sınıfın programını okur ve düzenler (ders günleriyle aynı yetki)
-- veli: çocuğunun sınıfının programını yalnızca okur
-- ---------------------------------------------------------------------------
create policy ders_programi_super_admin on public.ders_programi
  for all to authenticated
  using ((select gizli.mevcut_rol()) = 'super_admin')
  with check ((select gizli.mevcut_rol()) = 'super_admin');

create policy ders_programi_kurum_admin on public.ders_programi
  for all to authenticated
  using (kurum_id in (select gizli.yonetilen_kurum_idleri()))
  with check (kurum_id in (select gizli.yonetilen_kurum_idleri()));

create policy ders_programi_ogretmen on public.ders_programi
  for all to authenticated
  using (gizli.ogretmen_sinifi_mi(sinif_id))
  with check (gizli.ogretmen_sinifi_mi(sinif_id));

create policy ders_programi_veli_oku on public.ders_programi
  for select to authenticated
  using (gizli.veli_sinifi_mi(sinif_id));
