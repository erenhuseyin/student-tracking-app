-- Menü yetkisi: müşteri (kök kurum) öğretmen ve velilerine hangi bölümlerin görüneceğini seçer.
--
-- Tablo yalnızca KAPATILAN bölümleri tutar; satır yoksa bölüm açıktır. Böylece yeni eklenen
-- bölüm varsayılan olarak görünür ve tabloda güncelleme (kolon bazlı update yetkisi) gerekmez:
-- kapatmak = insert, açmak = delete.
--
-- Bu bir GÖRÜNÜRLÜK ayarıdır, güvenlik sınırı değildir: veriye erişimi diğer tabloların RLS
-- politikaları belirler ve onlar rol başına sabittir. Bölümü kapatmak yalnızca uygulamadaki
-- ekranı gizler. Yönetici bölümleri kapatılamaz (rol check'i) — kimse kendini dışarıda bırakamaz.

create table public.kapali_bolum (
  -- Her zaman kök kurum (trigger doğrular); şubeler müşterinin ayarını kullanır.
  kurum_id uuid not null references public.kurum (id) on delete cascade,
  rol public.rol not null,
  -- Uygulamadaki bölüm anahtarı (lib/menu.ts). Bilinmeyen anahtar zararsızdır, yok sayılır.
  bolum_anahtari text not null,
  olusturma_tarihi timestamptz not null default now(),
  primary key (kurum_id, rol, bolum_anahtari),
  constraint kapali_bolum_rol check (rol in ('ogretmen', 'veli')),
  constraint kapali_bolum_anahtar check (bolum_anahtari ~ '^[a-z][a-z0-9-]{0,39}$')
);

create function gizli.kapali_bolum_kok_dogrula()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.kurum k where k.id = new.kurum_id and k.ust_kurum_id is not null) then
    raise exception 'Bölüm görünürlüğü yalnızca ana kurumda ayarlanır'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke all on function gizli.kapali_bolum_kok_dogrula() from public, anon;

create trigger kapali_bolum_kok
  before insert on public.kapali_bolum
  for each row execute function gizli.kapali_bolum_kok_dogrula();

alter table public.kapali_bolum enable row level security;
revoke all on public.kapali_bolum from anon;
-- Satır değiştirilmez; yalnızca eklenir ve silinir.
revoke insert, update on public.kapali_bolum from authenticated;
grant insert (kurum_id, rol, bolum_anahtari) on public.kapali_bolum to authenticated;

create policy kapali_bolum_super_admin on public.kapali_bolum
  for all to authenticated
  using ((select gizli.mevcut_rol()) = 'super_admin')
  with check ((select gizli.mevcut_rol()) = 'super_admin');

-- Müşterinin herkesi (şube personeli ve veliler dahil) okur: uygulama kendi menüsünü buna göre kurar.
create policy kapali_bolum_musteri_oku on public.kapali_bolum
  for select to authenticated
  using (kurum_id = (select gizli.mevcut_kok_kurum_id()));

-- Yalnızca kök kurumun admini yazar (gelisim_kategorisi ile aynı desen: şube admininin
-- kurum_id'si hiçbir satırla eşleşmez).
create policy kapali_bolum_kok_admin on public.kapali_bolum
  for all to authenticated
  using (
    (select gizli.mevcut_rol()) = 'kurum_admin'
    and kurum_id = (select gizli.mevcut_kurum_id())
  )
  with check (
    (select gizli.mevcut_rol()) = 'kurum_admin'
    and kurum_id = (select gizli.mevcut_kurum_id())
  );
