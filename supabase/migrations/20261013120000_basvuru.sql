-- Başvuruyla kayıt: veli çocuğu için ön kayıt, öğretmen adayı kuruma katılma başvurusu yapar;
-- kurum yöneticisi onaylar ya da reddeder. Onayla birlikte öğrenci + veli hesabı ya da personel
-- hesabı mevcut akışlarla (tckn-hesap-olustur, personel-yonet > davet_et) oluşur.
--
-- Başvuran giriş yapmamıştır. Bu yüzden tabloya İSTEMCİDEN HİÇ YAZILMAZ: ekleme ve karar yalnızca
-- `basvuru` Edge Function'ından (service role) yapılır; fonksiyon hız sınırı uygular ve müşteri
-- başvuruyu açmadıysa (kök kurumun `ozellikler.basvuru` bayrağı; yalnızca süper admin yazar)
-- reddeder. Yönetici yalnızca okur ve — veri saklamamak için — sonuçlanmış başvuruyu siler.

create type public.basvuru_turu as enum ('ogrenci', 'personel');
create type public.basvuru_durumu as enum ('bekliyor', 'onaylandi', 'reddedildi');

-- Yeni başvuruda yöneticiye giden bildirim. Aynı transaction'da kullanılmaz.
alter type public.bildirim_tipi add value if not exists 'basvuru';

create table public.basvuru (
  id uuid primary key default gen_random_uuid(),
  -- Başvurulan kurum (ana kurum ya da şube).
  kurum_id uuid not null references public.kurum (id) on delete cascade,
  -- Müşteri (kök kurum); trigger doldurur.
  kok_kurum_id uuid not null references public.kurum (id),
  tur public.basvuru_turu not null,
  durum public.basvuru_durumu not null default 'bekliyor',
  -- Öğrenci başvurusunda öğrencinin, personel başvurusunda başvuranın adı.
  ad_soyad text not null,
  -- Yalnızca öğrenci başvurusu
  dogum_tarihi date,
  tckn text,
  veli_ad_soyad text,
  veli_telefon text,
  -- Yalnızca personel başvurusu
  eposta text,
  -- Başvuranın notu (isteğe bağlı)
  not_metni text,
  karar_veren_kullanici_id uuid references public.kullanici (id) on delete set null,
  karar_tarihi timestamptz,
  karar_notu text,
  olusturma_tarihi timestamptz not null default now(),
  constraint basvuru_ad_uzunluk check (char_length(btrim(ad_soyad)) between 1 and 120),
  constraint basvuru_not_uzunluk check (not_metni is null or char_length(not_metni) <= 1000),
  constraint basvuru_karar_notu_uzunluk check (karar_notu is null or char_length(karar_notu) <= 500),
  -- "is not null" koşulları açıkça yazıldı: check, sonucu NULL olan ifadeyi geçirir.
  constraint basvuru_tur_alanlari check (
    (
      tur = 'ogrenci'
      and dogum_tarihi is not null
      and tckn is not null and tckn ~ '^[1-9][0-9]{10}$'
      and veli_ad_soyad is not null and char_length(btrim(veli_ad_soyad)) between 1 and 120
      and veli_telefon is not null and veli_telefon ~ '^[0-9+ ]{10,20}$'
      and eposta is null
    )
    or (
      tur = 'personel'
      and eposta is not null and eposta ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      and char_length(eposta) <= 254
      and dogum_tarihi is null and tckn is null and veli_ad_soyad is null and veli_telefon is null
    )
  ),
  constraint basvuru_karar_tutarli check ((durum = 'bekliyor') = (karar_tarihi is null))
);

create index basvuru_kurum_durum_idx on public.basvuru (kurum_id, durum, olusturma_tarihi desc);
create index basvuru_kok_kurum_tarih_idx on public.basvuru (kok_kurum_id, olusturma_tarihi desc);

create function gizli.basvuru_kok_kurum_doldur()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.kok_kurum_id := gizli.kok_kurum_id(new.kurum_id);
  return new;
end;
$$;

revoke all on function gizli.basvuru_kok_kurum_doldur() from public, anon;

create trigger basvuru_kok_kurum
  before insert or update of kurum_id on public.basvuru
  for each row execute function gizli.basvuru_kok_kurum_doldur();

alter table public.basvuru enable row level security;
revoke all on public.basvuru from anon;
-- İstemci eklemez ve değiştirmez; karar Edge Function'dan verilir (hesap açmayla birlikte).
revoke insert, update on public.basvuru from authenticated;

create policy basvuru_super_admin_oku on public.basvuru
  for select to authenticated
  using ((select gizli.mevcut_rol()) = 'super_admin');

-- Kök admin şubelerine gelen başvuruları da görür; şube admini yalnızca kendi şubesininkileri.
create policy basvuru_kurum_admin_oku on public.basvuru
  for select to authenticated
  using (kurum_id in (select gizli.yonetilen_kurum_idleri()));

-- Sonuçlanmış başvuru silinebilir (reddedilen başvurunun kişisel verisi saklanmak zorunda kalmasın).
create policy basvuru_kurum_admin_sil on public.basvuru
  for delete to authenticated
  using (
    kurum_id in (select gizli.yonetilen_kurum_idleri())
    and durum <> 'bekliyor'
  );
