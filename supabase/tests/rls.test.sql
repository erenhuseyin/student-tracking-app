-- RLS izolasyon / erişim testi.
--
-- Tek transaction içinde sahte veri üretir, her personayı `authenticated` (ya da `anon`)
-- rolüyle çalıştırıp beklenen sonuçları doğrular, en sonda ROLLBACK yapar (iz bırakmaz).
-- Bir doğrulama başarısız olursa "BAŞARISIZ: ..." mesajıyla hata fırlatılır.
--
-- Çalıştırma:  npx supabase db query --linked -f supabase/tests/rls.test.sql
-- (ya da Dashboard > SQL Editor'e yapıştır)
--
-- Sahte veri:
--   Kurum A: sinif sA1, sA2 | ogrenci oA1, oA2 (sA1), oA3 (sA2)
--            adminA, ogrA0 (atamasız), ogrA1 (sA1), ogrA2 (sA2), veliA1 (oA1, oA2), veliA2 (oA2)
--   Kurum B: sinif sB1 | ogrenci oB1 | adminB, ogrB (sB1), veliB (oB1)
--   Süper admin: sa | Kaydı olmayan auth kullanıcısı: ghost
--
-- Kimlikler: auth_id = a0000000-...-0000000000NN, kullanici.id = b0000000-...-0000000000NN
--   01 sa, 02 adminA, 03 adminB, 04 ogrA0, 05 ogrA1, 06 ogrA2, 07 ogrB,
--   08 veliA1, 09 veliA2, 10 veliB, 11 ghost (yalnızca auth)

begin;

-- ---------------------------------------------------------------------------
-- Yardımcılar (transaction sonunda geri alınır)
-- ---------------------------------------------------------------------------
create schema tst;
grant usage on schema tst to anon, authenticated;

create function tst.esit(p_etiket text, p_gercek text, p_beklenen text)
returns void language plpgsql as $$
begin
  if p_gercek is distinct from p_beklenen then
    raise exception 'BAŞARISIZ: % (gerçek=%, beklenen=%)', p_etiket, p_gercek, p_beklenen;
  end if;
end $$;

-- SQL'i çağıran rolle çalıştırır: 'ok:<etkilenen satır>' ya da 'hata:<sqlstate>' döner.
create function tst.dene(p_sql text)
returns text language plpgsql as $$
declare n bigint;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return 'ok:' || n;
exception when others then
  return 'hata:' || sqlstate;
end $$;

grant execute on all functions in schema tst to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Sahte veri (postgres rolüyle)
-- ---------------------------------------------------------------------------
insert into auth.users (id, aud, role, email) values
  ('a0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'sa@test.local'),
  ('a0000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'admina@test.local'),
  ('a0000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'adminb@test.local'),
  ('a0000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'ogra0@test.local'),
  ('a0000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'ogra1@test.local'),
  ('a0000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'ogra2@test.local'),
  ('a0000000-0000-0000-0000-000000000007', 'authenticated', 'authenticated', 'ogrb@test.local'),
  ('a0000000-0000-0000-0000-000000000008', 'authenticated', 'authenticated', 'velia1@test.local'),
  ('a0000000-0000-0000-0000-000000000009', 'authenticated', 'authenticated', 'velia2@test.local'),
  ('a0000000-0000-0000-0000-000000000010', 'authenticated', 'authenticated', 'velib@test.local'),
  ('a0000000-0000-0000-0000-000000000011', 'authenticated', 'authenticated', 'ghost@test.local');

insert into public.kurum (id, ad) values
  ('c0000000-0000-0000-0000-00000000000a', 'Kurum A'),
  ('c0000000-0000-0000-0000-00000000000b', 'Kurum B');

insert into public.kullanici (id, auth_id, rol, kurum_id, ad_soyad) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'super_admin', null, 'SA'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'kurum_admin', 'c0000000-0000-0000-0000-00000000000a', 'adminA'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'kurum_admin', 'c0000000-0000-0000-0000-00000000000b', 'adminB'),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 'ogretmen', 'c0000000-0000-0000-0000-00000000000a', 'ogrA0'),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000005', 'ogretmen', 'c0000000-0000-0000-0000-00000000000a', 'ogrA1'),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000006', 'ogretmen', 'c0000000-0000-0000-0000-00000000000a', 'ogrA2'),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000007', 'ogretmen', 'c0000000-0000-0000-0000-00000000000b', 'ogrB'),
  ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000008', 'veli', 'c0000000-0000-0000-0000-00000000000a', 'veliA1'),
  ('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000009', 'veli', 'c0000000-0000-0000-0000-00000000000a', 'veliA2'),
  ('b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000010', 'veli', 'c0000000-0000-0000-0000-00000000000b', 'veliB');

insert into public.sinif (id, kurum_id, ad, donem) values
  ('d0000000-0000-0000-0000-0000000000a1', 'c0000000-0000-0000-0000-00000000000a', 'sA1', '2026'),
  ('d0000000-0000-0000-0000-0000000000a2', 'c0000000-0000-0000-0000-00000000000a', 'sA2', '2026'),
  ('d0000000-0000-0000-0000-0000000000b1', 'c0000000-0000-0000-0000-00000000000b', 'sB1', '2026');

insert into public.ogrenci (id, kurum_id, sinif_id, ad_soyad, dogum_tarihi) values
  ('e0000000-0000-0000-0000-0000000000a1', 'c0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-0000000000a1', 'oA1', '2020-01-01'),
  ('e0000000-0000-0000-0000-0000000000a2', 'c0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-0000000000a1', 'oA2', '2020-01-02'),
  ('e0000000-0000-0000-0000-0000000000a3', 'c0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-0000000000a2', 'oA3', '2020-01-03'),
  ('e0000000-0000-0000-0000-0000000000b1', 'c0000000-0000-0000-0000-00000000000b', 'd0000000-0000-0000-0000-0000000000b1', 'oB1', '2020-01-04');

-- veliA1 -> oA1, oA2 | veliA2 -> oA2 (oA2'nin iki velisi var) | oA3'ün velisi yok | veliB -> oB1
insert into public.veli_ogrenci (kurum_id, veli_id, ogrenci_id) values
  ('c0000000-0000-0000-0000-00000000000a', 'b0000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-0000000000a1'),
  ('c0000000-0000-0000-0000-00000000000a', 'b0000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-0000000000a2'),
  ('c0000000-0000-0000-0000-00000000000a', 'b0000000-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-0000000000a2'),
  ('c0000000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-000000000010', 'e0000000-0000-0000-0000-0000000000b1');

insert into public.ogretmen_sinif (kurum_id, ogretmen_id, sinif_id) values
  ('c0000000-0000-0000-0000-00000000000a', 'b0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-0000000000a1'),
  ('c0000000-0000-0000-0000-00000000000a', 'b0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-0000000000a2'),
  ('c0000000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-0000000000b1');

-- ===========================================================================
-- 1. ANON: hiçbir tabloya erişemez
-- ===========================================================================
reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;

select tst.esit('anon kurum', tst.dene('select 1 from public.kurum'), 'hata:42501');
select tst.esit('anon kullanici', tst.dene('select 1 from public.kullanici'), 'hata:42501');
select tst.esit('anon sinif', tst.dene('select 1 from public.sinif'), 'hata:42501');
select tst.esit('anon ogrenci', tst.dene('select 1 from public.ogrenci'), 'hata:42501');
select tst.esit('anon veli_ogrenci', tst.dene('select 1 from public.veli_ogrenci'), 'hata:42501');
select tst.esit('anon ogretmen_sinif', tst.dene('select 1 from public.ogretmen_sinif'), 'hata:42501');

-- ===========================================================================
-- 2. GHOST: auth kullanıcısı var ama kullanici kaydı yok -> hiçbir şey göremez
-- ===========================================================================
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000011","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('ghost kurum', (select count(*) from public.kurum)::text, '0');
select tst.esit('ghost kullanici', (select count(*) from public.kullanici)::text, '0');
select tst.esit('ghost sinif', (select count(*) from public.sinif)::text, '0');
select tst.esit('ghost ogrenci', (select count(*) from public.ogrenci)::text, '0');
select tst.esit('ghost veli_ogrenci', (select count(*) from public.veli_ogrenci)::text, '0');
select tst.esit('ghost ogretmen_sinif', (select count(*) from public.ogretmen_sinif)::text, '0');

-- ===========================================================================
-- 3. SÜPER ADMİN: her şeyi görür
-- ===========================================================================
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('sa kurum', (select count(*) from public.kurum)::text, '2');
select tst.esit('sa kullanici', (select count(*) from public.kullanici)::text, '10');
select tst.esit('sa sinif', (select count(*) from public.sinif)::text, '3');
select tst.esit('sa ogrenci', (select count(*) from public.ogrenci)::text, '4');
select tst.esit('sa veli_ogrenci', (select count(*) from public.veli_ogrenci)::text, '4');
select tst.esit('sa ogretmen_sinif', (select count(*) from public.ogretmen_sinif)::text, '3');

-- ===========================================================================
-- 4. KURUM ADMİNİ A: yalnızca A kurumunu görür, B'den tek satır sızmaz
-- ===========================================================================
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('adminA kurum', (select count(*) from public.kurum)::text, '1');
select tst.esit('adminA kullanici', (select count(*) from public.kullanici)::text, '5');
select tst.esit('adminA sinif', (select count(*) from public.sinif)::text, '2');
select tst.esit('adminA ogrenci', (select count(*) from public.ogrenci)::text, '3');
select tst.esit('adminA veli_ogrenci', (select count(*) from public.veli_ogrenci)::text, '3');
select tst.esit('adminA ogretmen_sinif', (select count(*) from public.ogretmen_sinif)::text, '2');
select tst.esit('adminA B sızıntısı', (
  (select count(*) from public.kurum where id = 'c0000000-0000-0000-0000-00000000000b')
  + (select count(*) from public.kullanici where kurum_id = 'c0000000-0000-0000-0000-00000000000b')
  + (select count(*) from public.sinif where kurum_id = 'c0000000-0000-0000-0000-00000000000b')
  + (select count(*) from public.ogrenci where kurum_id = 'c0000000-0000-0000-0000-00000000000b')
  + (select count(*) from public.veli_ogrenci where kurum_id = 'c0000000-0000-0000-0000-00000000000b')
  + (select count(*) from public.ogretmen_sinif where kurum_id = 'c0000000-0000-0000-0000-00000000000b')
)::text, '0');

-- ===========================================================================
-- 5. KURUM ADMİNİ B: A'nın verisi B'ye sızmaz (simetri)
-- ===========================================================================
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('adminB kurum', (select count(*) from public.kurum)::text, '1');
select tst.esit('adminB kullanici', (select count(*) from public.kullanici)::text, '3');
select tst.esit('adminB sinif', (select count(*) from public.sinif)::text, '1');
select tst.esit('adminB ogrenci', (select count(*) from public.ogrenci)::text, '1');
select tst.esit('adminB veli_ogrenci', (select count(*) from public.veli_ogrenci)::text, '1');
select tst.esit('adminB ogretmen_sinif', (select count(*) from public.ogretmen_sinif)::text, '1');

-- ===========================================================================
-- 6. ÖĞRETMEN: yalnızca atandığı sınıf ve öğrencileri
-- ===========================================================================
-- ogrA1 (sA1: oA1, oA2)
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('ogrA1 kurum', (select count(*) from public.kurum)::text, '1');
select tst.esit('ogrA1 kullanici (yalnız kendisi)', (select count(*) from public.kullanici)::text, '1');
select tst.esit('ogrA1 sinif', (select string_agg(ad, ',' order by ad) from public.sinif), 'sA1');
select tst.esit('ogrA1 ogrenci', (select string_agg(ad_soyad, ',' order by ad_soyad) from public.ogrenci), 'oA1,oA2');
select tst.esit('ogrA1 aynı kurumdaki atanmadığı sınıfın öğrencisi (oA3)', (select count(*) from public.ogrenci where ad_soyad = 'oA3')::text, '0');
select tst.esit('ogrA1 veli_ogrenci (oA1:1 + oA2:2)', (select count(*) from public.veli_ogrenci)::text, '3');
select tst.esit('ogrA1 ogretmen_sinif (yalnız kendi ataması)', (select count(*) from public.ogretmen_sinif)::text, '1');

-- ogrA2 (sA2: oA3)
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000006","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('ogrA2 sinif', (select string_agg(ad, ',') from public.sinif), 'sA2');
select tst.esit('ogrA2 ogrenci', (select string_agg(ad_soyad, ',') from public.ogrenci), 'oA3');
select tst.esit('ogrA2 veli_ogrenci (oA3 velisiz)', (select count(*) from public.veli_ogrenci)::text, '0');

-- ogrA0 (atamasız) hiçbir sınıf/öğrenci göremez
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('ogrA0 sinif', (select count(*) from public.sinif)::text, '0');
select tst.esit('ogrA0 ogrenci', (select count(*) from public.ogrenci)::text, '0');

-- ogrB: A kurumunun hiçbir satırını göremez
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000007","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('ogrB ogrenci', (select string_agg(ad_soyad, ',') from public.ogrenci), 'oB1');
select tst.esit('ogrB sinif', (select string_agg(ad, ',') from public.sinif), 'sB1');

-- ===========================================================================
-- 7. VELİ (çoka çok): yalnızca bağlı çocuklar
-- ===========================================================================
-- veliA1 -> oA1, oA2
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000008","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('veliA1 ogrenci', (select string_agg(ad_soyad, ',' order by ad_soyad) from public.ogrenci), 'oA1,oA2');
select tst.esit('veliA1 sinif', (select string_agg(ad, ',') from public.sinif), 'sA1');
select tst.esit('veliA1 kullanici (yalnız kendisi)', (select count(*) from public.kullanici)::text, '1');
select tst.esit('veliA1 veli_ogrenci (yalnız kendi bağları)', (select count(*) from public.veli_ogrenci)::text, '2');
select tst.esit('veliA1 ogretmen_sinif', (select count(*) from public.ogretmen_sinif)::text, '0');

-- veliA2 -> yalnızca oA2 (oA1 ve oA3'ü göremez; oA2'nin diğer velisi de görünmez)
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000009","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('veliA2 ogrenci', (select string_agg(ad_soyad, ',') from public.ogrenci), 'oA2');
select tst.esit('veliA2 veli_ogrenci (veliA1 bağları görünmez)', (select count(*) from public.veli_ogrenci)::text, '1');

-- veliB: A'dan hiçbir şey göremez
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000010","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('veliB ogrenci', (select string_agg(ad_soyad, ',') from public.ogrenci), 'oB1');
select tst.esit('veliB sinif', (select string_agg(ad, ',') from public.sinif), 'sB1');

-- ===========================================================================
-- 8. YAZMA REDDİ: öğretmen ve veli veri değiştiremez
-- ===========================================================================
-- ogrA1 (öğretmen)
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('ogretmen ogrenci insert',
  tst.dene($q$insert into public.ogrenci (kurum_id, sinif_id, ad_soyad, dogum_tarihi) values ('c0000000-0000-0000-0000-00000000000a','d0000000-0000-0000-0000-0000000000a1','x','2020-01-01')$q$), 'hata:42501');
select tst.esit('ogretmen ogrenci update', tst.dene($q$update public.ogrenci set ad_soyad = 'x'$q$), 'ok:0');
select tst.esit('ogretmen ogrenci delete', tst.dene($q$delete from public.ogrenci$q$), 'ok:0');
select tst.esit('ogretmen sinif update', tst.dene($q$update public.sinif set ad = 'x'$q$), 'ok:0');
select tst.esit('ogretmen veli_ogrenci insert',
  tst.dene($q$insert into public.veli_ogrenci (kurum_id, veli_id, ogrenci_id) values ('c0000000-0000-0000-0000-00000000000a','b0000000-0000-0000-0000-000000000009','e0000000-0000-0000-0000-0000000000a1')$q$), 'hata:42501');
select tst.esit('ogretmen ogretmen_sinif insert',
  tst.dene($q$insert into public.ogretmen_sinif (kurum_id, ogretmen_id, sinif_id) values ('c0000000-0000-0000-0000-00000000000a','b0000000-0000-0000-0000-000000000005','d0000000-0000-0000-0000-0000000000a2')$q$), 'hata:42501');

-- veliA1 (veli)
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000008","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('veli ogrenci update', tst.dene($q$update public.ogrenci set ad_soyad = 'x'$q$), 'ok:0');
select tst.esit('veli ogrenci delete', tst.dene($q$delete from public.ogrenci$q$), 'ok:0');
select tst.esit('veli veli_ogrenci insert',
  tst.dene($q$insert into public.veli_ogrenci (kurum_id, veli_id, ogrenci_id) values ('c0000000-0000-0000-0000-00000000000a','b0000000-0000-0000-0000-000000000008','e0000000-0000-0000-0000-0000000000a3')$q$), 'hata:42501');
select tst.esit('veli veli_ogrenci delete', tst.dene($q$delete from public.veli_ogrenci$q$), 'ok:0');
select tst.esit('veli kurum update', tst.dene($q$update public.kurum set ad = 'x'$q$), 'ok:0');

-- ===========================================================================
-- 9. YETKİ YÜKSELTME (sonuç durumuna bakılır; hangi katmanın engellediği önemli değil)
-- ===========================================================================
-- ogrA0 kendi rolünü yükseltmeye çalışır
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
set local role authenticated;

select tst.dene($q$update public.kullanici set rol = 'kurum_admin' where id = 'b0000000-0000-0000-0000-000000000004'$q$);
select tst.dene($q$update public.kullanici set rol = 'super_admin', kurum_id = null where id = 'b0000000-0000-0000-0000-000000000004'$q$);
-- kurum_id değiştirme (başka kuruma geçiş): kolon yetkisi yok
select tst.esit('ogretmen kurum_id update',
  tst.dene($q$update public.kullanici set kurum_id = 'c0000000-0000-0000-0000-00000000000b' where id = 'b0000000-0000-0000-0000-000000000004'$q$), 'hata:42501');
-- pozitif kontrol: kendi adını güncelleyebilir
select tst.esit('ogretmen kendi ad_soyad update',
  tst.dene($q$update public.kullanici set ad_soyad = 'ogrA0-yeni' where id = 'b0000000-0000-0000-0000-000000000004'$q$), 'ok:1');
-- başkasının satırını güncelleyemez
select tst.esit('ogretmen başkasının ad_soyad update',
  tst.dene($q$update public.kullanici set ad_soyad = 'x' where id = 'b0000000-0000-0000-0000-000000000005'$q$), 'ok:0');

reset role;
select tst.esit('ogrA0 rolü değişmedi', (select rol::text from public.kullanici where id = 'b0000000-0000-0000-0000-000000000004'), 'ogretmen');
select tst.esit('ogrA0 kurum_id değişmedi', (select kurum_id::text from public.kullanici where id = 'b0000000-0000-0000-0000-000000000004'), 'c0000000-0000-0000-0000-00000000000a');
select tst.esit('ogrA0 ad_soyad değişti (pozitif kontrol)', (select ad_soyad from public.kullanici where id = 'b0000000-0000-0000-0000-000000000004'), 'ogrA0-yeni');

-- kurum admini A: yetki sınırları
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('adminA kullanici insert', tst.dene($q$insert into public.kullanici (auth_id, rol, kurum_id, ad_soyad) values ('a0000000-0000-0000-0000-000000000011','veli','c0000000-0000-0000-0000-00000000000a','x')$q$), 'hata:42501');
select tst.esit('adminA kullanici delete', tst.dene($q$delete from public.kullanici where id = 'b0000000-0000-0000-0000-000000000004'$q$), 'hata:42501');
select tst.esit('adminA kurum_id update (kurum değiştirme)',
  tst.dene($q$update public.kullanici set kurum_id = 'c0000000-0000-0000-0000-00000000000b' where id = 'b0000000-0000-0000-0000-000000000004'$q$), 'hata:42501');
select tst.esit('adminA B kullanicisini güncelleyemez (adminB)',
  tst.dene($q$update public.kullanici set ad_soyad = 'x' where id = 'b0000000-0000-0000-0000-000000000003'$q$), 'ok:0');
select tst.esit('adminA B kullanicisini güncelleyemez (ogrB)',
  tst.dene($q$update public.kullanici set ad_soyad = 'x' where id = 'b0000000-0000-0000-0000-000000000007'$q$), 'ok:0');
select tst.esit('adminA süper admini güncelleyemez',
  tst.dene($q$update public.kullanici set ad_soyad = 'x' where id = 'b0000000-0000-0000-0000-000000000001'$q$), 'ok:0');
select tst.esit('adminA kurum update', tst.dene($q$update public.kurum set ad = 'x'$q$), 'ok:0');
select tst.esit('adminA kurum insert', tst.dene($q$insert into public.kurum (ad) values ('x')$q$), 'hata:42501');
-- süper admin ataması denemesi (sonuç durumuna bakılır)
select tst.dene($q$update public.kullanici set rol = 'super_admin' where id = 'b0000000-0000-0000-0000-000000000004'$q$);
select tst.dene($q$update public.kullanici set rol = 'super_admin', kurum_id = null where id = 'b0000000-0000-0000-0000-000000000004'$q$);
-- pozitif kontrol: kendi kurumundaki öğretmeni kurum_admin yapabilir
select tst.esit('adminA kendi kurumunda rol atama (pozitif)',
  tst.dene($q$update public.kullanici set rol = 'kurum_admin' where id = 'b0000000-0000-0000-0000-000000000004'$q$), 'ok:1');

reset role;
select tst.esit('ogrA0 super_admin olamadı, kurum_admin oldu (adminA yetkisi)',
  (select rol::text from public.kullanici where id = 'b0000000-0000-0000-0000-000000000004'), 'kurum_admin');

-- ===========================================================================
-- 10. KURUMLAR ARASI BAĞ VE ROL DOĞRULAMA (adminA ile, RLS'i geçen ama şemayı bozan denemeler)
-- ===========================================================================
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;

-- RLS: başka kurum için satır yazamaz
select tst.esit('adminA B kurumuna sinif ekleyemez',
  tst.dene($q$insert into public.sinif (kurum_id, ad, donem) values ('c0000000-0000-0000-0000-00000000000b','x','2026')$q$), 'hata:42501');
-- Bileşik FK: A öğrencisini B sınıfına atayamaz
select tst.esit('A öğrencisi B sınıfına (FK)',
  tst.dene($q$insert into public.ogrenci (kurum_id, sinif_id, ad_soyad, dogum_tarihi) values ('c0000000-0000-0000-0000-00000000000a','d0000000-0000-0000-0000-0000000000b1','x','2020-01-01')$q$), 'hata:23503');
select tst.esit('oA1 sınıfını B sınıfına taşıma (FK)',
  tst.dene($q$update public.ogrenci set sinif_id = 'd0000000-0000-0000-0000-0000000000b1' where id = 'e0000000-0000-0000-0000-0000000000a1'$q$), 'hata:23503');
-- Bileşik FK: B velisini A öğrencisine bağlayamaz
select tst.esit('B velisi A öğrencisine (FK)',
  tst.dene($q$insert into public.veli_ogrenci (kurum_id, veli_id, ogrenci_id) values ('c0000000-0000-0000-0000-00000000000a','b0000000-0000-0000-0000-000000000010','e0000000-0000-0000-0000-0000000000a3')$q$), 'hata:23503');
-- Bileşik FK: B öğretmenini A sınıfına atayamaz
select tst.esit('B öğretmeni A sınıfına (FK)',
  tst.dene($q$insert into public.ogretmen_sinif (kurum_id, ogretmen_id, sinif_id) values ('c0000000-0000-0000-0000-00000000000a','b0000000-0000-0000-0000-000000000007','d0000000-0000-0000-0000-0000000000a1')$q$), 'hata:23503');
-- Rol trigger'ları: veli olmayan veli_ogrenci'ye, öğretmen olmayan ogretmen_sinif'e giremez
select tst.esit('öğretmen veli olarak bağlanamaz (trigger)',
  tst.dene($q$insert into public.veli_ogrenci (kurum_id, veli_id, ogrenci_id) values ('c0000000-0000-0000-0000-00000000000a','b0000000-0000-0000-0000-000000000005','e0000000-0000-0000-0000-0000000000a3')$q$), 'hata:23514');
select tst.esit('veli öğretmen olarak atanamaz (trigger)',
  tst.dene($q$insert into public.ogretmen_sinif (kurum_id, ogretmen_id, sinif_id) values ('c0000000-0000-0000-0000-00000000000a','b0000000-0000-0000-0000-000000000008','d0000000-0000-0000-0000-0000000000a1')$q$), 'hata:23514');
-- Bağı olan kullanıcının rolü değiştirilemez (veliA1'in bağları var)
select tst.esit('bağı olan velinin rolü değiştirilemez',
  tst.dene($q$update public.kullanici set rol = 'ogretmen' where id = 'b0000000-0000-0000-0000-000000000008'$q$), 'hata:23514');
-- Pozitif kontroller: meşru işlemler çalışıyor
select tst.esit('adminA kendi kurumuna sinif ekleyebilir',
  tst.dene($q$insert into public.sinif (kurum_id, ad, donem) values ('c0000000-0000-0000-0000-00000000000a','sA3','2026')$q$), 'ok:1');
select tst.esit('adminA veli-ogrenci bağı kurabilir (veliA2 -> oA3)',
  tst.dene($q$insert into public.veli_ogrenci (kurum_id, veli_id, ogrenci_id) values ('c0000000-0000-0000-0000-00000000000a','b0000000-0000-0000-0000-000000000009','e0000000-0000-0000-0000-0000000000a3')$q$), 'ok:1');

-- Süper admin kurum ekleyebilir (yeni kurum ekleme akışı)
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('sa kurum insert', tst.dene($q$insert into public.kurum (ad) values ('Kurum C')$q$), 'ok:1');
select tst.esit('sa kurum update', tst.dene($q$update public.kurum set ad = 'Kurum C2' where ad = 'Kurum C'$q$), 'ok:1');

reset role;
select 'TÜM RLS TESTLERİ GEÇTİ' as sonuc;

rollback;
