-- Veliye yoklama bildirimi (push) — Faz 1 son madde.
-- kullanici.expo_push_token: bildirim gönderilecek cihaz token'ı (tek cihaz, MVP sınırı).
-- bildirim_log: gönderim denemesi kaydı, denetim amaçlı (spec Bölüm 4).

create type public.bildirim_tipi as enum ('yoklama', 'gelisim_kaydi');

alter table public.kullanici add column expo_push_token text;

-- İstemci yalnızca kendi push token'ını yazabilsin; mevcut tek grant listesi genişletiliyor
-- (bkz. 20260925120200_rls.sql). Yeni RLS politikası gerekmiyor — kullanici_kendi_satiri_guncelle
-- zaten auth_id = auth.uid() ile sınırlıyor, kolon yetkisi tek eksik parçaydı.
revoke insert, update, delete on public.kullanici from authenticated;
grant update (ad_soyad, rol, expo_push_token) on public.kullanici to authenticated;

create table public.bildirim_log (
  id uuid primary key default gen_random_uuid(),
  kurum_id uuid not null references public.kurum (id),
  alici_kullanici_id uuid not null,
  tip public.bildirim_tipi not null,
  gonderim_tarihi timestamptz not null default now(),
  okundu_mu boolean not null default false,
  constraint bildirim_log_alici_ayni_kurum_fkey
    foreign key (alici_kullanici_id, kurum_id) references public.kullanici (id, kurum_id)
);

create index bildirim_log_kurum_id_idx on public.bildirim_log (kurum_id);
create index bildirim_log_alici_kullanici_id_idx on public.bildirim_log (alici_kullanici_id);

alter table public.bildirim_log enable row level security;
revoke all on public.bildirim_log from anon;
-- İstemciden insert/update/delete yok; yalnızca service-role Edge Function yazar
-- (kullanici tablosundaki kilitleme deseniyle aynı).
revoke insert, update, delete on public.bildirim_log from authenticated;

create policy bildirim_log_super_admin on public.bildirim_log
  for all to authenticated
  using ((select gizli.mevcut_rol()) = 'super_admin')
  with check ((select gizli.mevcut_rol()) = 'super_admin');

create policy bildirim_log_kurum_admin_oku on public.bildirim_log
  for select to authenticated
  using ((select gizli.mevcut_rol()) = 'kurum_admin' and kurum_id = (select gizli.mevcut_kurum_id()));

create policy bildirim_log_veli_oku on public.bildirim_log
  for select to authenticated
  using (alici_kullanici_id = (select gizli.mevcut_kullanici_id()));
