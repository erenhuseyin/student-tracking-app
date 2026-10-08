-- Veliden kuruma iki tek yönlü kanal. İkisi de mesajlaşma DEĞİLDİR: kurum uygulamadan yanıt yazmaz.
--
--   1. devamsizlik_bildirimi — veli çocuğunun bir gün gelmeyeceğini önceden bildirir; öğretmen
--      o günün yoklamasını alırken notu görür. Yoklamanın kendisini değiştirmez (yoklamayı yine
--      öğretmen işaretler).
--   2. oneri — veli kuruma öneri/görüş yazar; yalnızca kurum yöneticileri okur.

-- ---------------------------------------------------------------------------
-- 1. devamsizlik_bildirimi
-- ---------------------------------------------------------------------------
create table public.devamsizlik_bildirimi (
  id uuid primary key default gen_random_uuid(),
  kurum_id uuid not null references public.kurum (id),
  ogrenci_id uuid not null,
  tarih date not null,
  neden text not null,
  giren_kullanici_id uuid not null references public.kullanici (id) on delete cascade,
  olusturma_tarihi timestamptz not null default now(),
  constraint devamsizlik_bildirimi_neden_uzunluk check (char_length(btrim(neden)) between 1 and 300),
  -- Bir gün için tek bildirim.
  constraint devamsizlik_bildirimi_ogrenci_tarih_key unique (ogrenci_id, tarih),
  constraint devamsizlik_bildirimi_ogrenci_ayni_kurum_fkey
    foreign key (ogrenci_id, kurum_id) references public.ogrenci (id, kurum_id) on delete cascade
);

create index devamsizlik_bildirimi_kurum_tarih_idx on public.devamsizlik_bildirimi (kurum_id, tarih);

alter table public.devamsizlik_bildirimi enable row level security;
revoke all on public.devamsizlik_bildirimi from anon;
-- Bildirim değiştirilmez; yanlışsa silinip yenisi yazılır.
revoke insert, update on public.devamsizlik_bildirimi from authenticated;
grant insert (kurum_id, ogrenci_id, tarih, neden, giren_kullanici_id) on public.devamsizlik_bildirimi to authenticated;

create policy devamsizlik_bildirimi_super_admin on public.devamsizlik_bildirimi
  for all to authenticated
  using ((select gizli.mevcut_rol()) = 'super_admin')
  with check ((select gizli.mevcut_rol()) = 'super_admin');

create policy devamsizlik_bildirimi_kurum_admin_oku on public.devamsizlik_bildirimi
  for select to authenticated
  using (kurum_id in (select gizli.yonetilen_kurum_idleri()));

create policy devamsizlik_bildirimi_ogretmen_oku on public.devamsizlik_bildirimi
  for select to authenticated
  using (gizli.ogretmen_ogrencisi_mi(ogrenci_id));

create policy devamsizlik_bildirimi_veli_oku on public.devamsizlik_bildirimi
  for select to authenticated
  using (gizli.veli_ogrencisi_mi(ogrenci_id));

-- Veli yalnızca kendi çocuğu için, kendi adına ve geçmişe dönük olmayan bir gün için bildirir.
-- "Dün"e izin verilir: sunucu saati UTC, kullanıcı Türkiye saatinde — gece yarısına yakın
-- "bugün" sunucuda henüz dün olabilir.
create policy devamsizlik_bildirimi_veli_yaz on public.devamsizlik_bildirimi
  for insert to authenticated
  with check (
    gizli.veli_ogrencisi_mi(ogrenci_id)
    and giren_kullanici_id = (select gizli.mevcut_kullanici_id())
    and tarih >= current_date - 1
    and tarih <= current_date + 60
  );

-- Veli çocuğunun bildirimini geri alabilir (kardeş hesabından girilmiş olsa da).
create policy devamsizlik_bildirimi_veli_sil on public.devamsizlik_bildirimi
  for delete to authenticated
  using (gizli.veli_ogrencisi_mi(ogrenci_id));

-- ---------------------------------------------------------------------------
-- 2. oneri
-- ---------------------------------------------------------------------------
create table public.oneri (
  id uuid primary key default gen_random_uuid(),
  -- Velinin kurumu (şube olabilir).
  kurum_id uuid not null references public.kurum (id) on delete cascade,
  -- Müşteri (kök kurum); trigger doldurur.
  kok_kurum_id uuid not null references public.kurum (id),
  giren_kullanici_id uuid not null,
  metin text not null,
  okundu boolean not null default false,
  olusturma_tarihi timestamptz not null default now(),
  constraint oneri_metin_uzunluk check (char_length(btrim(metin)) between 1 and 1000),
  constraint oneri_giren_ayni_kurum_fkey
    foreign key (giren_kullanici_id, kurum_id) references public.kullanici (id, kurum_id) on delete cascade
);

create index oneri_kurum_tarih_idx on public.oneri (kurum_id, olusturma_tarihi desc);
create index oneri_giren_idx on public.oneri (giren_kullanici_id, olusturma_tarihi desc);

-- kok_kurum_id'yi doldurur ve kötüye kullanımı sınırlar: bir kişi 24 saatte en fazla 5 öneri yazar.
create function gizli.oneri_ekleme_kontrol()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.kok_kurum_id := gizli.kok_kurum_id(new.kurum_id);
  if (
    select count(*) from public.oneri o
    where o.giren_kullanici_id = new.giren_kullanici_id
      and o.olusturma_tarihi > now() - interval '24 hours'
  ) >= 5 then
    raise exception 'Günlük öneri sınırına ulaşıldı'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke all on function gizli.oneri_ekleme_kontrol() from public, anon;

create trigger oneri_ekleme
  before insert on public.oneri
  for each row execute function gizli.oneri_ekleme_kontrol();

alter table public.oneri enable row level security;
revoke all on public.oneri from anon;
-- Metin değiştirilmez; yönetici yalnızca okundu olarak işaretler.
revoke insert, update on public.oneri from authenticated;
grant insert (kurum_id, giren_kullanici_id, metin) on public.oneri to authenticated;
grant update (okundu) on public.oneri to authenticated;

create policy oneri_super_admin on public.oneri
  for all to authenticated
  using ((select gizli.mevcut_rol()) = 'super_admin')
  with check ((select gizli.mevcut_rol()) = 'super_admin');

-- Veli yalnızca kendi adına ve kendi kurumuna yazar; yalnızca kendi yazdıklarını görür.
create policy oneri_veli_yaz on public.oneri
  for insert to authenticated
  with check (
    (select gizli.mevcut_rol()) = 'veli'
    and giren_kullanici_id = (select gizli.mevcut_kullanici_id())
    and kurum_id = (select gizli.mevcut_kurum_id())
  );

create policy oneri_giren_oku on public.oneri
  for select to authenticated
  using (giren_kullanici_id = (select gizli.mevcut_kullanici_id()));

-- Kök admin şubelere yazılanları da okur; şube admini yalnızca kendi şubesininkileri.
create policy oneri_kurum_admin_oku on public.oneri
  for select to authenticated
  using (kurum_id in (select gizli.yonetilen_kurum_idleri()));

create policy oneri_kurum_admin_guncelle on public.oneri
  for update to authenticated
  using (kurum_id in (select gizli.yonetilen_kurum_idleri()))
  with check (kurum_id in (select gizli.yonetilen_kurum_idleri()));

create policy oneri_kurum_admin_sil on public.oneri
  for delete to authenticated
  using (kurum_id in (select gizli.yonetilen_kurum_idleri()));
