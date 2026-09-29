-- Veli girişini TCKN + PIN'e çevirme (bkz. docs/ILERLEME.md "Sıradaki İş").
-- TCKN yalnızca service-role Edge Function'lar (tckn-hesap-olustur) tarafından yazılır;
-- istemci (kurum_admin dahil) bu kolona insert/update yapamaz.

alter table public.ogrenci
  add column tckn text unique,
  add constraint ogrenci_tckn_format check (tckn is null or tckn ~ '^[0-9]{11}$');

revoke insert, update on public.ogrenci from authenticated;
grant insert (kurum_id, sinif_id, ad_soyad, dogum_tarihi) on public.ogrenci to authenticated;
grant update (kurum_id, sinif_id, ad_soyad, dogum_tarihi) on public.ogrenci to authenticated;
