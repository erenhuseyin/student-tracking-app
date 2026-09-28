-- 20260928120000_yoklama.sql'in devamı: temel tablo o dosyada elle (Dashboard SQL Editor'den)
-- uygulanırken giren_kullanici_id FK'si atlanmıştı; burada tamamlanıyor. Ayrı dosya olmasının
-- sebebi bu: dosyalar DB'nin gerçek uygulanma sırasını yansıtır.

alter table public.yoklama
  add constraint yoklama_giren_kullanici_id_fkey foreign key (giren_kullanici_id) references public.kullanici (id);

create index yoklama_kurum_id_idx on public.yoklama (kurum_id);
create index yoklama_ogrenci_id_idx on public.yoklama (ogrenci_id);
create index yoklama_tarih_idx on public.yoklama (tarih);

alter table public.yoklama enable row level security;
revoke all on public.yoklama from anon;

-- ---------------------------------------------------------------------------
-- super_admin: tümü | kurum_admin: kendi kurumu (tümü)
-- ogretmen: kendi öğrencilerine insert/update/select, delete yok (yanlış giriş üzerine yazılır)
-- veli: kendi çocuklarına yalnızca select
-- ---------------------------------------------------------------------------
create policy yoklama_super_admin on public.yoklama
  for all to authenticated
  using ((select gizli.mevcut_rol()) = 'super_admin')
  with check ((select gizli.mevcut_rol()) = 'super_admin');

create policy yoklama_kurum_admin on public.yoklama
  for all to authenticated
  using (
    (select gizli.mevcut_rol()) = 'kurum_admin'
    and kurum_id = (select gizli.mevcut_kurum_id())
  )
  with check (
    (select gizli.mevcut_rol()) = 'kurum_admin'
    and kurum_id = (select gizli.mevcut_kurum_id())
  );

create policy yoklama_ogretmen_oku on public.yoklama
  for select to authenticated
  using (gizli.ogretmen_ogrencisi_mi(ogrenci_id));

-- Öğretmen yalnızca kendi girdiği kullanıcı olarak kayıt oluşturabilir/güncelleyebilir
-- (giren_kullanici_id sahteciliği engellenir).
create policy yoklama_ogretmen_yaz on public.yoklama
  for insert to authenticated
  with check (
    gizli.ogretmen_ogrencisi_mi(ogrenci_id)
    and giren_kullanici_id = (select gizli.mevcut_kullanici_id())
  );

create policy yoklama_ogretmen_guncelle on public.yoklama
  for update to authenticated
  using (gizli.ogretmen_ogrencisi_mi(ogrenci_id))
  with check (
    gizli.ogretmen_ogrencisi_mi(ogrenci_id)
    and giren_kullanici_id = (select gizli.mevcut_kullanici_id())
  );

create policy yoklama_veli_oku on public.yoklama
  for select to authenticated
  using (gizli.veli_ogrencisi_mi(ogrenci_id));
