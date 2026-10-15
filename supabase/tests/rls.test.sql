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

-- Kalıcı test hesapları (bkz. docs/ILERLEME.md) bu transaction'dan ÖNCE commit edilmiş
-- durumda; süper admin RLS'te sınırsız olduğu için onları da görür. "sa ..." testleri bu
-- yüzden sabit sayı yerine "mevcut kalıcı veri + bu transaction'ın eklediği veri" bekler.
select set_config('tst.taban_kurum', (select count(*) from public.kurum)::text, true);
select set_config('tst.taban_kullanici', (select count(*) from public.kullanici)::text, true);
select set_config('tst.taban_sinif', (select count(*) from public.sinif)::text, true);
select set_config('tst.taban_ogrenci', (select count(*) from public.ogrenci)::text, true);
select set_config('tst.taban_veli_ogrenci', (select count(*) from public.veli_ogrenci)::text, true);
select set_config('tst.taban_ogretmen_sinif', (select count(*) from public.ogretmen_sinif)::text, true);

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

insert into public.bildirim_log (kurum_id, alici_kullanici_id, tip) values
  ('c0000000-0000-0000-0000-00000000000a', 'b0000000-0000-0000-0000-000000000008', 'yoklama'),
  ('c0000000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-000000000010', 'yoklama');

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
select tst.esit('anon gelisim_kategorisi', tst.dene('select 1 from public.gelisim_kategorisi'), 'hata:42501');
select tst.esit('anon gelisim_kaydi', tst.dene('select 1 from public.gelisim_kaydi'), 'hata:42501');
select tst.esit('anon sinif_ders_plani', tst.dene('select 1 from public.sinif_ders_plani'), 'hata:42501');

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

select tst.esit('sa kurum', (select count(*) from public.kurum)::text, (current_setting('tst.taban_kurum')::int + 2)::text);
select tst.esit('sa kullanici', (select count(*) from public.kullanici)::text, (current_setting('tst.taban_kullanici')::int + 10)::text);
select tst.esit('sa sinif', (select count(*) from public.sinif)::text, (current_setting('tst.taban_sinif')::int + 3)::text);
select tst.esit('sa ogrenci', (select count(*) from public.ogrenci)::text, (current_setting('tst.taban_ogrenci')::int + 4)::text);
select tst.esit('sa veli_ogrenci', (select count(*) from public.veli_ogrenci)::text, (current_setting('tst.taban_veli_ogrenci')::int + 4)::text);
select tst.esit('sa ogretmen_sinif', (select count(*) from public.ogretmen_sinif)::text, (current_setting('tst.taban_ogretmen_sinif')::int + 3)::text);

-- ===========================================================================
-- 4. KURUM ADMİNİ A: yalnızca A kurumunu görür, B'den tek satır sızmaz
-- ===========================================================================
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('adminA kurum', (select count(*) from public.kurum)::text, '1');
select tst.esit('adminA kullanici', (select count(*) from public.kullanici)::text, '6');
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
select tst.esit('ogrA1 kullanici (kendisi + sınıfındaki veliler)', (select string_agg(ad_soyad, ',' order by ad_soyad) from public.kullanici), 'ogrA1,veliA1,veliA2');
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
select tst.esit('ogrA2 kullanici (sınıfında veli yok: yalnız kendisi)', (select count(*) from public.kullanici)::text, '1');

-- ogrA0 (atamasız) hiçbir sınıf/öğrenci göremez
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('ogrA0 sinif', (select count(*) from public.sinif)::text, '0');
select tst.esit('ogrA0 ogrenci', (select count(*) from public.ogrenci)::text, '0');
select tst.esit('ogrA0 kullanici (atamasız: yalnız kendisi)', (select count(*) from public.kullanici)::text, '1');

-- ogrB: A kurumunun hiçbir satırını göremez
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000007","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('ogrB ogrenci', (select string_agg(ad_soyad, ',') from public.ogrenci), 'oB1');
select tst.esit('ogrB sinif', (select string_agg(ad, ',') from public.sinif), 'sB1');
select tst.esit('ogrB kullanici (A kurumunun velileri görünmez)', (select string_agg(ad_soyad, ',' order by ad_soyad) from public.kullanici), 'ogrB,veliB');

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
select tst.esit('ogretmen veli kullanici update',
  tst.dene($q$update public.kullanici set ad_soyad = 'x' where id = 'b0000000-0000-0000-0000-000000000008'$q$), 'ok:0');
select tst.esit('ogretmen veli rol update',
  tst.dene($q$update public.kullanici set rol = 'kurum_admin' where id = 'b0000000-0000-0000-0000-000000000008'$q$), 'ok:0');
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

select tst.esit('ogretmen kendini kurum_admin yapamaz',
  tst.dene($q$update public.kullanici set rol = 'kurum_admin' where id = 'b0000000-0000-0000-0000-000000000004'$q$), 'hata:42501');
select tst.esit('ogretmen kendini super_admin yapamaz',
  tst.dene($q$update public.kullanici set rol = 'super_admin', kurum_id = null where id = 'b0000000-0000-0000-0000-000000000004'$q$), 'hata:42501');
select tst.esit('ogretmen başkasının rolünü değiştiremez',
  tst.dene($q$update public.kullanici set rol = 'kurum_admin' where id = 'b0000000-0000-0000-0000-000000000005'$q$), 'ok:0');
-- kurum_id değiştirme (başka kuruma geçiş): kolon yetkisi yok
select tst.esit('ogretmen kurum_id update',
  tst.dene($q$update public.kullanici set kurum_id = 'c0000000-0000-0000-0000-00000000000b' where id = 'b0000000-0000-0000-0000-000000000004'$q$), 'hata:42501');
-- pozitif kontrol: kendi adını güncelleyebilir
select tst.esit('ogretmen kendi ad_soyad update',
  tst.dene($q$update public.kullanici set ad_soyad = 'ogrA0-yeni' where id = 'b0000000-0000-0000-0000-000000000004'$q$), 'ok:1');
-- başkasının satırını güncelleyemez
select tst.esit('ogretmen başkasının ad_soyad update',
  tst.dene($q$update public.kullanici set ad_soyad = 'x' where id = 'b0000000-0000-0000-0000-000000000005'$q$), 'ok:0');
-- pozitif kontrol: kendi push token'ını güncelleyebilir (bkz. migration 20260930120000_bildirim)
select tst.esit('ogretmen kendi expo_push_token update',
  tst.dene($q$update public.kullanici set expo_push_token = 'ExponentPushToken[x]' where id = 'b0000000-0000-0000-0000-000000000004'$q$), 'ok:1');
-- başkasının push token'ını güncelleyemez
select tst.esit('ogretmen başkasının expo_push_token update',
  tst.dene($q$update public.kullanici set expo_push_token = 'x' where id = 'b0000000-0000-0000-0000-000000000005'$q$), 'ok:0');

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
select tst.esit('adminA kurum adını değiştiremez', tst.dene($q$update public.kurum set ad = 'x'$q$), 'hata:42501');
select tst.esit('adminA kendi kurumunun ayarlar''ını günceller',
  tst.dene($q$update public.kurum set ayarlar = '{"tema":"koyu"}'::jsonb where id = 'c0000000-0000-0000-0000-00000000000a'$q$), 'ok:1');
select tst.esit('adminA B kurumunun ayarlar''ını güncelleyemez',
  tst.dene($q$update public.kurum set ayarlar = '{"x":1}'::jsonb where id = 'c0000000-0000-0000-0000-00000000000b'$q$), 'ok:0');
select tst.esit('adminA kurum insert', tst.dene($q$insert into public.kurum (ad) values ('x')$q$), 'hata:42501');
-- süper admin ataması denemesi (sonuç durumuna bakılır)
select tst.dene($q$update public.kullanici set rol = 'super_admin' where id = 'b0000000-0000-0000-0000-000000000004'$q$);
select tst.dene($q$update public.kullanici set rol = 'super_admin', kurum_id = null where id = 'b0000000-0000-0000-0000-000000000004'$q$);
-- kurum admini bile kendi rolünü değiştiremez
select tst.esit('adminA kendi rolünü değiştiremez',
  tst.dene($q$update public.kullanici set rol = 'ogretmen' where id = 'b0000000-0000-0000-0000-000000000002'$q$), 'hata:42501');
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

-- ===========================================================================
-- 11. YOKLAMA
-- ===========================================================================
-- ogrA1 (sA1'e atanmış: oA1, oA2) kendi öğrencisine yoklama girer
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('ogrA1 kendi öğrencisine yoklama girer',
  tst.dene($q$insert into public.yoklama (kurum_id, ogrenci_id, tarih, durum, giren_kullanici_id) values ('c0000000-0000-0000-0000-00000000000a','e0000000-0000-0000-0000-0000000000a1','2026-09-28','geldi','b0000000-0000-0000-0000-000000000005')$q$), 'ok:1');
select tst.esit('ogrA1 aynı gün ikinci kayıt (unique ihlali)',
  tst.dene($q$insert into public.yoklama (kurum_id, ogrenci_id, tarih, durum, giren_kullanici_id) values ('c0000000-0000-0000-0000-00000000000a','e0000000-0000-0000-0000-0000000000a1','2026-09-28','gec','b0000000-0000-0000-0000-000000000005')$q$), 'hata:23505');
select tst.esit('ogrA1 aynı gün upsert ile günceller',
  tst.dene($q$insert into public.yoklama (kurum_id, ogrenci_id, tarih, durum, giren_kullanici_id) values ('c0000000-0000-0000-0000-00000000000a','e0000000-0000-0000-0000-0000000000a1','2026-09-28','gec','b0000000-0000-0000-0000-000000000005') on conflict (ogrenci_id, tarih) do update set durum = excluded.durum$q$), 'ok:1');
select tst.esit('ogrA1 atanmadığı öğrenciye (oA3) yoklama giremez',
  tst.dene($q$insert into public.yoklama (kurum_id, ogrenci_id, tarih, durum, giren_kullanici_id) values ('c0000000-0000-0000-0000-00000000000a','e0000000-0000-0000-0000-0000000000a3','2026-09-28','geldi','b0000000-0000-0000-0000-000000000005')$q$), 'hata:42501');
select tst.esit('ogrA1 başkası adına giren_kullanici_id ile giremez',
  tst.dene($q$insert into public.yoklama (kurum_id, ogrenci_id, tarih, durum, giren_kullanici_id) values ('c0000000-0000-0000-0000-00000000000a','e0000000-0000-0000-0000-0000000000a2','2026-09-28','geldi','b0000000-0000-0000-0000-000000000006')$q$), 'hata:42501');
select tst.esit('ogrA1 kendi girdiği kaydı günceller',
  tst.dene($q$update public.yoklama set durum = 'gelmedi' where ogrenci_id = 'e0000000-0000-0000-0000-0000000000a1' and tarih = '2026-09-28'$q$), 'ok:1');

-- ogrA2 (sA2'ye atanmış, sA1'e değil) ogrA1'in öğrencisinin kaydını göremez/güncelleyemez
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000006","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('ogrA2 ogrA1nin öğrencisinin yoklamasını göremez', (select count(*) from public.yoklama where ogrenci_id = 'e0000000-0000-0000-0000-0000000000a1')::text, '0');
select tst.esit('ogrA2 ogrA1nin öğrencisinin yoklamasını güncelleyemez',
  tst.dene($q$update public.yoklama set durum = 'gec' where ogrenci_id = 'e0000000-0000-0000-0000-0000000000a1'$q$), 'ok:0');

-- veliA1 (oA1, oA2'nin velisi) yalnızca okur
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000008","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('veliA1 oA1 yoklamasını görür', (select count(*) from public.yoklama where ogrenci_id = 'e0000000-0000-0000-0000-0000000000a1')::text, '1');
select tst.esit('veliA1 yoklama giremez',
  tst.dene($q$insert into public.yoklama (kurum_id, ogrenci_id, tarih, durum, giren_kullanici_id) values ('c0000000-0000-0000-0000-00000000000a','e0000000-0000-0000-0000-0000000000a1','2026-09-27','geldi','b0000000-0000-0000-0000-000000000008')$q$), 'hata:42501');
select tst.esit('veliA1 yoklama güncelleyemez',
  tst.dene($q$update public.yoklama set durum = 'gec' where ogrenci_id = 'e0000000-0000-0000-0000-0000000000a1'$q$), 'ok:0');

-- veliA2 (yalnızca oA2'nin velisi) oA1'in yoklamasını göremez
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000009","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('veliA2 oA1 yoklamasını göremez', (select count(*) from public.yoklama where ogrenci_id = 'e0000000-0000-0000-0000-0000000000a1')::text, '0');

-- veliB (B kurumu) A kurumunun yoklamasını hiç göremez
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000010","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('veliB A kurumunun yoklamasını göremez', (select count(*) from public.yoklama where kurum_id = 'c0000000-0000-0000-0000-00000000000a')::text, '0');

-- adminA kendi kurumunda tüm yoklamaları yönetir
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('adminA kendi kurumunun yoklamasını günceller',
  tst.dene($q$update public.yoklama set durum = 'geldi' where ogrenci_id = 'e0000000-0000-0000-0000-0000000000a1'$q$), 'ok:1');
select tst.esit('adminA B kurumunun yoklamasına yazamaz',
  tst.dene($q$insert into public.yoklama (kurum_id, ogrenci_id, tarih, durum, giren_kullanici_id) values ('c0000000-0000-0000-0000-00000000000b','e0000000-0000-0000-0000-0000000000b1','2026-09-28','geldi','b0000000-0000-0000-0000-000000000002')$q$), 'hata:42501');

-- ===========================================================================
-- 12. KULLANICI ADI: kolonu yalnızca service-role Edge Function'lar yazar
-- ===========================================================================
-- adminA (kurum_admin) bile kullanici_adi'na yazamaz (kolon yetkisi yok; bkz. 20261021120000)
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('adminA kullanici_adi güncelleyemez (kolon yetkisi yok)',
  tst.dene($q$update public.ogrenci set kullanici_adi = 'x.y' where id = 'e0000000-0000-0000-0000-0000000000a1'$q$), 'hata:42501');
select tst.esit('adminA kullanici_adi ile öğrenci insert edemez (kolon yetkisi yok)',
  tst.dene($q$insert into public.ogrenci (kurum_id, sinif_id, ad_soyad, dogum_tarihi, kullanici_adi) values ('c0000000-0000-0000-0000-00000000000a','d0000000-0000-0000-0000-0000000000a1','x','2020-01-01','x.y')$q$), 'hata:42501');
select tst.esit('adminA kullanıcı adı atama fonksiyonunu çağıramaz',
  tst.dene($q$select public.ogrenci_kullanici_adi_ata('e0000000-0000-0000-0000-0000000000a1')$q$), 'hata:42501');
-- pozitif kontrol: kullanici_adi hariç kolonlarla insert hâlâ çalışıyor
select tst.esit('adminA kullanıcı adsız öğrenci ekleyebilir (pozitif)',
  tst.dene($q$insert into public.ogrenci (kurum_id, sinif_id, ad_soyad, dogum_tarihi) values ('c0000000-0000-0000-0000-00000000000a','d0000000-0000-0000-0000-0000000000a1','x','2020-01-01')$q$), 'ok:1');

-- ===========================================================================
-- 13. BİLDİRİM_LOG: yalnızca alıcı ve kendi kurumundaki admin görebilir; istemci yazamaz
-- ===========================================================================
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000008","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('veliA1 kendi bildirimini görür', (select count(*) from public.bildirim_log)::text, '1');
select tst.esit('veliA1 bildirim insert edemez',
  tst.dene($q$insert into public.bildirim_log (kurum_id, alici_kullanici_id, tip) values ('c0000000-0000-0000-0000-00000000000a','b0000000-0000-0000-0000-000000000008','yoklama')$q$), 'hata:42501');
-- 20261014120000: alıcı kendi bildirimini okundu olarak işaretleyebilir; başka kolon yazamaz.
select tst.esit('veliA1 kendi bildirimini okundu yapar',
  tst.dene($q$update public.bildirim_log set okundu_mu = true$q$), 'ok:1');
select tst.esit('veliA1 bildirimin türünü değiştiremez',
  tst.dene($q$update public.bildirim_log set tip = 'gelisim_kaydi'$q$), 'hata:42501');
select tst.esit('veliA1 bildirimin metnini değiştiremez',
  tst.dene($q$update public.bildirim_log set metin = 'x'$q$), 'hata:42501');

reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000009","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('veliA2 (alıcı değil) hiçbir bildirim göremez', (select count(*) from public.bildirim_log)::text, '0');

reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000010","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('veliB kendi bildirimini görür, A kurumununkini görmez', (select count(*) from public.bildirim_log)::text, '1');

reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('adminA yalnızca kendi kurumunun bildirimini görür', (select count(*) from public.bildirim_log)::text, '1');

-- ===========================================================================
-- 14. KURUM HİYERARŞİSİ: kök admin şubelerini yönetir, şube admini yalnızca kendi şubesini
--   Kurum A'ya iki şube eklenir: A1 (adminA1, sinif sA1x, ogrenci oA1x) ve A2 (adminA2, sA2x, oA2x)
--   Kimlikler: 12 adminA1, 13 adminA2
-- ===========================================================================
reset role;

insert into auth.users (id, aud, role, email) values
  ('a0000000-0000-0000-0000-000000000012', 'authenticated', 'authenticated', 'admina1@test.local'),
  ('a0000000-0000-0000-0000-000000000013', 'authenticated', 'authenticated', 'admina2@test.local');

insert into public.kurum (id, ad, ust_kurum_id) values
  ('c0000000-0000-0000-0000-0000000000a1', 'Şube A1', 'c0000000-0000-0000-0000-00000000000a'),
  ('c0000000-0000-0000-0000-0000000000a2', 'Şube A2', 'c0000000-0000-0000-0000-00000000000a');

insert into public.kullanici (id, auth_id, rol, kurum_id, ad_soyad) values
  ('b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000012', 'kurum_admin', 'c0000000-0000-0000-0000-0000000000a1', 'adminA1'),
  ('b0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000013', 'kurum_admin', 'c0000000-0000-0000-0000-0000000000a2', 'adminA2');

insert into public.sinif (id, kurum_id, ad, donem) values
  ('d0000000-0000-0000-0000-000000000a11', 'c0000000-0000-0000-0000-0000000000a1', 'sA1x', '2026'),
  ('d0000000-0000-0000-0000-000000000a21', 'c0000000-0000-0000-0000-0000000000a2', 'sA2x', '2026');

insert into public.ogrenci (id, kurum_id, sinif_id, ad_soyad, dogum_tarihi) values
  ('e0000000-0000-0000-0000-000000000a11', 'c0000000-0000-0000-0000-0000000000a1', 'd0000000-0000-0000-0000-000000000a11', 'oA1x', '2020-02-01'),
  ('e0000000-0000-0000-0000-000000000a21', 'c0000000-0000-0000-0000-0000000000a2', 'd0000000-0000-0000-0000-000000000a21', 'oA2x', '2020-02-02');

insert into public.yoklama (kurum_id, ogrenci_id, tarih, durum, giren_kullanici_id) values
  ('c0000000-0000-0000-0000-0000000000a1', 'e0000000-0000-0000-0000-000000000a11', '2026-10-01', 'geldi', 'b0000000-0000-0000-0000-000000000012');

-- Ağaç kuralları (şema; postgres rolüyle). Seviye sınırı 28. bölümde sınanır.
select tst.esit('altında birim olan kurum taşınamaz',
  tst.dene($q$update public.kurum set ust_kurum_id = 'c0000000-0000-0000-0000-00000000000b' where id = 'c0000000-0000-0000-0000-00000000000a'$q$), 'hata:23514');
select tst.esit('kurum kendi üstü olamaz',
  tst.dene($q$update public.kurum set ust_kurum_id = id where id = 'c0000000-0000-0000-0000-00000000000b'$q$), 'hata:23514');

-- adminA (kök admin): kendi kurumu + iki şube
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('kök admin kurum (kendi + 2 şube)', (select count(*) from public.kurum)::text, '3');
select tst.esit('kök admin şube sınıflarını görür',
  (select count(*) from public.sinif where kurum_id in ('c0000000-0000-0000-0000-0000000000a1','c0000000-0000-0000-0000-0000000000a2'))::text, '2');
select tst.esit('kök admin şube öğrencilerini görür',
  (select count(*) from public.ogrenci where kurum_id in ('c0000000-0000-0000-0000-0000000000a1','c0000000-0000-0000-0000-0000000000a2'))::text, '2');
select tst.esit('kök admin şube kullanıcılarını görür',
  (select count(*) from public.kullanici where kurum_id in ('c0000000-0000-0000-0000-0000000000a1','c0000000-0000-0000-0000-0000000000a2'))::text, '2');
select tst.esit('kök admin şube yoklamasını görür',
  (select count(*) from public.yoklama where kurum_id = 'c0000000-0000-0000-0000-0000000000a1')::text, '1');
select tst.esit('kök admin şubeye sınıf ekler',
  tst.dene($q$insert into public.sinif (kurum_id, ad, donem) values ('c0000000-0000-0000-0000-0000000000a1','sA1y','2026')$q$), 'ok:1');
select tst.esit('kök admin şube öğrencisini günceller',
  tst.dene($q$update public.ogrenci set ad_soyad = 'oA2x-yeni' where id = 'e0000000-0000-0000-0000-000000000a21'$q$), 'ok:1');
select tst.esit('kök admin şube adminini günceller',
  tst.dene($q$update public.kullanici set ad_soyad = 'adminA1-yeni' where id = 'b0000000-0000-0000-0000-000000000012'$q$), 'ok:1');
select tst.esit('kök admin şube açar (returning ile)',
  tst.dene($q$insert into public.kurum (ad, ust_kurum_id) values ('Şube A3', 'c0000000-0000-0000-0000-00000000000a') returning id$q$), 'ok:1');
select tst.esit('kök admin şube adını değiştirir',
  tst.dene($q$update public.kurum set ad = 'Şube A1 yeni' where id = 'c0000000-0000-0000-0000-0000000000a1'$q$), 'ok:1');
select tst.esit('kök admin şube ayarlarını günceller',
  tst.dene($q$update public.kurum set ayarlar = '{"x":1}'::jsonb where id = 'c0000000-0000-0000-0000-0000000000a2'$q$), 'ok:1');
select tst.esit('kök admin kendi adını hâlâ değiştiremez',
  tst.dene($q$update public.kurum set ad = 'x' where id = 'c0000000-0000-0000-0000-00000000000a'$q$), 'hata:42501');
select tst.esit('kök admin başka kurumun altına şube açamaz',
  tst.dene($q$insert into public.kurum (ad, ust_kurum_id) values ('x', 'c0000000-0000-0000-0000-00000000000b')$q$), 'hata:42501');
select tst.esit('kök admin kök kurum açamaz',
  tst.dene($q$insert into public.kurum (ad) values ('x')$q$), 'hata:42501');
select tst.esit('kök admin boş şubeyi siler',
  tst.dene($q$delete from public.kurum where ad = 'Şube A3'$q$), 'ok:1');
select tst.esit('kök admin kendi kurumunu silemez',
  tst.dene($q$delete from public.kurum where id = 'c0000000-0000-0000-0000-00000000000a'$q$), 'ok:0');
select tst.esit('kök admin B sızıntısı yok', (
  (select count(*) from public.kurum where id = 'c0000000-0000-0000-0000-00000000000b')
  + (select count(*) from public.sinif where kurum_id = 'c0000000-0000-0000-0000-00000000000b')
  + (select count(*) from public.ogrenci where kurum_id = 'c0000000-0000-0000-0000-00000000000b')
)::text, '0');

-- adminA1 (şube admini): yalnızca kendi şubesi; kökü okur ama yönetemez
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000012","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('şube admini kurum (kendi + kök)', (select count(*) from public.kurum)::text, '2');
select tst.esit('şube admini yalnızca kendi sınıfları', (select count(*) from public.sinif where kurum_id <> 'c0000000-0000-0000-0000-0000000000a1')::text, '0');
select tst.esit('şube admini kendi sınıflarını görür', (select count(*) from public.sinif)::text, '2');
select tst.esit('şube admini yalnızca kendi öğrencileri', (select count(*) from public.ogrenci)::text, '1');
select tst.esit('şube admini yalnızca kendi kullanıcıları', (select count(*) from public.kullanici)::text, '1');
select tst.esit('şube admini kardeş şubenin yoklamasını/verisini göremez',
  (select count(*) from public.ogrenci where kurum_id = 'c0000000-0000-0000-0000-0000000000a2')::text, '0');
select tst.esit('şube admini kardeş şubeye sınıf ekleyemez',
  tst.dene($q$insert into public.sinif (kurum_id, ad, donem) values ('c0000000-0000-0000-0000-0000000000a2','x','2026')$q$), 'hata:42501');
select tst.esit('şube admini köke sınıf ekleyemez',
  tst.dene($q$insert into public.sinif (kurum_id, ad, donem) values ('c0000000-0000-0000-0000-00000000000a','x','2026')$q$), 'hata:42501');
select tst.esit('şube admini kökü güncelleyemez',
  tst.dene($q$update public.kurum set ayarlar = '{"x":2}'::jsonb where id = 'c0000000-0000-0000-0000-00000000000a'$q$), 'ok:0');
select tst.esit('şube admini kardeş şube açamaz',
  tst.dene($q$insert into public.kurum (ad, ust_kurum_id) values ('x', 'c0000000-0000-0000-0000-00000000000a')$q$), 'hata:42501');
select tst.esit('şube admini kendi altına birim açar',
  tst.dene($q$insert into public.kurum (ad, ust_kurum_id) values ('Alt birim A1', 'c0000000-0000-0000-0000-0000000000a1') returning id$q$), 'ok:1');
select tst.esit('şube admini açtığı birimi siler',
  tst.dene($q$delete from public.kurum where ad = 'Alt birim A1'$q$), 'ok:1');
select tst.esit('şube admini kendi adını değiştiremez',
  tst.dene($q$update public.kurum set ad = 'x' where id = 'c0000000-0000-0000-0000-0000000000a1'$q$), 'hata:42501');
select tst.esit('şube admini kendi şubesini silemez',
  tst.dene($q$delete from public.kurum where id = 'c0000000-0000-0000-0000-0000000000a1'$q$), 'ok:0');

-- adminA2: kardeş şubenin yoklamasını göremez
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000013","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('kardeş şube admini yoklamayı göremez', (select count(*) from public.yoklama)::text, '0');

-- adminB: A'nın şubeleri başka müşteriye sızmaz
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('adminB A şubelerini göremez',
  (select count(*) from public.kurum where ust_kurum_id = 'c0000000-0000-0000-0000-00000000000a')::text, '0');
select tst.esit('adminB hâlâ yalnızca kendi kurumu', (select count(*) from public.kurum)::text, '1');

-- ogrA1 (kök kurumun öğretmeni): şube verisini görmez
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('öğretmen şube sınıflarını görmez',
  (select count(*) from public.sinif where kurum_id <> 'c0000000-0000-0000-0000-00000000000a')::text, '0');
select tst.esit('öğretmen yalnızca kendi kurumunu okur', (select count(*) from public.kurum)::text, '1');

-- ===========================================================================
-- 15. MARKA KODU, ÖZELLİKLER VE MÜŞTERİ BAŞINA KULLANICI ADI
-- ===========================================================================
-- adminA (kök admin): marka kodu ve özelliklere dokunamaz
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('kök admin marka_kodu belirleyemez',
  tst.dene($q$update public.kurum set marka_kodu = 'kurum-a' where id = 'c0000000-0000-0000-0000-00000000000a'$q$), 'hata:42501');
select tst.esit('kök admin ozellikler değiştiremez',
  tst.dene($q$update public.kurum set ozellikler = '{"x":true}'::jsonb where id = 'c0000000-0000-0000-0000-00000000000a'$q$), 'hata:42501');
select tst.esit('kök admin şubenin ozellikler''ini değiştiremez',
  tst.dene($q$update public.kurum set ozellikler = '{"x":true}'::jsonb where id = 'c0000000-0000-0000-0000-0000000000a1'$q$), 'hata:42501');
select tst.esit('kök admin özellikli şube açamaz',
  tst.dene($q$insert into public.kurum (ad, ust_kurum_id, ozellikler) values ('x', 'c0000000-0000-0000-0000-00000000000a', '{"x":true}'::jsonb)$q$), 'hata:42501');
select tst.esit('kök admin kok_kurum_id yazamaz (kolon yetkisi yok)',
  tst.dene($q$update public.ogrenci set kok_kurum_id = 'c0000000-0000-0000-0000-00000000000b' where id = 'e0000000-0000-0000-0000-0000000000a1'$q$), 'hata:42501');

-- süper admin: marka kodunu bir kez atar, özellikleri değiştirir
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('sa marka_kodu atar',
  tst.dene($q$update public.kurum set marka_kodu = 'kurum-a' where id = 'c0000000-0000-0000-0000-00000000000a'$q$), 'ok:1');
select tst.esit('sa atanmış marka_kodu''nu değiştiremez',
  tst.dene($q$update public.kurum set marka_kodu = 'kurum-a2' where id = 'c0000000-0000-0000-0000-00000000000a'$q$), 'hata:23514');
select tst.esit('sa aynı marka_kodu''nu ikinci kuruma veremez',
  tst.dene($q$update public.kurum set marka_kodu = 'kurum-a' where id = 'c0000000-0000-0000-0000-00000000000b'$q$), 'hata:23505');
select tst.esit('sa şubeye marka_kodu veremez',
  tst.dene($q$update public.kurum set marka_kodu = 'sube-a1' where id = 'c0000000-0000-0000-0000-0000000000a1'$q$), 'hata:23514');
select tst.esit('sa geçersiz biçimli marka_kodu veremez',
  tst.dene($q$update public.kurum set marka_kodu = 'Kurum B!' where id = 'c0000000-0000-0000-0000-00000000000b'$q$), 'hata:23514');
select tst.esit('sa ozellikler değiştirir',
  tst.dene($q$update public.kurum set ozellikler = '{"gelisim_kaydi":true}'::jsonb where id = 'c0000000-0000-0000-0000-00000000000a'$q$), 'ok:1');
select tst.esit('sa marka kodlu kurum açar',
  tst.dene($q$insert into public.kurum (ad, marka_kodu) values ('Kurum D', 'kurum-d')$q$), 'ok:1');

-- şube admini kökün marka kodunu ve özelliklerini okuyabilir (uygulama bunu kullanır)
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000012","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('şube admini kökün marka kodunu okur',
  (select marka_kodu from public.kurum where id = 'c0000000-0000-0000-0000-00000000000a'), 'kurum-a');

-- Kullanıcı adı müşteri başına tekil; addan üretim (şema; postgres rolüyle)
reset role;

select tst.esit('şube öğrencisinin kökü ana kurum',
  (select kok_kurum_id::text from public.ogrenci where id = 'e0000000-0000-0000-0000-000000000a11'), 'c0000000-0000-0000-0000-00000000000a');
select tst.esit('kök öğrencisinin kökü kendi kurumu',
  (select kok_kurum_id::text from public.ogrenci where id = 'e0000000-0000-0000-0000-0000000000b1'), 'c0000000-0000-0000-0000-00000000000b');
select tst.esit('A öğrencisine kullanıcı adı',
  tst.dene($q$update public.ogrenci set kullanici_adi = 'ali.yilmaz' where id = 'e0000000-0000-0000-0000-0000000000a1'$q$), 'ok:1');
select tst.esit('aynı kullanıcı adı başka müşteride (B) kullanılabilir',
  tst.dene($q$update public.ogrenci set kullanici_adi = 'ali.yilmaz' where id = 'e0000000-0000-0000-0000-0000000000b1'$q$), 'ok:1');
select tst.esit('aynı kullanıcı adı aynı müşterinin şubesinde kullanılamaz',
  tst.dene($q$update public.ogrenci set kullanici_adi = 'ali.yilmaz' where id = 'e0000000-0000-0000-0000-000000000a11'$q$), 'hata:23505');
select tst.esit('kullanıcı adı biçimi denetlenir (büyük harf, boşluk, Türkçe harf olmaz)',
  tst.dene($q$update public.ogrenci set kullanici_adi = 'Ali Yılmaz' where id = 'e0000000-0000-0000-0000-000000000a11'$q$), 'hata:23514');
-- Üretim: Türkçe harfler çevrilir, kelimeler noktayla birleşir, çakışmada sona sayı eklenir.
select tst.esit('taban: Türkçe harf ve boşluk',
  gizli.kullanici_adi_tabani('  Şükrü  Çağrı IŞIK-Öztürk '), 'sukru.cagri.isik.ozturk');
select tst.esit('taban: harf kalmazsa ogrenci', gizli.kullanici_adi_tabani('***'), 'ogrenci');
update public.ogrenci set ad_soyad = 'Ali Yılmaz' where id in ('e0000000-0000-0000-0000-0000000000a2', 'e0000000-0000-0000-0000-0000000000a3');
select tst.esit('aynı adlı ikinci öğrenci 1 ekini alır',
  public.ogrenci_kullanici_adi_ata('e0000000-0000-0000-0000-0000000000a2'), 'ali.yilmaz1');
select tst.esit('üçüncüsü 2 ekini alır',
  public.ogrenci_kullanici_adi_ata('e0000000-0000-0000-0000-0000000000a3'), 'ali.yilmaz2');
update public.ogrenci set ad_soyad = 'Başka Ad' where id = 'e0000000-0000-0000-0000-0000000000a2';
select tst.esit('atanmış ad değişmez (ad düzeltilse bile)',
  public.ogrenci_kullanici_adi_ata('e0000000-0000-0000-0000-0000000000a2'), 'ali.yilmaz1');
update public.ogrenci set ad_soyad = 'oA2', kullanici_adi = null where id = 'e0000000-0000-0000-0000-0000000000a2';
update public.ogrenci set ad_soyad = 'oA3', kullanici_adi = null where id = 'e0000000-0000-0000-0000-0000000000a3';
select tst.esit('kok_kurum_id elle bozulamaz (trigger düzeltir)',
  tst.dene($q$update public.ogrenci set kok_kurum_id = 'c0000000-0000-0000-0000-00000000000b' where id = 'e0000000-0000-0000-0000-000000000a11'$q$), 'ok:1');
select tst.esit('kok_kurum_id hâlâ ana kurum',
  (select kok_kurum_id::text from public.ogrenci where id = 'e0000000-0000-0000-0000-000000000a11'), 'c0000000-0000-0000-0000-00000000000a');

-- ===========================================================================
-- 16. PERSONEL YÖNETİMİ: e-posta görünürlüğü, korunan kolonlar, sınıf ataması, pasif kullanıcı
--   Şube A1'e bir öğretmen eklenir: 14 ogrA1x (atamasız)
-- ===========================================================================
reset role;

insert into auth.users (id, aud, role, email) values
  ('a0000000-0000-0000-0000-000000000014', 'authenticated', 'authenticated', 'ogra1x@test.local');
insert into public.kullanici (id, auth_id, rol, kurum_id, ad_soyad, eposta) values
  ('b0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000014', 'ogretmen', 'c0000000-0000-0000-0000-0000000000a1', 'ogrA1x', 'ogra1x@test.local');
update public.kullanici set eposta = 'ogra1@test.local' where id = 'b0000000-0000-0000-0000-000000000005';
update public.kullanici set eposta = 'ogrb@test.local' where id = 'b0000000-0000-0000-0000-000000000007';

-- adminA (kök admin)
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('kök admin kendi öğretmeninin e-postasını okur',
  (select eposta from public.kullanici where id = 'b0000000-0000-0000-0000-000000000005'), 'ogra1@test.local');
select tst.esit('kök admin şube öğretmeninin e-postasını okur',
  (select eposta from public.kullanici where id = 'b0000000-0000-0000-0000-000000000014'), 'ogra1x@test.local');
select tst.esit('kök admin başka kurumun öğretmenini göremez',
  (select count(*) from public.kullanici where id = 'b0000000-0000-0000-0000-000000000007')::text, '0');
select tst.esit('admin eposta yazamaz',
  tst.dene($q$update public.kullanici set eposta = 'x@test.local' where id = 'b0000000-0000-0000-0000-000000000005'$q$), 'hata:42501');
select tst.esit('admin aktif yazamaz',
  tst.dene($q$update public.kullanici set aktif = false where id = 'b0000000-0000-0000-0000-000000000005'$q$), 'hata:42501');
select tst.esit('admin sifre_belirlendi yazamaz',
  tst.dene($q$update public.kullanici set sifre_belirlendi = true where id = 'b0000000-0000-0000-0000-000000000005'$q$), 'hata:42501');
select tst.esit('admin personelin adını değiştirir',
  tst.dene($q$update public.kullanici set ad_soyad = 'ogrA1 yeni' where id = 'b0000000-0000-0000-0000-000000000005'$q$), 'ok:1');
select tst.esit('kök admin şube öğretmenini şube sınıfına atar',
  tst.dene($q$insert into public.ogretmen_sinif (kurum_id, ogretmen_id, sinif_id) values ('c0000000-0000-0000-0000-0000000000a1', 'b0000000-0000-0000-0000-000000000014', 'd0000000-0000-0000-0000-000000000a11')$q$), 'ok:1');
select tst.esit('şube öğretmeni başka şubenin sınıfına atanamaz (bileşik FK)',
  tst.dene($q$insert into public.ogretmen_sinif (kurum_id, ogretmen_id, sinif_id) values ('c0000000-0000-0000-0000-0000000000a1', 'b0000000-0000-0000-0000-000000000014', 'd0000000-0000-0000-0000-000000000a21')$q$), 'hata:23503');
select tst.esit('kök admin atamayı kaldırır',
  tst.dene($q$delete from public.ogretmen_sinif where ogretmen_id = 'b0000000-0000-0000-0000-000000000014'$q$), 'ok:1');

-- adminA1 (şube admini)
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000012","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('şube admini kendi öğretmenini görür',
  (select count(*) from public.kullanici where id = 'b0000000-0000-0000-0000-000000000014')::text, '1');
select tst.esit('şube admini kök kurum personelini göremez',
  (select count(*) from public.kullanici where kurum_id = 'c0000000-0000-0000-0000-00000000000a')::text, '0');
select tst.esit('şube admini kendi öğretmenini kendi sınıfına atar',
  tst.dene($q$insert into public.ogretmen_sinif (kurum_id, ogretmen_id, sinif_id) values ('c0000000-0000-0000-0000-0000000000a1', 'b0000000-0000-0000-0000-000000000014', 'd0000000-0000-0000-0000-000000000a11')$q$), 'ok:1');
select tst.esit('şube admini başka şubeye atama yazamaz',
  tst.dene($q$insert into public.ogretmen_sinif (kurum_id, ogretmen_id, sinif_id) values ('c0000000-0000-0000-0000-0000000000a2', 'b0000000-0000-0000-0000-000000000014', 'd0000000-0000-0000-0000-000000000a21')$q$), 'hata:42501');

-- ogrA1x: atandığı sınıfı görür; öğretmen veli satırında e-posta göremez (velide eposta null)
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000014","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('şube öğretmeni atandığı sınıfı görür', (select count(*) from public.sinif)::text, '1');
select tst.esit('şube öğretmeni öğrencisini görür', (select count(*) from public.ogrenci)::text, '1');

reset role;
select tst.esit('veli satırlarında eposta boş',
  (select count(*) from public.kullanici where rol = 'veli' and eposta is not null and id::text like 'b0000000-%')::text, '0');

-- Pasifleştirme (service role'ün yaptığını postgres rolüyle taklit eder)
update public.kullanici set aktif = false where id = 'b0000000-0000-0000-0000-000000000014';

select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000014","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('pasif öğretmen sınıf göremez', (select count(*) from public.sinif)::text, '0');
select tst.esit('pasif öğretmen öğrenci göremez', (select count(*) from public.ogrenci)::text, '0');
select tst.esit('pasif öğretmen atama göremez', (select count(*) from public.ogretmen_sinif)::text, '0');
select tst.esit('pasif öğretmen yoklama göremez', (select count(*) from public.yoklama)::text, '0');
select tst.esit('pasif öğretmen yalnızca kendi satırını görür', (select count(*) from public.kullanici)::text, '1');
select tst.esit('pasif öğretmen kendi satırında aktif=false okur',
  (select aktif::text from public.kullanici where id = 'b0000000-0000-0000-0000-000000000014'), 'false');
select tst.esit('pasif öğretmen yoklama yazamaz',
  tst.dene($q$insert into public.yoklama (kurum_id, ogrenci_id, tarih, durum, giren_kullanici_id) values ('c0000000-0000-0000-0000-0000000000a1', 'e0000000-0000-0000-0000-000000000a11', '2026-10-02', 'geldi', 'b0000000-0000-0000-0000-000000000014')$q$), 'hata:42501');
select tst.esit('pasif öğretmen kendini aktifleştiremez',
  tst.dene($q$update public.kullanici set aktif = true where id = 'b0000000-0000-0000-0000-000000000014'$q$), 'hata:42501');

-- Pasif kurum admini yönetim yetkisini kaybeder
reset role;
update public.kullanici set aktif = false where id = 'b0000000-0000-0000-0000-000000000012';
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000012","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('pasif şube admini sınıf göremez', (select count(*) from public.sinif)::text, '0');
select tst.esit('pasif şube admini kurum göremez', (select count(*) from public.kurum)::text, '0');
select tst.esit('pasif şube admini sınıf ekleyemez',
  tst.dene($q$insert into public.sinif (kurum_id, ad, donem) values ('c0000000-0000-0000-0000-0000000000a1', 'x', '2026')$q$), 'hata:42501');

-- ===========================================================================
-- 17. GELİŞİM KAYDI VE KATEGORİLERİ
--   Kategori müşteri (kök kurum) düzeyindedir: katA (Kurum A), katB (Kurum B) + her kök kuruma
--   otomatik eklenen 4 varsayılan. sA1'e ikinci bir öğretmen eklenir: 15 ogrA1b (ogrA0 kullanılamaz,
--   9. bölümde kurum_admin yapıldı).
--   16. bölümde pasifleştirilen adminA1 ve ogrA1x burada yeniden aktifleştirilir.
--   Kayıtlar: ogrA1 -> oA1 | adminA -> oA1x (şube A1). `id` istemciden yazılamadığı için (kolon
--   yetkisi) kayıtlar öğrenci üzerinden bulunur.
-- ===========================================================================
reset role;

update public.kullanici set aktif = true
  where id in ('b0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000014');

select tst.esit('kök kuruma varsayılan kategoriler eklendi (A)',
  (select count(*) from public.gelisim_kategorisi where kurum_id = 'c0000000-0000-0000-0000-00000000000a')::text, '4');
select tst.esit('süper adminin açtığı kök kuruma varsayılan kategoriler eklendi (D)',
  (select count(*) from public.gelisim_kategorisi g join public.kurum k on k.id = g.kurum_id where k.ad = 'Kurum D')::text, '4');
select tst.esit('şubeye varsayılan kategori eklenmez',
  (select count(*) from public.gelisim_kategorisi where kurum_id = 'c0000000-0000-0000-0000-0000000000a1')::text, '0');
select tst.esit('şubede kategori tanımlanamaz',
  tst.dene($q$insert into public.gelisim_kategorisi (kurum_id, ad) values ('c0000000-0000-0000-0000-0000000000a1', 'x')$q$), 'hata:23514');

insert into public.gelisim_kategorisi (id, kurum_id, ad, sira) values
  ('f0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-00000000000a', 'katA', 10),
  ('f0000000-0000-0000-0000-00000000000b', 'c0000000-0000-0000-0000-00000000000b', 'katB', 10);

insert into auth.users (id, aud, role, email) values
  ('a0000000-0000-0000-0000-000000000015', 'authenticated', 'authenticated', 'ogra1b@test.local');
insert into public.kullanici (id, auth_id, rol, kurum_id, ad_soyad) values
  ('b0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000015', 'ogretmen', 'c0000000-0000-0000-0000-00000000000a', 'ogrA1b');
insert into public.ogretmen_sinif (kurum_id, ogretmen_id, sinif_id) values
  ('c0000000-0000-0000-0000-00000000000a', 'b0000000-0000-0000-0000-000000000015', 'd0000000-0000-0000-0000-0000000000a1');

-- ogrA1 (sA1: oA1, oA2)
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('ogrA1 kendi öğrencisine gelişim kaydı girer',
  tst.dene($q$insert into public.gelisim_kaydi (kurum_id, ogrenci_id, kategori_id, not_metni, olcek_degeri, giren_kullanici_id) values ('c0000000-0000-0000-0000-00000000000a','e0000000-0000-0000-0000-0000000000a1','f0000000-0000-0000-0000-00000000000a','iyi gidiyor',4,'b0000000-0000-0000-0000-000000000005')$q$), 'ok:1');
select tst.esit('ogrA1 atanmadığı öğrenciye (oA3) kayıt giremez',
  tst.dene($q$insert into public.gelisim_kaydi (kurum_id, ogrenci_id, kategori_id, not_metni, giren_kullanici_id) values ('c0000000-0000-0000-0000-00000000000a','e0000000-0000-0000-0000-0000000000a3','f0000000-0000-0000-0000-00000000000a','x','b0000000-0000-0000-0000-000000000005')$q$), 'hata:42501');
select tst.esit('ogrA1 başkası adına (giren_kullanici_id sahte) kayıt giremez',
  tst.dene($q$insert into public.gelisim_kaydi (kurum_id, ogrenci_id, kategori_id, not_metni, giren_kullanici_id) values ('c0000000-0000-0000-0000-00000000000a','e0000000-0000-0000-0000-0000000000a1','f0000000-0000-0000-0000-00000000000a','x','b0000000-0000-0000-0000-000000000006')$q$), 'hata:42501');
select tst.esit('başka müşterinin kategorisi kayda bağlanamaz (bileşik FK)',
  tst.dene($q$insert into public.gelisim_kaydi (kurum_id, ogrenci_id, kategori_id, not_metni, giren_kullanici_id) values ('c0000000-0000-0000-0000-00000000000a','e0000000-0000-0000-0000-0000000000a1','f0000000-0000-0000-0000-00000000000b','x','b0000000-0000-0000-0000-000000000005')$q$), 'hata:23503');
select tst.esit('ölçek 0 reddedilir',
  tst.dene($q$insert into public.gelisim_kaydi (kurum_id, ogrenci_id, kategori_id, not_metni, olcek_degeri, giren_kullanici_id) values ('c0000000-0000-0000-0000-00000000000a','e0000000-0000-0000-0000-0000000000a1','f0000000-0000-0000-0000-00000000000a','x',0,'b0000000-0000-0000-0000-000000000005')$q$), 'hata:23514');
select tst.esit('ölçek 6 reddedilir',
  tst.dene($q$update public.gelisim_kaydi set olcek_degeri = 6 where ogrenci_id = 'e0000000-0000-0000-0000-0000000000a1'$q$), 'hata:23514');
select tst.esit('boş not reddedilir',
  tst.dene($q$update public.gelisim_kaydi set not_metni = '   ' where ogrenci_id = 'e0000000-0000-0000-0000-0000000000a1'$q$), 'hata:23514');
select tst.esit('ogrA1 kendi kaydını günceller (ölçek boşaltılabilir)',
  tst.dene($q$update public.gelisim_kaydi set not_metni = 'çok iyi', olcek_degeri = null where ogrenci_id = 'e0000000-0000-0000-0000-0000000000a1'$q$), 'ok:1');
select tst.esit('kok_kurum_id istemciden yazılamaz',
  tst.dene($q$update public.gelisim_kaydi set kok_kurum_id = 'c0000000-0000-0000-0000-00000000000b' where ogrenci_id = 'e0000000-0000-0000-0000-0000000000a1'$q$), 'hata:42501');
select tst.esit('foto_yolu istemciden yazılamaz',
  tst.dene($q$update public.gelisim_kaydi set foto_yolu = 'x.jpg' where ogrenci_id = 'e0000000-0000-0000-0000-0000000000a1'$q$), 'hata:42501');
select tst.esit('giren_kullanici_id sonradan değiştirilemez',
  tst.dene($q$update public.gelisim_kaydi set giren_kullanici_id = 'b0000000-0000-0000-0000-000000000006' where ogrenci_id = 'e0000000-0000-0000-0000-0000000000a1'$q$), 'hata:42501');
select tst.esit('kayıt başka öğrenciye taşınamaz',
  tst.dene($q$update public.gelisim_kaydi set ogrenci_id = 'e0000000-0000-0000-0000-0000000000a2' where ogrenci_id = 'e0000000-0000-0000-0000-0000000000a1'$q$), 'hata:42501');
select tst.esit('öğretmen müşterisinin kategorilerini görür (4 varsayılan + katA)',
  (select count(*) from public.gelisim_kategorisi)::text, '5');
select tst.esit('öğretmen kategori ekleyemez',
  tst.dene($q$insert into public.gelisim_kategorisi (kurum_id, ad) values ('c0000000-0000-0000-0000-00000000000a', 'x')$q$), 'hata:42501');
select tst.esit('öğretmen kategori güncelleyemez',
  tst.dene($q$update public.gelisim_kategorisi set ad = 'x' where id = 'f0000000-0000-0000-0000-00000000000a'$q$), 'ok:0');
select tst.esit('öğretmen kategori silemez',
  tst.dene($q$delete from public.gelisim_kategorisi where id = 'f0000000-0000-0000-0000-00000000000a'$q$), 'ok:0');

-- ogrA1b (aynı sınıfın ikinci öğretmeni): görür ama başkasının kaydını değiştiremez
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000015","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('aynı sınıfın öğretmeni kaydı görür', (select count(*) from public.gelisim_kaydi)::text, '1');
select tst.esit('aynı sınıfın öğretmeni başkasının kaydını güncelleyemez',
  tst.dene($q$update public.gelisim_kaydi set not_metni = 'x' where ogrenci_id = 'e0000000-0000-0000-0000-0000000000a1'$q$), 'ok:0');
select tst.esit('aynı sınıfın öğretmeni başkasının kaydını silemez',
  tst.dene($q$delete from public.gelisim_kaydi where ogrenci_id = 'e0000000-0000-0000-0000-0000000000a1'$q$), 'ok:0');

-- ogrA2 (sA2): başka sınıfın kaydını hiç göremez
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000006","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('ogrA2 başka sınıfın gelişim kaydını göremez', (select count(*) from public.gelisim_kaydi)::text, '0');

-- veliA1 (oA1, oA2): okur, yazamaz
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000008","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('veliA1 çocuğunun gelişim kaydını görür', (select count(*) from public.gelisim_kaydi)::text, '1');
select tst.esit('veli kategorileri görür', (select count(*) from public.gelisim_kategorisi)::text, '5');
select tst.esit('veli gelişim kaydı giremez',
  tst.dene($q$insert into public.gelisim_kaydi (kurum_id, ogrenci_id, kategori_id, not_metni, giren_kullanici_id) values ('c0000000-0000-0000-0000-00000000000a','e0000000-0000-0000-0000-0000000000a1','f0000000-0000-0000-0000-00000000000a','x','b0000000-0000-0000-0000-000000000008')$q$), 'hata:42501');
select tst.esit('veli gelişim kaydı güncelleyemez',
  tst.dene($q$update public.gelisim_kaydi set not_metni = 'x'$q$), 'ok:0');
select tst.esit('veli gelişim kaydı silemez',
  tst.dene($q$delete from public.gelisim_kaydi$q$), 'ok:0');

-- veliA2 (yalnızca oA2): oA1'in kaydını göremez
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000009","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('veliA2 başka çocuğun gelişim kaydını göremez', (select count(*) from public.gelisim_kaydi)::text, '0');

-- veliB / adminB: A müşterisinden hiçbir şey sızmaz
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000010","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('veliB A gelişim kaydını göremez', (select count(*) from public.gelisim_kaydi)::text, '0');
select tst.esit('veliB A kategorilerini göremez',
  (select count(*) from public.gelisim_kategorisi where kurum_id <> 'c0000000-0000-0000-0000-00000000000b')::text, '0');

reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('adminB A gelişim kaydını göremez', (select count(*) from public.gelisim_kaydi)::text, '0');
select tst.esit('adminB A kategorilerini göremez',
  (select count(*) from public.gelisim_kategorisi where kurum_id <> 'c0000000-0000-0000-0000-00000000000b')::text, '0');
select tst.esit('adminB A kurumuna kategori ekleyemez',
  tst.dene($q$insert into public.gelisim_kategorisi (kurum_id, ad) values ('c0000000-0000-0000-0000-00000000000a', 'x')$q$), 'hata:42501');
select tst.esit('adminB A kategorisini silemez',
  tst.dene($q$delete from public.gelisim_kategorisi where id = 'f0000000-0000-0000-0000-00000000000a'$q$), 'ok:0');

-- adminA (kök admin): kategorileri ve yönettiği kurumların tüm kayıtlarını yönetir
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('kök admin öğretmenin kaydını günceller',
  tst.dene($q$update public.gelisim_kaydi set not_metni = 'admin düzeltti' where ogrenci_id = 'e0000000-0000-0000-0000-0000000000a1'$q$), 'ok:1');
select tst.esit('kök admin şube öğrencisine kayıt girer',
  tst.dene($q$insert into public.gelisim_kaydi (kurum_id, ogrenci_id, kategori_id, not_metni, giren_kullanici_id) values ('c0000000-0000-0000-0000-0000000000a1','e0000000-0000-0000-0000-000000000a11','f0000000-0000-0000-0000-00000000000a','şube kaydı','b0000000-0000-0000-0000-000000000002')$q$), 'ok:1');
select tst.esit('şube kaydının müşterisi ana kurum',
  (select kok_kurum_id::text from public.gelisim_kaydi where ogrenci_id = 'e0000000-0000-0000-0000-000000000a11'), 'c0000000-0000-0000-0000-00000000000a');
select tst.esit('kök admin başkası adına kayıt giremez',
  tst.dene($q$insert into public.gelisim_kaydi (kurum_id, ogrenci_id, kategori_id, not_metni, giren_kullanici_id) values ('c0000000-0000-0000-0000-00000000000a','e0000000-0000-0000-0000-0000000000a1','f0000000-0000-0000-0000-00000000000a','x','b0000000-0000-0000-0000-000000000005')$q$), 'hata:42501');
select tst.esit('kök admin kategori ekler',
  tst.dene($q$insert into public.gelisim_kategorisi (kurum_id, ad) values ('c0000000-0000-0000-0000-00000000000a', 'Spor') returning id$q$), 'ok:1');
select tst.esit('aynı adla ikinci kategori eklenemez',
  tst.dene($q$insert into public.gelisim_kategorisi (kurum_id, ad) values ('c0000000-0000-0000-0000-00000000000a', 'Spor')$q$), 'hata:23505');
select tst.esit('kök admin kategoriyi yeniden adlandırır ve pasifleştirir',
  tst.dene($q$update public.gelisim_kategorisi set ad = 'Beden Eğitimi', aktif = false where ad = 'Spor'$q$), 'ok:1');
select tst.esit('kategori başka kuruma taşınamaz',
  tst.dene($q$update public.gelisim_kategorisi set kurum_id = 'c0000000-0000-0000-0000-00000000000b' where id = 'f0000000-0000-0000-0000-00000000000a'$q$), 'hata:42501');
select tst.esit('kullanılan kategori silinemez',
  tst.dene($q$delete from public.gelisim_kategorisi where id = 'f0000000-0000-0000-0000-00000000000a'$q$), 'hata:23503');
select tst.esit('kök admin kullanılmayan kategoriyi siler',
  tst.dene($q$delete from public.gelisim_kategorisi where ad = 'Beden Eğitimi'$q$), 'ok:1');
select tst.esit('kök admin başka müşteriye kategori ekleyemez',
  tst.dene($q$insert into public.gelisim_kategorisi (kurum_id, ad) values ('c0000000-0000-0000-0000-00000000000b', 'x')$q$), 'hata:42501');

-- adminA1 (şube admini): kendi şubesinin kaydını yönetir, kategorileri yalnızca okur
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000012","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('şube admini yalnızca kendi şubesinin kaydını görür', (select count(*) from public.gelisim_kaydi)::text, '1');
select tst.esit('şube admini müşterinin kategorilerini görür', (select count(*) from public.gelisim_kategorisi)::text, '5');
select tst.esit('şube admini kategori ekleyemez',
  tst.dene($q$insert into public.gelisim_kategorisi (kurum_id, ad) values ('c0000000-0000-0000-0000-00000000000a', 'x')$q$), 'hata:42501');
select tst.esit('şube admini kategori güncelleyemez',
  tst.dene($q$update public.gelisim_kategorisi set aktif = false where id = 'f0000000-0000-0000-0000-00000000000a'$q$), 'ok:0');
select tst.esit('şube admini kendi şubesinin kaydını günceller',
  tst.dene($q$update public.gelisim_kaydi set not_metni = 'şube admini düzeltti' where ogrenci_id = 'e0000000-0000-0000-0000-000000000a11'$q$), 'ok:1');

-- adminA2 (kardeş şube): hiçbir kayıt göremez
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000013","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('kardeş şube admini gelişim kaydı göremez', (select count(*) from public.gelisim_kaydi)::text, '0');
select tst.esit('kardeş şube admini başka şubeye kayıt giremez',
  tst.dene($q$insert into public.gelisim_kaydi (kurum_id, ogrenci_id, kategori_id, not_metni, giren_kullanici_id) values ('c0000000-0000-0000-0000-0000000000a1','e0000000-0000-0000-0000-000000000a11','f0000000-0000-0000-0000-00000000000a','x','b0000000-0000-0000-0000-000000000013')$q$), 'hata:42501');

-- ogrA1x (şube A1 öğretmeni, sA1x): ana kurumun kategorisiyle kayıt girer
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000014","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('şube öğretmeni öğrencisinin kaydını görür', (select count(*) from public.gelisim_kaydi)::text, '1');
select tst.esit('şube öğretmeni adminin kaydını değiştiremez',
  tst.dene($q$update public.gelisim_kaydi set not_metni = 'x' where ogrenci_id = 'e0000000-0000-0000-0000-000000000a11'$q$), 'ok:0');
select tst.esit('şube öğretmeni ana kurumun kategorisiyle kayıt girer',
  tst.dene($q$insert into public.gelisim_kaydi (kurum_id, ogrenci_id, kategori_id, not_metni, giren_kullanici_id) values ('c0000000-0000-0000-0000-0000000000a1','e0000000-0000-0000-0000-000000000a11','f0000000-0000-0000-0000-00000000000a','şube öğretmeni','b0000000-0000-0000-0000-000000000014')$q$), 'ok:1');

-- ogrA1 kendi kaydını siler
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('ogrA1 kendi kaydını siler',
  tst.dene($q$delete from public.gelisim_kaydi where ogrenci_id = 'e0000000-0000-0000-0000-0000000000a1'$q$), 'ok:1');

-- Öğrenci silinince gelişim kayıtları da silinir (şema; postgres rolüyle)
reset role;
delete from public.yoklama where ogrenci_id = 'e0000000-0000-0000-0000-000000000a11';
delete from public.ogrenci where id = 'e0000000-0000-0000-0000-000000000a11';
select tst.esit('öğrenci silinince gelişim kayıtları da silinir',
  (select count(*) from public.gelisim_kaydi where ogrenci_id = 'e0000000-0000-0000-0000-000000000a11')::text, '0');

-- ===========================================================================
-- 18. SINIF DERS PLANI (haftalık ders günleri)
--   2026-10-05 ve 2026-10-12 pazartesidir. Bu noktada: ogrA1 -> sA1, ogrA2 -> sA2, ogrA1x -> sA1x (şube A1);
--   veliA1 -> sA1; veliA2 -> sA1 ve sA2 (10. bölümde oA3'e de bağlandı); veliB -> sB1.
-- ===========================================================================
reset role;

select tst.esit('başlangıç pazartesi olmalı',
  tst.dene($q$insert into public.sinif_ders_plani (kurum_id, sinif_id, baslangic_tarihi, ders_gunleri) values ('c0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-0000000000a1', '2026-10-06', '{1}')$q$), 'hata:23514');
select tst.esit('gün 0 reddedilir',
  tst.dene($q$insert into public.sinif_ders_plani (kurum_id, sinif_id, baslangic_tarihi, ders_gunleri) values ('c0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-0000000000a1', '2026-10-05', '{0,1}')$q$), 'hata:23514');
select tst.esit('gün 8 reddedilir',
  tst.dene($q$insert into public.sinif_ders_plani (kurum_id, sinif_id, baslangic_tarihi, ders_gunleri) values ('c0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-0000000000a1', '2026-10-05', '{1,8}')$q$), 'hata:23514');
select tst.esit('boş gün listesi reddedilir',
  tst.dene($q$insert into public.sinif_ders_plani (kurum_id, sinif_id, baslangic_tarihi, ders_gunleri) values ('c0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-0000000000a1', '2026-10-05', '{}')$q$), 'hata:23514');
select tst.esit('sınıf başka kurumla eşleştirilemez (bileşik FK)',
  tst.dene($q$insert into public.sinif_ders_plani (kurum_id, sinif_id, baslangic_tarihi, ders_gunleri) values ('c0000000-0000-0000-0000-00000000000b', 'd0000000-0000-0000-0000-0000000000a1', '2026-10-05', '{1}')$q$), 'hata:23503');

insert into public.sinif_ders_plani (kurum_id, sinif_id, baslangic_tarihi, ders_gunleri) values ('c0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-0000000000a2', '2026-10-05', '{2,4}');
insert into public.sinif_ders_plani (kurum_id, sinif_id, baslangic_tarihi, ders_gunleri) values ('c0000000-0000-0000-0000-00000000000b', 'd0000000-0000-0000-0000-0000000000b1', '2026-10-05', '{1}');
insert into public.sinif_ders_plani (kurum_id, sinif_id, baslangic_tarihi, ders_gunleri) values ('c0000000-0000-0000-0000-0000000000a1', 'd0000000-0000-0000-0000-000000000a11', '2026-10-05', '{6}');

-- ogrA1 (sA1)
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('ogrA1 kendi sınıfına ders planı ekler',
  tst.dene($q$insert into public.sinif_ders_plani (kurum_id, sinif_id, baslangic_tarihi, ders_gunleri) values ('c0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-0000000000a1', '2026-10-05', '{1,3,5}')$q$), 'ok:1');
select tst.esit('aynı haftaya ikinci plan eklenemez',
  tst.dene($q$insert into public.sinif_ders_plani (kurum_id, sinif_id, baslangic_tarihi, ders_gunleri) values ('c0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-0000000000a1', '2026-10-05', '{2}')$q$), 'hata:23505');
select tst.esit('ogrA1 ders günlerini günceller',
  tst.dene($q$update public.sinif_ders_plani set ders_gunleri = '{1,3}' where sinif_id = 'd0000000-0000-0000-0000-0000000000a1'$q$), 'ok:1');
select tst.esit('ogrA1 sonraki hafta için yeni plan ekler',
  tst.dene($q$insert into public.sinif_ders_plani (kurum_id, sinif_id, baslangic_tarihi, ders_gunleri) values ('c0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-0000000000a1', '2026-10-12', '{2,4}')$q$), 'ok:1');
select tst.esit('ogrA1 atanmadığı sınıfa plan ekleyemez',
  tst.dene($q$insert into public.sinif_ders_plani (kurum_id, sinif_id, baslangic_tarihi, ders_gunleri) values ('c0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-0000000000a2', '2026-10-12', '{1}')$q$), 'hata:42501');
select tst.esit('plan başka sınıfa taşınamaz',
  tst.dene($q$update public.sinif_ders_plani set sinif_id = 'd0000000-0000-0000-0000-0000000000a2' where sinif_id = 'd0000000-0000-0000-0000-0000000000a1'$q$), 'hata:42501');
select tst.esit('planın haftası değiştirilemez',
  tst.dene($q$update public.sinif_ders_plani set baslangic_tarihi = '2026-10-19' where sinif_id = 'd0000000-0000-0000-0000-0000000000a1'$q$), 'hata:42501');
select tst.esit('öğretmen plan silemez',
  tst.dene($q$delete from public.sinif_ders_plani where sinif_id = 'd0000000-0000-0000-0000-0000000000a1'$q$), 'ok:0');
select tst.esit('ogrA1 yalnızca kendi sınıfının planlarını görür', (select count(*) from public.sinif_ders_plani)::text, '2');

-- ogrA2 (sA2)
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000006","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('ogrA2 yalnızca kendi sınıfının planını görür', (select count(*) from public.sinif_ders_plani)::text, '1');
select tst.esit('ogrA2 başka sınıfın planını güncelleyemez',
  tst.dene($q$update public.sinif_ders_plani set ders_gunleri = '{7}' where sinif_id = 'd0000000-0000-0000-0000-0000000000a1'$q$), 'ok:0');

-- veliA1 (çocukları sA1'de)
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000008","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('veliA1 çocuğunun sınıfının planlarını görür', (select count(*) from public.sinif_ders_plani)::text, '2');
select tst.esit('veli plan ekleyemez',
  tst.dene($q$insert into public.sinif_ders_plani (kurum_id, sinif_id, baslangic_tarihi, ders_gunleri) values ('c0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-0000000000a1', '2026-10-19', '{1}')$q$), 'hata:42501');
select tst.esit('veli plan güncelleyemez',
  tst.dene($q$update public.sinif_ders_plani set ders_gunleri = '{7}'$q$), 'ok:0');
select tst.esit('veli plan silemez',
  tst.dene($q$delete from public.sinif_ders_plani$q$), 'ok:0');

-- veliA2 (çocukları sA1 ve sA2'de)
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000009","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('veliA2 iki çocuğunun sınıflarının planlarını görür', (select count(*) from public.sinif_ders_plani)::text, '3');

-- veliB / adminB: A müşterisinden hiçbir plan sızmaz
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000010","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('veliB yalnızca kendi çocuğunun sınıfının planını görür', (select count(*) from public.sinif_ders_plani)::text, '1');
select tst.esit('veliB A planlarını göremez', (select count(*) from public.sinif_ders_plani where kurum_id <> 'c0000000-0000-0000-0000-00000000000b')::text, '0');

reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('adminB yalnızca kendi kurumunun planını görür', (select count(*) from public.sinif_ders_plani)::text, '1');
select tst.esit('adminB A sınıfına plan ekleyemez',
  tst.dene($q$insert into public.sinif_ders_plani (kurum_id, sinif_id, baslangic_tarihi, ders_gunleri) values ('c0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-0000000000a1', '2026-10-19', '{1}')$q$), 'hata:42501');

-- adminA (kök admin): kendi kurumu + şubelerinin planları
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('kök admin kendi ve şube planlarını görür', (select count(*) from public.sinif_ders_plani)::text, '4');
select tst.esit('kök admin şube sınıfının planını günceller',
  tst.dene($q$update public.sinif_ders_plani set ders_gunleri = '{6,7}' where sinif_id = 'd0000000-0000-0000-0000-000000000a11'$q$), 'ok:1');
select tst.esit('kök admin plan siler',
  tst.dene($q$delete from public.sinif_ders_plani where sinif_id = 'd0000000-0000-0000-0000-0000000000a1' and baslangic_tarihi = '2026-10-12'$q$), 'ok:1');

-- adminA2 (kardeş şube): A1'in planını göremez, yazamaz
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000013","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('kardeş şube admini plan göremez', (select count(*) from public.sinif_ders_plani)::text, '0');
select tst.esit('kardeş şube admini başka şubeye plan ekleyemez',
  tst.dene($q$insert into public.sinif_ders_plani (kurum_id, sinif_id, baslangic_tarihi, ders_gunleri) values ('c0000000-0000-0000-0000-0000000000a1', 'd0000000-0000-0000-0000-000000000a11', '2026-10-12', '{1}')$q$), 'hata:42501');

-- ogrA1x (şube A1 öğretmeni, sA1x)
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000014","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('şube öğretmeni kendi sınıfının planını görür', (select count(*) from public.sinif_ders_plani)::text, '1');
select tst.esit('şube öğretmeni sonraki hafta için plan ekler',
  tst.dene($q$insert into public.sinif_ders_plani (kurum_id, sinif_id, baslangic_tarihi, ders_gunleri) values ('c0000000-0000-0000-0000-0000000000a1', 'd0000000-0000-0000-0000-000000000a11', '2026-10-12', '{2}')$q$), 'ok:1');

-- Sınıf silinince planları da silinir (şema; postgres rolüyle). sA1x'in öğrencisi 17. bölümde silindi.
reset role;
delete from public.sinif where id = 'd0000000-0000-0000-0000-000000000a11';
select tst.esit('sınıf silinince ders planları da silinir', (select count(*) from public.sinif_ders_plani where sinif_id = 'd0000000-0000-0000-0000-000000000a11')::text, '0');

-- ===========================================================================
-- 19. KAPALI BÖLÜM (menü yetkisi): kök admin yazar, müşterinin herkesi okur
--   Bu noktada: adminA (02) kök admin, adminA2 (13) şube admini, ogrA1 (05), veliA1 (08), adminB (03).
-- ===========================================================================
reset role;

select tst.esit('yönetici bölümü kapatılamaz (rol check)', tst.dene($q$insert into public.kapali_bolum (kurum_id, rol, bolum_anahtari) values ('c0000000-0000-0000-0000-00000000000a', 'kurum_admin', 'personel')$q$), 'hata:23514');
select tst.esit('geçersiz anahtar reddedilir', tst.dene($q$insert into public.kapali_bolum (kurum_id, rol, bolum_anahtari) values ('c0000000-0000-0000-0000-00000000000a', 'ogretmen', 'Yoklama!')$q$), 'hata:23514');
select tst.esit('şubeye yazılamaz (trigger)', tst.dene($q$insert into public.kapali_bolum (kurum_id, rol, bolum_anahtari) values ('c0000000-0000-0000-0000-0000000000a2', 'ogretmen', 'yoklama')$q$), 'hata:23514');
insert into public.kapali_bolum (kurum_id, rol, bolum_anahtari) values ('c0000000-0000-0000-0000-00000000000b', 'veli', 'gelisim');

-- adminA (kök admin)
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('kök admin öğretmen bölümünü kapatır', tst.dene($q$insert into public.kapali_bolum (kurum_id, rol, bolum_anahtari) values ('c0000000-0000-0000-0000-00000000000a', 'ogretmen', 'gelisim')$q$), 'ok:1');
select tst.esit('kök admin veli bölümünü kapatır', tst.dene($q$insert into public.kapali_bolum (kurum_id, rol, bolum_anahtari) values ('c0000000-0000-0000-0000-00000000000a', 'veli', 'yoklama')$q$), 'ok:1');
select tst.esit('aynı bölüm iki kez kapatılamaz', tst.dene($q$insert into public.kapali_bolum (kurum_id, rol, bolum_anahtari) values ('c0000000-0000-0000-0000-00000000000a', 'veli', 'yoklama')$q$), 'hata:23505');
select tst.esit('kök admin başka müşteriye yazamaz', tst.dene($q$insert into public.kapali_bolum (kurum_id, rol, bolum_anahtari) values ('c0000000-0000-0000-0000-00000000000b', 'ogretmen', 'yoklama')$q$), 'hata:42501');
select tst.esit('satır güncellenemez (kolon yetkisi yok)',
  tst.dene($q$update public.kapali_bolum set bolum_anahtari = 'yoklama' where rol = 'ogretmen'$q$), 'hata:42501');
select tst.esit('kök admin yalnızca kendi müşterisininkileri görür', (select count(*) from public.kapali_bolum)::text, '2');

-- adminA2 (şube admini): okur, yazamaz
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000013","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('şube admini müşterinin ayarını okur', (select count(*) from public.kapali_bolum)::text, '2');
select tst.esit('şube admini kök kuruma yazamaz', tst.dene($q$insert into public.kapali_bolum (kurum_id, rol, bolum_anahtari) values ('c0000000-0000-0000-0000-00000000000a', 'ogretmen', 'yoklama')$q$), 'hata:42501');
-- BEFORE INSERT trigger'ı (yalnızca ana kurum) RLS with check'ten önce çalışır.
select tst.esit('şube admini kendi şubesine yazamaz', tst.dene($q$insert into public.kapali_bolum (kurum_id, rol, bolum_anahtari) values ('c0000000-0000-0000-0000-0000000000a2', 'ogretmen', 'yoklama')$q$), 'hata:23514');
select tst.esit('şube admini silemez', tst.dene($q$delete from public.kapali_bolum$q$), 'ok:0');

-- ogrA1 ve veliA1: okur, yazamaz
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('öğretmen müşterinin ayarını okur', (select count(*) from public.kapali_bolum)::text, '2');
select tst.esit('öğretmen yazamaz', tst.dene($q$insert into public.kapali_bolum (kurum_id, rol, bolum_anahtari) values ('c0000000-0000-0000-0000-00000000000a', 'ogretmen', 'yoklama')$q$), 'hata:42501');
select tst.esit('öğretmen silemez', tst.dene($q$delete from public.kapali_bolum$q$), 'ok:0');

reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000008","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('veli müşterinin ayarını okur', (select count(*) from public.kapali_bolum)::text, '2');
select tst.esit('veli silemez', tst.dene($q$delete from public.kapali_bolum$q$), 'ok:0');

-- adminB: A'nın ayarı sızmaz
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('başka müşterinin admini yalnızca kendisininkini görür', (select count(*) from public.kapali_bolum)::text, '1');

-- adminA bölümü yeniden açar (siler)
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('kök admin bölümü yeniden açar',
  tst.dene($q$delete from public.kapali_bolum where rol = 'veli' and bolum_anahtari = 'yoklama'$q$), 'ok:1');
select tst.esit('kök admin başka müşterinin satırını silemez',
  tst.dene($q$delete from public.kapali_bolum where kurum_id = 'c0000000-0000-0000-0000-00000000000b'$q$), 'ok:0');

-- ===========================================================================
-- 20. DUYURU: kapsam (müşteri / şube / sınıf), yazma yetkisi
--   Bu noktada: adminA (02) kök admin, adminA2 (13) şube A2 admini, ogrA1 (05) -> sA1, ogrA2 (06) -> sA2,
--   veliA1 (08) -> sA1, veliB (10) -> sB1.
--   D1 müşteri geneli (A) | D2 şube geneli (A2) | D3 sınıf sA2 | D4 müşteri geneli (B)
-- ===========================================================================
reset role;

select tst.esit('etkinlik zamansız olamaz',
  tst.dene($q$insert into public.duyuru (kurum_id, tur, baslik, icerik, giren_kullanici_id) values ('c0000000-0000-0000-0000-00000000000a', 'etkinlik', 'e', 'x', 'b0000000-0000-0000-0000-000000000002')$q$), 'hata:23514');
select tst.esit('duyuruda yer olamaz',
  tst.dene($q$insert into public.duyuru (kurum_id, baslik, icerik, yer, giren_kullanici_id) values ('c0000000-0000-0000-0000-00000000000a', 'd', 'x', 'salon', 'b0000000-0000-0000-0000-000000000002')$q$), 'hata:23514');
select tst.esit('boş başlık reddedilir', tst.dene($q$insert into public.duyuru (kurum_id, sinif_id, baslik, icerik, giren_kullanici_id) values ('c0000000-0000-0000-0000-00000000000a', null, '  ', 'x', 'b0000000-0000-0000-0000-000000000002')$q$), 'hata:23514');
select tst.esit('sınıf başka kurumla eşleştirilemez (bileşik FK)', tst.dene($q$insert into public.duyuru (kurum_id, sinif_id, baslik, icerik, giren_kullanici_id) values ('c0000000-0000-0000-0000-00000000000b', 'd0000000-0000-0000-0000-0000000000a1', 'x', 'x', 'b0000000-0000-0000-0000-000000000003')$q$), 'hata:23503');

insert into public.duyuru (kurum_id, sinif_id, baslik, icerik, giren_kullanici_id) values
  ('c0000000-0000-0000-0000-00000000000a', null, 'D1', 'x', 'b0000000-0000-0000-0000-000000000002'),
  ('c0000000-0000-0000-0000-0000000000a2', null, 'D2', 'x', 'b0000000-0000-0000-0000-000000000013'),
  ('c0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-0000000000a2', 'D3', 'x', 'b0000000-0000-0000-0000-000000000006'),
  ('c0000000-0000-0000-0000-00000000000b', null, 'D4', 'x', 'b0000000-0000-0000-0000-000000000003');
select tst.esit('kok_kurum_id şube duyurusunda ana kurumdur',
  (select kok_kurum_id::text from public.duyuru where baslik = 'D2'), 'c0000000-0000-0000-0000-00000000000a');

-- adminA (kök admin): kendi kurumu + şubeleri
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('kök admin müşterinin tüm duyurularını görür', (select count(*) from public.duyuru)::text, '3');
select tst.esit('kök admin sınıfa duyuru yazar', tst.dene($q$insert into public.duyuru (kurum_id, sinif_id, baslik, icerik, giren_kullanici_id) values ('c0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-0000000000a1', 'D5', 'x', 'b0000000-0000-0000-0000-000000000002')$q$), 'ok:1');
select tst.esit('kök admin başkası adına yazamaz', tst.dene($q$insert into public.duyuru (kurum_id, sinif_id, baslik, icerik, giren_kullanici_id) values ('c0000000-0000-0000-0000-00000000000a', null, 'x', 'x', 'b0000000-0000-0000-0000-000000000005')$q$), 'hata:42501');
select tst.esit('kök admin başka müşteriye yazamaz', tst.dene($q$insert into public.duyuru (kurum_id, sinif_id, baslik, icerik, giren_kullanici_id) values ('c0000000-0000-0000-0000-00000000000b', null, 'x', 'x', 'b0000000-0000-0000-0000-000000000002')$q$), 'hata:42501');
select tst.esit('kök admin şube duyurusunu düzeltir', tst.dene($q$update public.duyuru set icerik = 'y' where baslik = 'D2'$q$), 'ok:1');
select tst.esit('kapsam değiştirilemez (kolon yetkisi)', tst.dene($q$update public.duyuru set sinif_id = null where baslik = 'D5'$q$), 'hata:42501');
select tst.esit('yazan kişi değiştirilemez (kolon yetkisi)',
  tst.dene($q$update public.duyuru set giren_kullanici_id = 'b0000000-0000-0000-0000-000000000005' where baslik = 'D5'$q$), 'hata:42501');
select tst.esit('etkinliğe çevirirken zaman zorunlu', tst.dene($q$update public.duyuru set tur = 'etkinlik' where baslik = 'D5'$q$), 'hata:23514');
select tst.esit('kök admin duyuruyu etkinliğe çevirir',
  tst.dene($q$update public.duyuru set tur = 'etkinlik', etkinlik_zamani = '2026-11-01 10:00+03', yer = 'Salon' where baslik = 'D5'$q$), 'ok:1');

-- adminA2 (şube admini): ana kurumun genel duyurusunu okur, değiştiremez
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000013","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('şube admini müşteri geneli + kendi şubesini görür', (select count(*) from public.duyuru)::text, '2');
select tst.esit('şube admini ana kurumun duyurusunu değiştiremez', tst.dene($q$update public.duyuru set icerik = 'z' where baslik = 'D1'$q$), 'ok:0');
select tst.esit('şube admini ana kurumun duyurusunu silemez', tst.dene($q$delete from public.duyuru where baslik = 'D1'$q$), 'ok:0');
select tst.esit('şube admini kendi şubesine yazar', tst.dene($q$insert into public.duyuru (kurum_id, sinif_id, baslik, icerik, giren_kullanici_id) values ('c0000000-0000-0000-0000-0000000000a2', null, 'D6', 'x', 'b0000000-0000-0000-0000-000000000013')$q$), 'ok:1');
select tst.esit('şube admini ana kuruma yazamaz', tst.dene($q$insert into public.duyuru (kurum_id, sinif_id, baslik, icerik, giren_kullanici_id) values ('c0000000-0000-0000-0000-00000000000a', null, 'x', 'x', 'b0000000-0000-0000-0000-000000000013')$q$), 'hata:42501');

-- ogrA1 (sA1): müşteri geneli + kendi sınıfı; yalnızca kendi sınıfına yazar, yalnızca kendi yazdığını değiştirir
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('öğretmen müşteri geneli + kendi sınıfını görür', (select count(*) from public.duyuru)::text, '2');
select tst.esit('öğretmen kendi sınıfına yazar', tst.dene($q$insert into public.duyuru (kurum_id, sinif_id, baslik, icerik, giren_kullanici_id) values ('c0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-0000000000a1', 'D7', 'x', 'b0000000-0000-0000-0000-000000000005')$q$), 'ok:1');
select tst.esit('öğretmen kurum geneli yazamaz', tst.dene($q$insert into public.duyuru (kurum_id, sinif_id, baslik, icerik, giren_kullanici_id) values ('c0000000-0000-0000-0000-00000000000a', null, 'x', 'x', 'b0000000-0000-0000-0000-000000000005')$q$), 'hata:42501');
select tst.esit('öğretmen atanmadığı sınıfa yazamaz', tst.dene($q$insert into public.duyuru (kurum_id, sinif_id, baslik, icerik, giren_kullanici_id) values ('c0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-0000000000a2', 'x', 'x', 'b0000000-0000-0000-0000-000000000005')$q$), 'hata:42501');
select tst.esit('öğretmen başkası adına yazamaz', tst.dene($q$insert into public.duyuru (kurum_id, sinif_id, baslik, icerik, giren_kullanici_id) values ('c0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-0000000000a1', 'x', 'x', 'b0000000-0000-0000-0000-000000000002')$q$), 'hata:42501');
select tst.esit('öğretmen yöneticinin sınıf duyurusunu değiştiremez', tst.dene($q$update public.duyuru set icerik = 'z' where baslik = 'D5'$q$), 'ok:0');
select tst.esit('öğretmen yöneticinin sınıf duyurusunu silemez', tst.dene($q$delete from public.duyuru where baslik = 'D5'$q$), 'ok:0');
select tst.esit('öğretmen kendi duyurusunu değiştirir', tst.dene($q$update public.duyuru set icerik = 'z' where baslik = 'D7'$q$), 'ok:1');

-- veliA1 (çocukları sA1'de): müşteri geneli + sA1; yazamaz
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000008","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('veli müşteri geneli + çocuğunun sınıfını görür', (select count(*) from public.duyuru)::text, '3');
select tst.esit('veli başka sınıfın duyurusunu görmez', (select count(*) from public.duyuru where baslik = 'D3')::text, '0');
select tst.esit('veli şubenin duyurusunu görmez', (select count(*) from public.duyuru where baslik in ('D2', 'D6'))::text, '0');
select tst.esit('veli yazamaz', tst.dene($q$insert into public.duyuru (kurum_id, sinif_id, baslik, icerik, giren_kullanici_id) values ('c0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-0000000000a1', 'x', 'x', 'b0000000-0000-0000-0000-000000000008')$q$), 'hata:42501');
select tst.esit('veli değiştiremez', tst.dene($q$update public.duyuru set icerik = 'z'$q$), 'ok:0');
select tst.esit('veli silemez', tst.dene($q$delete from public.duyuru$q$), 'ok:0');

-- veliB: A'nın duyuruları sızmaz
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000010","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('başka müşterinin velisi yalnızca kendi kurumunu görür', (select count(*) from public.duyuru)::text, '1');

-- ogrA1 kendi duyurusunu siler
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('öğretmen kendi duyurusunu siler', tst.dene($q$delete from public.duyuru where baslik = 'D7'$q$), 'ok:1');

-- ===========================================================================
-- 21. DERS PROGRAMI (sınıfın haftalık ders saatleri)
--   Bu noktada: adminA (02) kök admin, adminA2 (13) şube A2 admini, ogrA1 (05) -> sA1, ogrA2 (06) -> sA2,
--   veliA1 (08) -> sA1, veliB (10) -> sB1.
-- ===========================================================================
reset role;

select tst.esit('gün 0 reddedilir', tst.dene($q$insert into public.ders_programi (kurum_id, sinif_id, gun, baslangic_saati, bitis_saati, ders_adi) values ('c0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-0000000000a1', 0, '09:00', '09:40', 'x')$q$), 'hata:23514');
select tst.esit('gün 8 reddedilir', tst.dene($q$insert into public.ders_programi (kurum_id, sinif_id, gun, baslangic_saati, bitis_saati, ders_adi) values ('c0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-0000000000a1', 8, '09:00', '09:40', 'x')$q$), 'hata:23514');
select tst.esit('bitiş başlangıçtan önce olamaz', tst.dene($q$insert into public.ders_programi (kurum_id, sinif_id, gun, baslangic_saati, bitis_saati, ders_adi) values ('c0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-0000000000a1', 1, '10:00', '09:40', 'x')$q$), 'hata:23514');
select tst.esit('boş ders adı reddedilir', tst.dene($q$insert into public.ders_programi (kurum_id, sinif_id, gun, baslangic_saati, bitis_saati, ders_adi) values ('c0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-0000000000a1', 1, '09:00', '09:40', '  ')$q$), 'hata:23514');
select tst.esit('sınıf başka kurumla eşleştirilemez (bileşik FK)', tst.dene($q$insert into public.ders_programi (kurum_id, sinif_id, gun, baslangic_saati, bitis_saati, ders_adi) values ('c0000000-0000-0000-0000-00000000000b', 'd0000000-0000-0000-0000-0000000000a1', 1, '09:00', '09:40', 'x')$q$), 'hata:23503');

insert into public.ders_programi (kurum_id, sinif_id, gun, baslangic_saati, bitis_saati, ders_adi) values
  ('c0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-0000000000a2', 2, '09:00', '09:40', 'Fen'),
  ('c0000000-0000-0000-0000-00000000000b', 'd0000000-0000-0000-0000-0000000000b1', 1, '09:00', '09:40', 'Resim');

-- ogrA1 (sA1): kendi sınıfının programını düzenler
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('öğretmen kendi sınıfına ders ekler', tst.dene($q$insert into public.ders_programi (kurum_id, sinif_id, gun, baslangic_saati, bitis_saati, ders_adi) values ('c0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-0000000000a1', 1, '09:00', '09:40', 'Matematik')$q$), 'ok:1');
select tst.esit('aynı sınıf, gün ve saate ikinci ders eklenemez', tst.dene($q$insert into public.ders_programi (kurum_id, sinif_id, gun, baslangic_saati, bitis_saati, ders_adi) values ('c0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-0000000000a1', 1, '09:00', '10:00', 'Türkçe')$q$), 'hata:23505');
select tst.esit('öğretmen ikinci dersi ekler', tst.dene($q$insert into public.ders_programi (kurum_id, sinif_id, gun, baslangic_saati, bitis_saati, ders_adi) values ('c0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-0000000000a1', 1, '09:50', '10:30', 'Türkçe')$q$), 'ok:1');
select tst.esit('öğretmen atanmadığı sınıfa ekleyemez', tst.dene($q$insert into public.ders_programi (kurum_id, sinif_id, gun, baslangic_saati, bitis_saati, ders_adi) values ('c0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-0000000000a2', 1, '09:00', '09:40', 'x')$q$), 'hata:42501');
select tst.esit('öğretmen yalnızca kendi sınıfının programını görür', (select count(*) from public.ders_programi)::text, '2');
select tst.esit('öğretmen dersi günceller', tst.dene($q$update public.ders_programi set ders_adi = 'Hayat Bilgisi' where ders_adi = 'Türkçe'$q$), 'ok:1');
select tst.esit('ders başka sınıfa taşınamaz (kolon yetkisi)',
  tst.dene($q$update public.ders_programi set sinif_id = 'd0000000-0000-0000-0000-0000000000a2' where ders_adi = 'Matematik'$q$), 'hata:42501');
select tst.esit('öğretmen başka sınıfın dersini güncelleyemez', tst.dene($q$update public.ders_programi set ders_adi = 'x' where ders_adi = 'Fen'$q$), 'ok:0');
select tst.esit('öğretmen dersi siler', tst.dene($q$delete from public.ders_programi where ders_adi = 'Hayat Bilgisi'$q$), 'ok:1');

-- veliA1 (sA1): okur, yazamaz
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000008","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('veli çocuğunun sınıfının programını görür', (select count(*) from public.ders_programi)::text, '1');
select tst.esit('veli ekleyemez', tst.dene($q$insert into public.ders_programi (kurum_id, sinif_id, gun, baslangic_saati, bitis_saati, ders_adi) values ('c0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-0000000000a1', 3, '09:00', '09:40', 'x')$q$), 'hata:42501');
select tst.esit('veli güncelleyemez', tst.dene($q$update public.ders_programi set ders_adi = 'x'$q$), 'ok:0');
select tst.esit('veli silemez', tst.dene($q$delete from public.ders_programi$q$), 'ok:0');

-- adminA (kök admin): müşterinin tüm programı
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('kök admin müşterinin tüm programını görür', (select count(*) from public.ders_programi)::text, '2');
select tst.esit('kök admin ders ekler', tst.dene($q$insert into public.ders_programi (kurum_id, sinif_id, gun, baslangic_saati, bitis_saati, ders_adi) values ('c0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-0000000000a2', 4, '11:00', '11:40', 'Müzik')$q$), 'ok:1');
select tst.esit('kök admin başka müşteriye ekleyemez', tst.dene($q$insert into public.ders_programi (kurum_id, sinif_id, gun, baslangic_saati, bitis_saati, ders_adi) values ('c0000000-0000-0000-0000-00000000000b', 'd0000000-0000-0000-0000-0000000000b1', 2, '09:00', '09:40', 'x')$q$), 'hata:42501');
select tst.esit('kök admin dersi siler', tst.dene($q$delete from public.ders_programi where ders_adi = 'Müzik'$q$), 'ok:1');

-- adminA2 (şube A2): ana kurumun sınıflarının programını görmez
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000013","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('şube admini ana kurumun programını görmez', (select count(*) from public.ders_programi)::text, '0');
select tst.esit('şube admini ana kurumun sınıfına ekleyemez', tst.dene($q$insert into public.ders_programi (kurum_id, sinif_id, gun, baslangic_saati, bitis_saati, ders_adi) values ('c0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-0000000000a1', 5, '09:00', '09:40', 'x')$q$), 'hata:42501');

-- veliB: A'nın programı sızmaz
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000010","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('başka müşterinin velisi yalnızca kendi sınıfını görür', (select count(*) from public.ders_programi)::text, '1');

-- Sınıf silinince programı da silinir (şema; postgres rolüyle)
reset role;
delete from public.ders_programi where sinif_id = 'd0000000-0000-0000-0000-0000000000b1';
select tst.esit('program satırı silinir', (select count(*) from public.ders_programi where sinif_id = 'd0000000-0000-0000-0000-0000000000b1')::text, '0');

-- ===========================================================================
-- 22. VELİ GİRİŞİ GÜVENLİĞİ: giriş durumu kolonlarına istemci yazamaz
-- ===========================================================================
reset role;
select tst.esit('pin_degistirilmeli varsayılan olarak kapalı',
  (select pin_degistirilmeli::text from public.kullanici where id = 'b0000000-0000-0000-0000-000000000008'), 'false');
update public.kullanici set pin_degistirilmeli = true, giris_deneme_sayisi = 3 where id = 'b0000000-0000-0000-0000-000000000008';

-- veliA1: kendi durumunu okur, değiştiremez
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000008","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('veli kendi pin_degistirilmeli bayrağını okur',
  (select pin_degistirilmeli::text from public.kullanici where id = 'b0000000-0000-0000-0000-000000000008'), 'true');
select tst.esit('veli pin_degistirilmeli bayrağını kaldıramaz',
  tst.dene($q$update public.kullanici set pin_degistirilmeli = false where id = 'b0000000-0000-0000-0000-000000000008'$q$), 'hata:42501');
select tst.esit('veli deneme sayacını sıfırlayamaz',
  tst.dene($q$update public.kullanici set giris_deneme_sayisi = 0 where id = 'b0000000-0000-0000-0000-000000000008'$q$), 'hata:42501');
select tst.esit('veli giriş kilidini kaldıramaz',
  tst.dene($q$update public.kullanici set giris_kilit_bitis = null where id = 'b0000000-0000-0000-0000-000000000008'$q$), 'hata:42501');

-- adminA: velinin giriş durumunu değiştiremez (PIN sıfırlama yalnızca Edge Function'dan)
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('kurum admini pin_degistirilmeli bayrağını yazamaz',
  tst.dene($q$update public.kullanici set pin_degistirilmeli = false where id = 'b0000000-0000-0000-0000-000000000008'$q$), 'hata:42501');

-- ===========================================================================
-- 23. BAŞVURU: istemci eklemez/değiştirmez; yönetici yalnızca yönettiği kurumlarınkini okur
--   Başvurular Edge Function'dan (service role) eklenir; burada postgres rolüyle eklenir.
--   B1 kök A (öğrenci) | B2 şube A2 (personel) | B3 kurum B (öğrenci) | B4 kök A (öğrenci, reddedildi)
-- ===========================================================================
reset role;

select tst.esit('öğrenci başvurusu doğum tarihsiz olamaz',
  tst.dene($q$insert into public.basvuru (kurum_id, tur, ad_soyad, veli_ad_soyad, veli_telefon) values ('c0000000-0000-0000-0000-00000000000a', 'ogrenci', 'x', 'v', '05551112233')$q$), 'hata:23514');
select tst.esit('öğrenci başvurusu velisiz olamaz',
  tst.dene($q$insert into public.basvuru (kurum_id, tur, ad_soyad, dogum_tarihi, veli_telefon) values ('c0000000-0000-0000-0000-00000000000a', 'ogrenci', 'x', '2020-01-01', '05551112233')$q$), 'hata:23514');
select tst.esit('personel başvurusu e-postasız olamaz',
  tst.dene($q$insert into public.basvuru (kurum_id, tur, ad_soyad) values ('c0000000-0000-0000-0000-00000000000a', 'personel', 'x')$q$), 'hata:23514');
select tst.esit('personel başvurusunda veli bilgisi olamaz',
  tst.dene($q$insert into public.basvuru (kurum_id, tur, ad_soyad, eposta, veli_telefon) values ('c0000000-0000-0000-0000-00000000000a', 'personel', 'x', 'x@test.local', '05551112233')$q$), 'hata:23514');
select tst.esit('sonuçlanmış başvuruda karar tarihi zorunlu',
  tst.dene($q$insert into public.basvuru (kurum_id, tur, ad_soyad, eposta, durum) values ('c0000000-0000-0000-0000-00000000000a', 'personel', 'x', 'x@test.local', 'reddedildi')$q$), 'hata:23514');

insert into public.basvuru (kurum_id, tur, ad_soyad, dogum_tarihi, veli_ad_soyad, veli_telefon, eposta) values
  ('c0000000-0000-0000-0000-00000000000a', 'ogrenci', 'B1', '2020-05-05', 'Veli', '0555 111 22 33', null),
  ('c0000000-0000-0000-0000-0000000000a2', 'personel', 'B2', null, null, null, 'aday@test.local'),
  ('c0000000-0000-0000-0000-00000000000b', 'ogrenci', 'B3', '2020-05-05', 'Veli', '0555 111 22 33', null);
insert into public.basvuru (kurum_id, tur, ad_soyad, dogum_tarihi, veli_ad_soyad, veli_telefon, durum, karar_tarihi) values
  ('c0000000-0000-0000-0000-00000000000a', 'ogrenci', 'B4', '2020-05-05', 'Veli', '05551112233', 'reddedildi', now());
select tst.esit('kok_kurum_id şube başvurusunda ana kurumdur', (select kok_kurum_id::text from public.basvuru where ad_soyad = 'B2'), 'c0000000-0000-0000-0000-00000000000a');

-- adminA (kök admin): kendi kurumu + şubeleri; ekleyemez, değiştiremez; yalnızca sonuçlanmışı siler
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('kök admin müşterinin başvurularını görür', (select count(*) from public.basvuru)::text, '3');
select tst.esit('kök admin başvuru ekleyemez',
  tst.dene($q$insert into public.basvuru (kurum_id, tur, ad_soyad, eposta) values ('c0000000-0000-0000-0000-00000000000a', 'personel', 'x', 'x@test.local')$q$), 'hata:42501');
select tst.esit('kök admin başvuruyu doğrudan onaylayamaz',
  tst.dene($q$update public.basvuru set durum = 'onaylandi', karar_tarihi = now() where ad_soyad = 'B1'$q$), 'hata:42501');
select tst.esit('kök admin bekleyen başvuruyu silemez', tst.dene($q$delete from public.basvuru where ad_soyad = 'B1'$q$), 'ok:0');
select tst.esit('kök admin sonuçlanmış başvuruyu siler', tst.dene($q$delete from public.basvuru where ad_soyad = 'B4'$q$), 'ok:1');

-- adminA2 (şube admini): yalnızca kendi şubesine gelenler
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000013","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('şube admini yalnızca kendi şubesinin başvurusunu görür', (select count(*) from public.basvuru)::text, '1');

-- adminB: A'nın başvuruları sızmaz
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('başka müşterinin admini yalnızca kendisininkini görür', (select count(*) from public.basvuru)::text, '1');

-- ogrA1 ve veliA1: hiçbir başvuruyu göremez, ekleyemez
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('öğretmen başvuru göremez', (select count(*) from public.basvuru)::text, '0');
select tst.esit('öğretmen başvuru ekleyemez',
  tst.dene($q$insert into public.basvuru (kurum_id, tur, ad_soyad, eposta) values ('c0000000-0000-0000-0000-00000000000a', 'personel', 'x', 'x@test.local')$q$), 'hata:42501');

reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000008","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('veli başvuru göremez', (select count(*) from public.basvuru)::text, '0');

-- anon: tabloya hiç erişemez
reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;
select tst.esit('anon başvuru okuyamaz', tst.dene($q$select 1 from public.basvuru$q$), 'hata:42501');
select tst.esit('anon başvuru ekleyemez',
  tst.dene($q$insert into public.basvuru (kurum_id, tur, ad_soyad, eposta) values ('c0000000-0000-0000-0000-00000000000a', 'personel', 'x', 'x@test.local')$q$), 'hata:42501');

-- ===========================================================================
-- 24. DEVAMSIZLIK BİLDİRİMİ: veli kendi çocuğu için bildirir; öğretmen ve yönetici okur
--   veliA1 (08) -> oA1, oA2 (sA1) | veliA2 (09) -> oA2, oA3 | ogrA1 (05) -> sA1 | ogrA2 (06) -> sA2
-- ===========================================================================
reset role;
select tst.esit('neden boş olamaz', tst.dene($q$insert into public.devamsizlik_bildirimi (kurum_id, ogrenci_id, tarih, neden, giren_kullanici_id) values ('c0000000-0000-0000-0000-00000000000a', 'e0000000-0000-0000-0000-0000000000a1', current_date + 1, '  ', 'b0000000-0000-0000-0000-000000000008')$q$), 'hata:23514');

reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000008","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('veli çocuğu için yarını bildirir', tst.dene($q$insert into public.devamsizlik_bildirimi (kurum_id, ogrenci_id, tarih, neden, giren_kullanici_id) values ('c0000000-0000-0000-0000-00000000000a', 'e0000000-0000-0000-0000-0000000000a1', current_date + 1, 'hasta', 'b0000000-0000-0000-0000-000000000008')$q$), 'ok:1');
select tst.esit('aynı güne ikinci bildirim olmaz', tst.dene($q$insert into public.devamsizlik_bildirimi (kurum_id, ogrenci_id, tarih, neden, giren_kullanici_id) values ('c0000000-0000-0000-0000-00000000000a', 'e0000000-0000-0000-0000-0000000000a1', current_date + 1, 'hasta', 'b0000000-0000-0000-0000-000000000008')$q$), 'hata:23505');
select tst.esit('veli başkasının çocuğu için bildiremez', tst.dene($q$insert into public.devamsizlik_bildirimi (kurum_id, ogrenci_id, tarih, neden, giren_kullanici_id) values ('c0000000-0000-0000-0000-00000000000a', 'e0000000-0000-0000-0000-0000000000a3', current_date + 1, 'hasta', 'b0000000-0000-0000-0000-000000000008')$q$), 'hata:42501');
select tst.esit('veli başkası adına bildiremez', tst.dene($q$insert into public.devamsizlik_bildirimi (kurum_id, ogrenci_id, tarih, neden, giren_kullanici_id) values ('c0000000-0000-0000-0000-00000000000a', 'e0000000-0000-0000-0000-0000000000a1', current_date + 2, 'hasta', 'b0000000-0000-0000-0000-000000000009')$q$), 'hata:42501');
select tst.esit('veli geçmiş gün için bildiremez', tst.dene($q$insert into public.devamsizlik_bildirimi (kurum_id, ogrenci_id, tarih, neden, giren_kullanici_id) values ('c0000000-0000-0000-0000-00000000000a', 'e0000000-0000-0000-0000-0000000000a1', current_date - 5, 'hasta', 'b0000000-0000-0000-0000-000000000008')$q$), 'hata:42501');
select tst.esit('veli çok ileri bir gün için bildiremez', tst.dene($q$insert into public.devamsizlik_bildirimi (kurum_id, ogrenci_id, tarih, neden, giren_kullanici_id) values ('c0000000-0000-0000-0000-00000000000a', 'e0000000-0000-0000-0000-0000000000a1', current_date + 90, 'hasta', 'b0000000-0000-0000-0000-000000000008')$q$), 'hata:42501');
select tst.esit('bildirim değiştirilemez', tst.dene($q$update public.devamsizlik_bildirimi set neden = 'x'$q$), 'hata:42501');
select tst.esit('veli kendi bildirimini görür', (select count(*) from public.devamsizlik_bildirimi)::text, '1');

reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000009","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('başka veli (aynı sınıf, başka çocuk) göremez', (select count(*) from public.devamsizlik_bildirimi)::text, '0');

reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('sınıfın öğretmeni bildirimi görür', (select count(*) from public.devamsizlik_bildirimi)::text, '1');
select tst.esit('öğretmen bildirim yazamaz', tst.dene($q$insert into public.devamsizlik_bildirimi (kurum_id, ogrenci_id, tarih, neden, giren_kullanici_id) values ('c0000000-0000-0000-0000-00000000000a', 'e0000000-0000-0000-0000-0000000000a1', current_date + 3, 'hasta', 'b0000000-0000-0000-0000-000000000005')$q$), 'hata:42501');
select tst.esit('öğretmen bildirimi silemez', tst.dene($q$delete from public.devamsizlik_bildirimi$q$), 'ok:0');

reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000006","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('başka sınıfın öğretmeni göremez', (select count(*) from public.devamsizlik_bildirimi)::text, '0');

reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('kurum admini bildirimi görür', (select count(*) from public.devamsizlik_bildirimi)::text, '1');

reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('başka müşterinin admini göremez', (select count(*) from public.devamsizlik_bildirimi)::text, '0');

reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000008","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('veli bildirimini geri alır', tst.dene($q$delete from public.devamsizlik_bildirimi$q$), 'ok:1');

-- ===========================================================================
-- 25. ÖNERİ: veli kendi kurumuna yazar (günde en fazla 5); yalnızca yönetici okur
-- ===========================================================================
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000008","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('veli öneri yazar', tst.dene($q$insert into public.oneri (kurum_id, giren_kullanici_id, metin) values ('c0000000-0000-0000-0000-00000000000a', 'b0000000-0000-0000-0000-000000000008', 'oneri')$q$), 'ok:1');
select tst.esit('veli başkası adına yazamaz', tst.dene($q$insert into public.oneri (kurum_id, giren_kullanici_id, metin) values ('c0000000-0000-0000-0000-00000000000a', 'b0000000-0000-0000-0000-000000000009', 'oneri')$q$), 'hata:42501');
select tst.esit('veli başka kuruma yazamaz', tst.dene($q$insert into public.oneri (kurum_id, giren_kullanici_id, metin) values ('c0000000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-000000000008', 'oneri')$q$), 'hata:42501');
select tst.esit('veli kendi önerisini görür', (select count(*) from public.oneri)::text, '1');
select tst.esit('veli okundu bilgisini değiştiremez', tst.dene($q$update public.oneri set okundu = true$q$), 'ok:0');
select tst.esit('veli metni değiştiremez', tst.dene($q$update public.oneri set metin = 'x'$q$), 'hata:42501');

reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000009","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('başka veli öneriyi göremez', (select count(*) from public.oneri)::text, '0');

reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('öğretmen öneri göremez', (select count(*) from public.oneri)::text, '0');
select tst.esit('öğretmen öneri yazamaz', tst.dene($q$insert into public.oneri (kurum_id, giren_kullanici_id, metin) values ('c0000000-0000-0000-0000-00000000000a', 'b0000000-0000-0000-0000-000000000005', 'oneri')$q$), 'hata:42501');

reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('kurum admini öneriyi görür', (select count(*) from public.oneri)::text, '1');
select tst.esit('kurum admini okundu yapar', tst.dene($q$update public.oneri set okundu = true$q$), 'ok:1');
select tst.esit('kurum admini metni değiştiremez', tst.dene($q$update public.oneri set metin = 'x'$q$), 'hata:42501');
select tst.esit('kurum admini öneri yazamaz', tst.dene($q$insert into public.oneri (kurum_id, giren_kullanici_id, metin) values ('c0000000-0000-0000-0000-00000000000a', 'b0000000-0000-0000-0000-000000000002', 'oneri')$q$), 'hata:42501');

reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000013","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('şube admini ana kuruma yazılan öneriyi göremez', (select count(*) from public.oneri)::text, '0');

reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('başka müşterinin admini göremez', (select count(*) from public.oneri)::text, '0');

-- Günlük sınır: aynı veli 24 saatte en fazla 5 öneri
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000008","role":"authenticated"}', true);
set local role authenticated;

select tst.dene($q$insert into public.oneri (kurum_id, giren_kullanici_id, metin) values ('c0000000-0000-0000-0000-00000000000a', 'b0000000-0000-0000-0000-000000000008', '2')$q$);
select tst.dene($q$insert into public.oneri (kurum_id, giren_kullanici_id, metin) values ('c0000000-0000-0000-0000-00000000000a', 'b0000000-0000-0000-0000-000000000008', '3')$q$);
select tst.dene($q$insert into public.oneri (kurum_id, giren_kullanici_id, metin) values ('c0000000-0000-0000-0000-00000000000a', 'b0000000-0000-0000-0000-000000000008', '4')$q$);
select tst.esit('beşinci öneri kabul edilir', tst.dene($q$insert into public.oneri (kurum_id, giren_kullanici_id, metin) values ('c0000000-0000-0000-0000-00000000000a', 'b0000000-0000-0000-0000-000000000008', '5')$q$), 'ok:1');
select tst.esit('altıncı öneri günlük sınıra takılır', tst.dene($q$insert into public.oneri (kurum_id, giren_kullanici_id, metin) values ('c0000000-0000-0000-0000-00000000000a', 'b0000000-0000-0000-0000-000000000008', '6')$q$), 'hata:23514');

-- ===========================================================================
-- 26. İÇERİK TAKİBİ: kademe/ders/konu/ezber tanımları, konu ilerlemesi, ezber, kitap
--   adminA (02) kök admin | adminA2 (13) şube admini | ogrA1 (05) -> sA1 | ogrA2 (06) -> sA2
--   veliA1 (08) -> oA1, oA2 (sA1) | veliA2 (09) -> oA2, oA3 | adminB (03)
-- ===========================================================================
reset role;
select tst.esit('kademe şubede tanımlanamaz (trigger)', tst.dene($q$insert into public.kademe (kurum_id, ad) values ('c0000000-0000-0000-0000-0000000000a2', 'x')$q$), 'hata:23514');
insert into public.kademe (id, kurum_id, ad) values ('10000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-00000000000a', 'Kademe I'), ('10000000-0000-0000-0000-00000000000b', 'c0000000-0000-0000-0000-00000000000b', 'B Kademe');
insert into public.kademe_dersi (id, kurum_id, kademe_id, ad) values ('20000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'Siyer');
insert into public.ders_konusu (id, kurum_id, ders_id, ad, sira) values ('30000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'Konu 1', 1);
insert into public.ezber_maddesi (id, kurum_id, kademe_id, ad, sira) values ('40000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'Madde 1', 1);
select tst.esit('ders başka müşterinin kademesine bağlanamaz (bileşik FK)',
  tst.dene($q$insert into public.kademe_dersi (kurum_id, kademe_id, ad) values ('c0000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000a', 'x')$q$), 'hata:23503');
select tst.esit('sınıf başka müşterinin kademesini izleyemez (trigger)',
  tst.dene($q$update public.sinif set kademe_id = '10000000-0000-0000-0000-00000000000b' where id = 'd0000000-0000-0000-0000-0000000000a1'$q$), 'hata:23503');

-- adminA: tanımları yönetir, sınıfa kademe atar
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('kök admin kademe ekler', tst.dene($q$insert into public.kademe (kurum_id, ad) values ('c0000000-0000-0000-0000-00000000000a', 'Kademe II')$q$), 'ok:1');
select tst.esit('kök admin konu ekler', tst.dene($q$insert into public.ders_konusu (kurum_id, ders_id, ad, sira) values ('c0000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'Konu 2', 2)$q$), 'ok:1');
select tst.esit('kök admin başka müşteriye kademe ekleyemez', tst.dene($q$insert into public.kademe (kurum_id, ad) values ('c0000000-0000-0000-0000-00000000000b', 'x')$q$), 'hata:42501');
select tst.esit('kök admin yalnızca kendi kademelerini görür', (select count(*) from public.kademe)::text, '2');
select tst.esit('kök admin sınıfa kademe atar', tst.dene($q$update public.sinif set kademe_id = '10000000-0000-0000-0000-00000000000a' where id in ('d0000000-0000-0000-0000-0000000000a1', 'd0000000-0000-0000-0000-0000000000a2')$q$), 'ok:2');
select tst.esit('konu başka derse taşınamaz (kolon yetkisi)', tst.dene($q$update public.ders_konusu set kurum_id = 'c0000000-0000-0000-0000-00000000000b'$q$), 'hata:42501');

-- adminA2 (şube admini): okur, yazamaz
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000013","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('şube admini kademeleri okur', (select count(*) from public.kademe)::text, '2');
select tst.esit('şube admini kademe ekleyemez', tst.dene($q$insert into public.kademe (kurum_id, ad) values ('c0000000-0000-0000-0000-00000000000a', 'x')$q$), 'hata:42501');
select tst.esit('şube admini konu silemez', tst.dene($q$delete from public.ders_konusu$q$), 'ok:0');

-- ogrA1 (sA1): tanımları okur; kendi sınıfının ilerlemesini, kendi öğrencisinin ezber ve kitabını yazar
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('öğretmen konuları okur', (select count(*) from public.ders_konusu)::text, '2');
select tst.esit('öğretmen konu ekleyemez', tst.dene($q$insert into public.ders_konusu (kurum_id, ders_id, ad) values ('c0000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'x')$q$), 'hata:42501');
select tst.esit('öğretmen kendi sınıfında konuyu işaretler',
  tst.dene($q$insert into public.sinif_konu_ilerleme (kurum_id, sinif_id, konu_id) values ('c0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-00000000000a')$q$), 'ok:1');
select tst.esit('aynı konu iki kez işaretlenemez',
  tst.dene($q$insert into public.sinif_konu_ilerleme (kurum_id, sinif_id, konu_id) values ('c0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-00000000000a')$q$), 'hata:23505');
select tst.esit('öğretmen başka sınıfta işaretleyemez',
  tst.dene($q$insert into public.sinif_konu_ilerleme (kurum_id, sinif_id, konu_id) values ('c0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-0000000000a2', '30000000-0000-0000-0000-00000000000a')$q$), 'hata:42501');
select tst.esit('öğretmen öğrencisinin ezberini girer',
  tst.dene($q$insert into public.ogrenci_ezber (kurum_id, ogrenci_id, madde_id, durum) values ('c0000000-0000-0000-0000-00000000000a', 'e0000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-00000000000a', 'devam')$q$), 'ok:1');
select tst.esit('öğretmen ezber durumunu günceller', tst.dene($q$update public.ogrenci_ezber set durum = 'tamam'$q$), 'ok:1');
select tst.esit('öğretmen başka sınıfın öğrencisine ezber giremez',
  tst.dene($q$insert into public.ogrenci_ezber (kurum_id, ogrenci_id, madde_id, durum) values ('c0000000-0000-0000-0000-00000000000a', 'e0000000-0000-0000-0000-0000000000a3', '40000000-0000-0000-0000-00000000000a', 'devam')$q$), 'hata:42501');
select tst.esit('öğretmen öğrencisine kitap ekler',
  tst.dene($q$insert into public.kitap_okuma (kurum_id, ogrenci_id, baslik) values ('c0000000-0000-0000-0000-00000000000a', 'e0000000-0000-0000-0000-0000000000a1', 'Küçük Prens')$q$), 'ok:1');
select tst.esit('öğretmen başka sınıfın öğrencisine kitap ekleyemez',
  tst.dene($q$insert into public.kitap_okuma (kurum_id, ogrenci_id, baslik) values ('c0000000-0000-0000-0000-00000000000a', 'e0000000-0000-0000-0000-0000000000a3', 'x')$q$), 'hata:42501');
select tst.esit('kitabın bitişi başlangıçtan önce olamaz',
  tst.dene($q$update public.kitap_okuma set baslama_tarihi = '2026-10-10', bitis_tarihi = '2026-10-01'$q$), 'hata:23514');
select tst.esit('kitap başka öğrenciye taşınamaz (kolon yetkisi)', tst.dene($q$update public.kitap_okuma set ogrenci_id = 'e0000000-0000-0000-0000-0000000000a3'$q$), 'hata:42501');

-- ogrA2 (sA2): sA1'in kayıtlarını görmez
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000006","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('başka sınıfın öğretmeni ilerlemeyi görmez', (select count(*) from public.sinif_konu_ilerleme)::text, '0');
select tst.esit('başka sınıfın öğretmeni ezberi görmez', (select count(*) from public.ogrenci_ezber)::text, '0');
select tst.esit('başka sınıfın öğretmeni kitabı görmez', (select count(*) from public.kitap_okuma)::text, '0');

-- veliA1 (oA1'in velisi): okur, yazamaz
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000008","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('veli çocuğunun ezberini görür', (select count(*) from public.ogrenci_ezber)::text, '1');
select tst.esit('veli çocuğunun kitabını görür', (select count(*) from public.kitap_okuma)::text, '1');
select tst.esit('veli sınıfın konu ilerlemesini görür', (select count(*) from public.sinif_konu_ilerleme)::text, '1');
select tst.esit('veli ezber yazamaz', tst.dene($q$update public.ogrenci_ezber set durum = 'devam'$q$), 'ok:0');
select tst.esit('veli kitap ekleyemez', tst.dene($q$insert into public.kitap_okuma (kurum_id, ogrenci_id, baslik) values ('c0000000-0000-0000-0000-00000000000a', 'e0000000-0000-0000-0000-0000000000a1', 'x')$q$), 'hata:42501');
select tst.esit('veli kitap silemez', tst.dene($q$delete from public.kitap_okuma$q$), 'ok:0');

-- veliA2 (oA2, oA3): oA1'in kayıtlarını görmez
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000009","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('başka veli ezberi görmez', (select count(*) from public.ogrenci_ezber)::text, '0');
select tst.esit('başka veli kitabı görmez', (select count(*) from public.kitap_okuma)::text, '0');

-- adminB: A'nın tanımları ve kayıtları sızmaz
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('başka müşterinin admini yalnızca kendi kademesini görür', (select count(*) from public.kademe)::text, '1');
select tst.esit('başka müşterinin admini ezber görmez', (select count(*) from public.ogrenci_ezber)::text, '0');

-- Kademe silinince tanımlar ve takip kayıtları da silinir; sınıfın bağı boşalır
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('kök admin kademeyi siler', tst.dene($q$delete from public.kademe where id = '10000000-0000-0000-0000-00000000000a'$q$), 'ok:1');
reset role;
select tst.esit('kademeyle birlikte konular silinir', (select count(*) from public.ders_konusu where kurum_id = 'c0000000-0000-0000-0000-00000000000a')::text, '0');
select tst.esit('kademeyle birlikte konu ilerlemesi silinir', (select count(*) from public.sinif_konu_ilerleme
  where kurum_id in (select id from public.kurum where kok_kurum_id = 'c0000000-0000-0000-0000-00000000000a'))::text, '0');
-- Sayımlar test müşterisiyle sınırlı: canlıda gerçek ezber/ilerleme kayıtları var.
select tst.esit('kademeyle birlikte ezber kayıtları silinir', (select count(*) from public.ogrenci_ezber
  where kurum_id in (select id from public.kurum where kok_kurum_id = 'c0000000-0000-0000-0000-00000000000a'))::text, '0');
select tst.esit('sınıfın kademe bağı boşalır', (select count(*) from public.sinif where kademe_id is not null
  and kurum_id in (select id from public.kurum where kok_kurum_id = 'c0000000-0000-0000-0000-00000000000a'))::text, '0');

-- ===========================================================================
-- 27. PASİF ÖĞRENCİ ve MAZERETLİ YOKLAMA
-- ===========================================================================
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('kurum admini öğrenciyi pasife alır', tst.dene($q$update public.ogrenci set aktif = false where id = 'e0000000-0000-0000-0000-0000000000a1'$q$), 'ok:1');
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('öğretmen öğrenciyi aktifleştiremez', tst.dene($q$update public.ogrenci set aktif = true where id = 'e0000000-0000-0000-0000-0000000000a1'$q$), 'ok:0');
select tst.esit('öğretmen mazeretli yoklama girer',
  tst.dene($q$insert into public.yoklama (kurum_id, ogrenci_id, tarih, durum, giren_kullanici_id) values ('c0000000-0000-0000-0000-00000000000a', 'e0000000-0000-0000-0000-0000000000a2', '2026-12-01', 'mazeretli', 'b0000000-0000-0000-0000-000000000005')$q$), 'ok:1');
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000008","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('veli pasif çocuğunu görmeye devam eder', (select count(*) from public.ogrenci where id = 'e0000000-0000-0000-0000-0000000000a1')::text, '1');
select tst.esit('veli aktifliği değiştiremez', tst.dene($q$update public.ogrenci set aktif = true where id = 'e0000000-0000-0000-0000-0000000000a1'$q$), 'ok:0');

-- ===========================================================================
-- 28. KURUM AĞACI (4 seviye): yönetici bağlı olduğu düğümü ve altını yönetir
--   Kurum G (kök) -> Bölge G1 -> İlçe G11 -> Semt G111 (sinif sG, ogrenci oG, veliG)
--                              -> İlçe G12
--                 -> Bölge G2 (sinif sG2)
--   Kimlikler: 40 adminG, 41 adminG1 (bölge), 42 adminG11 (ilçe), 43 adminG111 (semt),
--              44 adminG2 (komşu bölge), 45 veliG (semt), 46 adminG12 (kardeş ilçe)
-- ===========================================================================
reset role;

insert into auth.users (id, aud, role, email) values
  ('a0000000-0000-0000-0000-000000000040', 'authenticated', 'authenticated', 'adming@test.local'),
  ('a0000000-0000-0000-0000-000000000041', 'authenticated', 'authenticated', 'adming1@test.local'),
  ('a0000000-0000-0000-0000-000000000042', 'authenticated', 'authenticated', 'adming11@test.local'),
  ('a0000000-0000-0000-0000-000000000043', 'authenticated', 'authenticated', 'adming111@test.local'),
  ('a0000000-0000-0000-0000-000000000044', 'authenticated', 'authenticated', 'adming2@test.local'),
  ('a0000000-0000-0000-0000-000000000045', 'authenticated', 'authenticated', 'velig@test.local'),
  ('a0000000-0000-0000-0000-000000000046', 'authenticated', 'authenticated', 'adming12@test.local');

insert into public.kurum (id, ad, ust_kurum_id) values
  ('c0000000-0000-0000-0000-0000000000d0', 'Kurum G', null),
  ('c0000000-0000-0000-0000-0000000000d1', 'Bölge G1', 'c0000000-0000-0000-0000-0000000000d0'),
  ('c0000000-0000-0000-0000-0000000000d2', 'Bölge G2', 'c0000000-0000-0000-0000-0000000000d0'),
  ('c0000000-0000-0000-0000-000000000d11', 'İlçe G11', 'c0000000-0000-0000-0000-0000000000d1'),
  ('c0000000-0000-0000-0000-000000000d12', 'İlçe G12', 'c0000000-0000-0000-0000-0000000000d1'),
  ('c0000000-0000-0000-0000-00000000d111', 'Semt G111', 'c0000000-0000-0000-0000-000000000d11');

insert into public.kullanici (id, auth_id, rol, kurum_id, ad_soyad) values
  ('b0000000-0000-0000-0000-000000000040', 'a0000000-0000-0000-0000-000000000040', 'kurum_admin', 'c0000000-0000-0000-0000-0000000000d0', 'adminG'),
  ('b0000000-0000-0000-0000-000000000041', 'a0000000-0000-0000-0000-000000000041', 'kurum_admin', 'c0000000-0000-0000-0000-0000000000d1', 'adminG1'),
  ('b0000000-0000-0000-0000-000000000042', 'a0000000-0000-0000-0000-000000000042', 'kurum_admin', 'c0000000-0000-0000-0000-000000000d11', 'adminG11'),
  ('b0000000-0000-0000-0000-000000000043', 'a0000000-0000-0000-0000-000000000043', 'kurum_admin', 'c0000000-0000-0000-0000-00000000d111', 'adminG111'),
  ('b0000000-0000-0000-0000-000000000044', 'a0000000-0000-0000-0000-000000000044', 'kurum_admin', 'c0000000-0000-0000-0000-0000000000d2', 'adminG2'),
  ('b0000000-0000-0000-0000-000000000045', 'a0000000-0000-0000-0000-000000000045', 'veli', 'c0000000-0000-0000-0000-00000000d111', 'veliG'),
  ('b0000000-0000-0000-0000-000000000046', 'a0000000-0000-0000-0000-000000000046', 'kurum_admin', 'c0000000-0000-0000-0000-000000000d12', 'adminG12');

insert into public.sinif (id, kurum_id, ad, donem) values
  ('d0000000-0000-0000-0000-00000000d111', 'c0000000-0000-0000-0000-00000000d111', 'sG', '2026'),
  ('d0000000-0000-0000-0000-0000000000d2', 'c0000000-0000-0000-0000-0000000000d2', 'sG2', '2026');

insert into public.ogrenci (id, kurum_id, sinif_id, ad_soyad, dogum_tarihi) values
  ('e0000000-0000-0000-0000-00000000d111', 'c0000000-0000-0000-0000-00000000d111', 'd0000000-0000-0000-0000-00000000d111', 'oG', '2020-03-01');

insert into public.veli_ogrenci (kurum_id, veli_id, ogrenci_id) values
  ('c0000000-0000-0000-0000-00000000d111', 'b0000000-0000-0000-0000-000000000045', 'e0000000-0000-0000-0000-00000000d111');

insert into public.duyuru (kurum_id, baslik, icerik, giren_kullanici_id) values
  ('c0000000-0000-0000-0000-0000000000d1', 'Bölge G1 duyurusu', 'x', 'b0000000-0000-0000-0000-000000000041'),
  ('c0000000-0000-0000-0000-0000000000d2', 'Bölge G2 duyurusu', 'x', 'b0000000-0000-0000-0000-000000000044');

-- Türetilmiş kolonlar ve seviye sınırı (şema; postgres rolüyle)
select tst.esit('semt 4. seviyedir', (select seviye from public.kurum where id = 'c0000000-0000-0000-0000-00000000d111')::text, '4');
select tst.esit('semtin kökü Kurum G', (select kok_kurum_id from public.kurum where id = 'c0000000-0000-0000-0000-00000000d111')::text, 'c0000000-0000-0000-0000-0000000000d0');
select tst.esit('semtin yolu 4 düğüm', (select array_length(yol, 1) from public.kurum where id = 'c0000000-0000-0000-0000-00000000d111')::text, '4');
select tst.esit('semt öğrencisinin kökü Kurum G', (select kok_kurum_id from public.ogrenci where id = 'e0000000-0000-0000-0000-00000000d111')::text, 'c0000000-0000-0000-0000-0000000000d0');
select tst.esit('5. seviye açılamaz',
  tst.dene($q$insert into public.kurum (ad, ust_kurum_id) values ('x', 'c0000000-0000-0000-0000-00000000d111')$q$), 'hata:23514');
select tst.esit('kurum kendi altındaki düğüme bağlanamaz',
  tst.dene($q$update public.kurum set ust_kurum_id = 'c0000000-0000-0000-0000-00000000d111' where id = 'c0000000-0000-0000-0000-00000000d111'$q$), 'hata:23514');

-- adminG (kök): ağacın tamamı
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000040","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('kök yönetici ağacın tamamını görür', (select count(*) from public.kurum)::text, '6');
select tst.esit('kök yönetici semt ve bölge sınıflarını görür', (select count(*) from public.sinif)::text, '2');
select tst.esit('kök yönetici semt öğrencisini günceller',
  tst.dene($q$update public.ogrenci set ad_soyad = 'oG-yeni' where id = 'e0000000-0000-0000-0000-00000000d111'$q$), 'ok:1');

-- adminG1 (bölge): kendi bölgesi + ilçeleri + semti; komşu bölge ve kök yok
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000041","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('bölge yöneticisi kurum (kendi + 3 alt + kök)', (select count(*) from public.kurum)::text, '5');
select tst.esit('bölge yöneticisi komşu bölgeyi okuyamaz',
  (select count(*) from public.kurum where id = 'c0000000-0000-0000-0000-0000000000d2')::text, '0');
select tst.esit('bölge yöneticisi semt sınıfını görür', (select count(*) from public.sinif)::text, '1');
select tst.esit('bölge yöneticisi semt öğrencisini görür', (select count(*) from public.ogrenci)::text, '1');
select tst.esit('bölge yöneticisi alt düğüm kullanıcılarını görür (kendisi dahil 5)', (select count(*) from public.kullanici)::text, '5');
select tst.esit('bölge yöneticisi semte sınıf ekler',
  tst.dene($q$insert into public.sinif (kurum_id, ad, donem) values ('c0000000-0000-0000-0000-00000000d111','sGy','2026')$q$), 'ok:1');
select tst.esit('bölge yöneticisi köke sınıf ekleyemez',
  tst.dene($q$insert into public.sinif (kurum_id, ad, donem) values ('c0000000-0000-0000-0000-0000000000d0','x','2026')$q$), 'hata:42501');
select tst.esit('bölge yöneticisi komşu bölgeye sınıf ekleyemez',
  tst.dene($q$insert into public.sinif (kurum_id, ad, donem) values ('c0000000-0000-0000-0000-0000000000d2','x','2026')$q$), 'hata:42501');
select tst.esit('bölge yöneticisi ilçe açar (returning ile)',
  tst.dene($q$insert into public.kurum (ad, ust_kurum_id) values ('İlçe G13', 'c0000000-0000-0000-0000-0000000000d1') returning id$q$), 'ok:1');
select tst.esit('bölge yöneticisi ilçesinin altına semt açar',
  tst.dene($q$insert into public.kurum (ad, ust_kurum_id) values ('Semt G112', 'c0000000-0000-0000-0000-000000000d11') returning id$q$), 'ok:1');
select tst.esit('istemcinin yazdığı yol/seviye ezilir',
  tst.dene($q$insert into public.kurum (ad, ust_kurum_id, seviye, yol, kok_kurum_id) values ('İlçe G14', 'c0000000-0000-0000-0000-0000000000d1', 1, array['c0000000-0000-0000-0000-0000000000d2']::uuid[], 'c0000000-0000-0000-0000-0000000000d2') returning id$q$), 'ok:1');
select tst.esit('ezilen seviye 3', (select seviye from public.kurum where ad = 'İlçe G14')::text, '3');
select tst.esit('bölge yöneticisi açtığı düğümleri siler',
  tst.dene($q$delete from public.kurum where ad in ('İlçe G13', 'Semt G112', 'İlçe G14')$q$), 'ok:3');
select tst.esit('bölge yöneticisi yeni bölge açamaz',
  tst.dene($q$insert into public.kurum (ad, ust_kurum_id) values ('x', 'c0000000-0000-0000-0000-0000000000d0')$q$), 'hata:42501');
select tst.esit('bölge yöneticisi komşu bölgenin altına açamaz',
  tst.dene($q$insert into public.kurum (ad, ust_kurum_id) values ('x', 'c0000000-0000-0000-0000-0000000000d2')$q$), 'hata:42501');
select tst.esit('bölge yöneticisi semtin adını değiştirir',
  tst.dene($q$update public.kurum set ad = 'Semt G111 yeni' where id = 'c0000000-0000-0000-0000-00000000d111'$q$), 'ok:1');
select tst.esit('bölge yöneticisi kendi adını değiştiremez',
  tst.dene($q$update public.kurum set ad = 'x' where id = 'c0000000-0000-0000-0000-0000000000d1'$q$), 'hata:42501');
select tst.esit('bölge yöneticisi kökü güncelleyemez',
  tst.dene($q$update public.kurum set ayarlar = '{"x":1}'::jsonb where id = 'c0000000-0000-0000-0000-0000000000d0'$q$), 'ok:0');
select tst.esit('istemci yol kolonunu güncelleyemez',
  tst.dene($q$update public.kurum set yol = array[id] where id = 'c0000000-0000-0000-0000-00000000d111'$q$), 'hata:42501');
select tst.esit('istemci düğümü taşıyamaz',
  tst.dene($q$update public.kurum set ust_kurum_id = 'c0000000-0000-0000-0000-000000000d12' where id = 'c0000000-0000-0000-0000-00000000d111'$q$), 'hata:42501');
select tst.esit('bölge yöneticisi kendi bölgesini silemez',
  tst.dene($q$delete from public.kurum where id = 'c0000000-0000-0000-0000-0000000000d1'$q$), 'ok:0');
select tst.esit('bölge yöneticisi komşu bölgenin duyurusunu göremez',
  (select count(*) from public.duyuru where kurum_id = 'c0000000-0000-0000-0000-0000000000d2')::text, '0');

-- adminG11 (ilçe): kendi ilçesi + semti; kardeş ilçe yok
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000042","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('ilçe yöneticisi kurum (kendi + semt + bölge + kök)', (select count(*) from public.kurum)::text, '4');
select tst.esit('ilçe yöneticisi semt sınıflarını görür', (select count(*) from public.sinif)::text, '2');
select tst.esit('ilçe yöneticisi kardeş ilçeye sınıf ekleyemez',
  tst.dene($q$insert into public.sinif (kurum_id, ad, donem) values ('c0000000-0000-0000-0000-000000000d12','x','2026')$q$), 'hata:42501');
select tst.esit('ilçe yöneticisi kardeş ilçenin altına semt açamaz',
  tst.dene($q$insert into public.kurum (ad, ust_kurum_id) values ('x', 'c0000000-0000-0000-0000-000000000d12')$q$), 'hata:42501');
select tst.esit('ilçe yöneticisi bölgeyi güncelleyemez',
  tst.dene($q$update public.kurum set ayarlar = '{"x":1}'::jsonb where id = 'c0000000-0000-0000-0000-0000000000d1'$q$), 'ok:0');
select tst.esit('ilçe yöneticisi bölge yöneticisini göremez',
  (select count(*) from public.kullanici where kurum_id = 'c0000000-0000-0000-0000-0000000000d1')::text, '0');

-- adminG12 (kardeş ilçe): semtin verisini göremez
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000046","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('kardeş ilçe yöneticisi semt verisini göremez',
  ((select count(*) from public.sinif) + (select count(*) from public.ogrenci))::text, '0');
select tst.esit('kardeş ilçe yöneticisi semti okuyamaz',
  (select count(*) from public.kurum where id = 'c0000000-0000-0000-0000-00000000d111')::text, '0');

-- adminG111 (semt): yalnızca kendi düğümü; altına düğüm açamaz
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000043","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('semt yöneticisi kurum (kendi + 3 üst)', (select count(*) from public.kurum)::text, '4');
select tst.esit('semt yöneticisi kendi sınıflarını görür', (select count(*) from public.sinif)::text, '2');
select tst.esit('semt yöneticisi altına düğüm açamaz (5. seviye)',
  tst.dene($q$insert into public.kurum (ad, ust_kurum_id) values ('x', 'c0000000-0000-0000-0000-00000000d111')$q$), 'hata:23514');
select tst.esit('semt yöneticisi ilçeye sınıf ekleyemez',
  tst.dene($q$insert into public.sinif (kurum_id, ad, donem) values ('c0000000-0000-0000-0000-000000000d11','x','2026')$q$), 'hata:42501');
select tst.esit('semt yöneticisi bölge duyurusunu okur',
  (select count(*) from public.duyuru where kurum_id = 'c0000000-0000-0000-0000-0000000000d1')::text, '1');
select tst.esit('semt yöneticisi bölge duyurusunu değiştiremez',
  tst.dene($q$update public.duyuru set baslik = 'x' where kurum_id = 'c0000000-0000-0000-0000-0000000000d1'$q$), 'ok:0');

-- adminG2 (komşu bölge): G1 ağacından hiçbir şey
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000044","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('komşu bölge yöneticisi kurum (kendi + kök)', (select count(*) from public.kurum)::text, '2');
select tst.esit('komşu bölge yöneticisi yalnızca kendi sınıfı', (select count(*) from public.sinif)::text, '1');
select tst.esit('komşu bölge yöneticisi semt öğrencisini göremez', (select count(*) from public.ogrenci)::text, '0');
select tst.esit('komşu bölge yöneticisi G1 duyurusunu göremez',
  (select count(*) from public.duyuru where kurum_id = 'c0000000-0000-0000-0000-0000000000d1')::text, '0');

-- veliG (semtte): üst düğümlerin genel duyurusunu okur, komşu bölgeninkini okumaz
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000045","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('semt velisi bölge duyurusunu okur', (select count(*) from public.duyuru)::text, '1');
select tst.esit('semt velisi kurum (kendi + 3 üst)', (select count(*) from public.kurum)::text, '4');
select tst.esit('semt velisi yalnızca çocuğunu görür', (select count(*) from public.ogrenci)::text, '1');

-- adminA (başka müşteri): G ağacından hiçbir şey
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('başka müşteri G ağacını göremez',
  (select count(*) from public.kurum where kok_kurum_id = 'c0000000-0000-0000-0000-0000000000d0')::text, '0');

-- ===========================================================================
-- 29. GÖREV: kök yönetici tanımlar, her yönetici kapsamındaki kişiye atar
--   Kurum G ağacı (28. bölüm). f1 İstişare üyesi (kurum_admin), f2 Abi (ogretmen), fa Kurum A'nın görevi
--   Kimlik: 47 ogrG (semt öğretmeni)
-- ===========================================================================
reset role;

insert into auth.users (id, aud, role, email) values
  ('a0000000-0000-0000-0000-000000000047', 'authenticated', 'authenticated', 'ogrg@test.local');
insert into public.kullanici (id, auth_id, rol, kurum_id, ad_soyad) values
  ('b0000000-0000-0000-0000-000000000047', 'a0000000-0000-0000-0000-000000000047', 'ogretmen', 'c0000000-0000-0000-0000-00000000d111', 'ogrG');

insert into public.gorev (id, kurum_id, ad, temel_rol) values
  ('f0000000-0000-0000-0000-0000000000f1', 'c0000000-0000-0000-0000-0000000000d0', 'İstişare üyesi', 'kurum_admin'),
  ('f0000000-0000-0000-0000-0000000000f2', 'c0000000-0000-0000-0000-0000000000d0', 'Abi', 'ogretmen'),
  ('f0000000-0000-0000-0000-0000000000fa', 'c0000000-0000-0000-0000-00000000000a', 'A görevi', 'kurum_admin');

select tst.esit('görev alt birimde tanımlanamaz (şema)',
  tst.dene($q$insert into public.gorev (kurum_id, ad, temel_rol) values ('c0000000-0000-0000-0000-0000000000d1', 'x', 'ogretmen')$q$), 'hata:23514');
select tst.esit('veli için görev tanımlanamaz (şema)',
  tst.dene($q$insert into public.gorev (kurum_id, ad, temel_rol) values ('c0000000-0000-0000-0000-0000000000d0', 'x', 'veli')$q$), 'hata:23514');

-- adminG (kök): tanımlar, günceller, siler
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000040","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('kök yönetici görev tanımlar (returning ile)',
  tst.dene($q$insert into public.gorev (kurum_id, ad, temel_rol, kapali_ogeler) values ('c0000000-0000-0000-0000-0000000000d0', 'Eğitim sorumlusu', 'kurum_admin', array['raporlar']) returning id$q$), 'ok:1');
select tst.esit('kök yönetici görevin menü yetkisini günceller',
  tst.dene($q$update public.gorev set kapali_ogeler = array['raporlar','roller'] where ad = 'Eğitim sorumlusu'$q$), 'ok:1');
select tst.esit('temel rol sonradan değiştirilemez',
  tst.dene($q$update public.gorev set temel_rol = 'ogretmen' where ad = 'Eğitim sorumlusu'$q$), 'hata:42501');
select tst.esit('aynı adla ikinci görev olmaz',
  tst.dene($q$insert into public.gorev (kurum_id, ad, temel_rol) values ('c0000000-0000-0000-0000-0000000000d0', 'Abi', 'ogretmen')$q$), 'hata:23505');
select tst.esit('kök yönetici kullanılmayan görevi siler',
  tst.dene($q$delete from public.gorev where ad = 'Eğitim sorumlusu'$q$), 'ok:1');
select tst.esit('kök yönetici başka müşterinin görevini göremez',
  (select count(*) from public.gorev where kurum_id = 'c0000000-0000-0000-0000-00000000000a')::text, '0');
select tst.esit('kök yönetici başka müşteriye görev tanımlayamaz',
  tst.dene($q$insert into public.gorev (kurum_id, ad, temel_rol) values ('c0000000-0000-0000-0000-00000000000a', 'x', 'ogretmen')$q$), 'hata:42501');

-- adminG1 (bölge): tanımlayamaz, okur, kapsamındaki kişiye atar
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000041","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('alt birim yöneticisi görevleri okur', (select count(*) from public.gorev)::text, '2');
select tst.esit('alt birim yöneticisi görev tanımlayamaz',
  tst.dene($q$insert into public.gorev (kurum_id, ad, temel_rol) values ('c0000000-0000-0000-0000-0000000000d0', 'x', 'ogretmen')$q$), 'hata:42501');
select tst.esit('alt birim yöneticisi görevi güncelleyemez',
  tst.dene($q$update public.gorev set ad = 'x' where id = 'f0000000-0000-0000-0000-0000000000f1'$q$), 'ok:0');
select tst.esit('alt birim yöneticisi görevi silemez',
  tst.dene($q$delete from public.gorev where id = 'f0000000-0000-0000-0000-0000000000f2'$q$), 'ok:0');
select tst.esit('bölge yöneticisi ilçe yöneticisine görev atar',
  tst.dene($q$update public.kullanici set gorev_id = 'f0000000-0000-0000-0000-0000000000f1' where id = 'b0000000-0000-0000-0000-000000000042'$q$), 'ok:1');
select tst.esit('bölge yöneticisi semt öğretmenine görev atar',
  tst.dene($q$update public.kullanici set gorev_id = 'f0000000-0000-0000-0000-0000000000f2' where id = 'b0000000-0000-0000-0000-000000000047'$q$), 'ok:1');
select tst.esit('öğretmen görevi yöneticiye atanamaz',
  tst.dene($q$update public.kullanici set gorev_id = 'f0000000-0000-0000-0000-0000000000f2' where id = 'b0000000-0000-0000-0000-000000000043'$q$), 'hata:23514');
select tst.esit('başka müşterinin görevi atanamaz',
  tst.dene($q$update public.kullanici set gorev_id = 'f0000000-0000-0000-0000-0000000000fa' where id = 'b0000000-0000-0000-0000-000000000043'$q$), 'hata:23514');
select tst.esit('yönetici kendi görevini değiştiremez',
  tst.dene($q$update public.kullanici set gorev_id = 'f0000000-0000-0000-0000-0000000000f1' where id = 'b0000000-0000-0000-0000-000000000041'$q$), 'hata:42501');
select tst.esit('bölge yöneticisi komşu bölgedeki kişiye görev atayamaz',
  tst.dene($q$update public.kullanici set gorev_id = 'f0000000-0000-0000-0000-0000000000f1' where id = 'b0000000-0000-0000-0000-000000000044'$q$), 'ok:0');

-- ogrG (görevli öğretmen): kendi görevini okur, değiştiremez
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000047","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('öğretmen kendi görevini okur',
  (select g.ad from public.kullanici k join public.gorev g on g.id = k.gorev_id where k.id = 'b0000000-0000-0000-0000-000000000047'), 'Abi');
select tst.esit('öğretmen kendi görevini kaldıramaz',
  tst.dene($q$update public.kullanici set gorev_id = null where id = 'b0000000-0000-0000-0000-000000000047'$q$), 'hata:42501');
select tst.esit('öğretmen görev tanımını değiştiremez',
  tst.dene($q$update public.gorev set kapali_ogeler = '{}' where id = 'f0000000-0000-0000-0000-0000000000f2'$q$), 'ok:0');

-- adminG: kullanılan görev silinemez; rol değişince görev boşalır
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000040","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('kullanılan görev silinemez',
  tst.dene($q$delete from public.gorev where id = 'f0000000-0000-0000-0000-0000000000f1'$q$), 'hata:23503');
select tst.esit('görevli yöneticinin rolü değişir',
  tst.dene($q$update public.kullanici set rol = 'ogretmen' where id = 'b0000000-0000-0000-0000-000000000042'$q$), 'ok:1');
select tst.esit('rol değişince görev boşalır',
  (select coalesce(gorev_id::text, 'yok') from public.kullanici where id = 'b0000000-0000-0000-0000-000000000042'), 'yok');
-- Arayüzde tek "Rol" seçimi (lib/roller.ts > kisiyeRolVer): rol ve görev tek güncellemede yazılır.
select tst.esit('rol ve tanımlı rol tek güncellemede verilir',
  tst.dene($q$update public.kullanici set rol = 'kurum_admin', gorev_id = 'f0000000-0000-0000-0000-0000000000f1' where id = 'b0000000-0000-0000-0000-000000000042'$q$), 'ok:1');
select tst.esit('tek güncellemede görev korunur',
  (select coalesce(gorev_id::text, 'yok') from public.kullanici where id = 'b0000000-0000-0000-0000-000000000042'), 'f0000000-0000-0000-0000-0000000000f1');
select tst.esit('uyumsuz rol ve tanımlı rol tek güncellemede reddedilir',
  tst.dene($q$update public.kullanici set rol = 'kurum_admin', gorev_id = 'f0000000-0000-0000-0000-0000000000f2' where id = 'b0000000-0000-0000-0000-000000000042'$q$), 'hata:23514');
select tst.esit('sistem rolüne dönüş tek güncellemede görevi boşaltır',
  tst.dene($q$update public.kullanici set rol = 'ogretmen', gorev_id = null where id = 'b0000000-0000-0000-0000-000000000042'$q$), 'ok:1');
select tst.esit('boşalan görev artık silinebilir',
  tst.dene($q$delete from public.gorev where id = 'f0000000-0000-0000-0000-0000000000f1'$q$), 'ok:1');

-- ===========================================================================
-- 30. PANO: toplamlar müşterinin tamamı için (yönetici), kendi birimi için (öğretmen)
--   Kurum G ağacı (28-29. bölüm). oG için 3 yoklama (geldi, gelmedi, mazeretli), sG için ders planı.
--   Satır düzeyinde RLS değişmez; yalnızca pano_ozeti / pano_iller toplam döndürür.
-- ===========================================================================
reset role;

insert into public.yoklama (kurum_id, ogrenci_id, tarih, durum, giren_kullanici_id) values
  ('c0000000-0000-0000-0000-00000000d111', 'e0000000-0000-0000-0000-00000000d111', '2026-09-07', 'geldi', 'b0000000-0000-0000-0000-000000000043'),
  ('c0000000-0000-0000-0000-00000000d111', 'e0000000-0000-0000-0000-00000000d111', '2026-09-08', 'gelmedi', 'b0000000-0000-0000-0000-000000000043'),
  ('c0000000-0000-0000-0000-00000000d111', 'e0000000-0000-0000-0000-00000000d111', '2026-09-09', 'mazeretli', 'b0000000-0000-0000-0000-000000000043');
-- Pazartesi, salı, perşembe: 7-13 Eylül haftasında 3 planlı ders, 2'sinin yoklaması var.
insert into public.sinif_ders_plani (kurum_id, sinif_id, baslangic_tarihi, ders_gunleri) values
  ('c0000000-0000-0000-0000-00000000d111', 'd0000000-0000-0000-0000-00000000d111', '2026-09-07', '{1,2,4}');
update public.kurum set il_kodu = 34 where id = 'c0000000-0000-0000-0000-0000000000d1';

-- adminG2 (komşu bölge): satırları göremez ama toplamları görür
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000044","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('komşu bölge yöneticisi satırı hâlâ göremez', (select count(*) from public.ogrenci)::text, '0');
select tst.esit('komşu bölgenin toplam öğrencisi',
  (public.pano_ozeti('c0000000-0000-0000-0000-0000000000d1', '2026-09-07', '2026-09-13') -> 'sayilar' ->> 'ogrenci'), '1');
select tst.esit('komşu bölgenin katılımı (geldi)',
  (public.pano_ozeti('c0000000-0000-0000-0000-0000000000d1', '2026-09-07', '2026-09-13') -> 'katilim' ->> 'geldi'), '1');
select tst.esit('mazeretli ayrı sayılır',
  (public.pano_ozeti('c0000000-0000-0000-0000-0000000000d1', '2026-09-07', '2026-09-13') -> 'katilim' ->> 'mazeretli'), '1');
select tst.esit('tüm kurum: sınıf sayısı',
  (public.pano_ozeti('c0000000-0000-0000-0000-0000000000d0', '2026-09-07', '2026-09-13') -> 'sayilar' ->> 'sinif'), '3');
select tst.esit('tüm kurum: alt birim sayısı',
  jsonb_array_length(public.pano_ozeti('c0000000-0000-0000-0000-0000000000d0', '2026-09-07', '2026-09-13') -> 'birimler')::text, '5');
select tst.esit('birim toplamı alt ağacı kapsar (ilçe, semtin öğrencisini sayar)', (
  select b ->> 'ogrenci'
  from jsonb_array_elements(public.pano_ozeti('c0000000-0000-0000-0000-0000000000d0', '2026-09-07', '2026-09-13') -> 'birimler') b
  where b ->> 'id' = 'c0000000-0000-0000-0000-000000000d11'), '1');
select tst.esit('kardeş ilçenin toplamı sıfır', (
  select b ->> 'ogrenci'
  from jsonb_array_elements(public.pano_ozeti('c0000000-0000-0000-0000-0000000000d0', '2026-09-07', '2026-09-13') -> 'birimler') b
  where b ->> 'id' = 'c0000000-0000-0000-0000-000000000d12'), '0');
select tst.esit('alt birim etkin ili üstünden alır', (
  select b ->> 'il_kodu'
  from jsonb_array_elements(public.pano_ozeti('c0000000-0000-0000-0000-0000000000d0', '2026-09-07', '2026-09-13') -> 'birimler') b
  where b ->> 'id' = 'c0000000-0000-0000-0000-00000000d111'), '34');
select tst.esit('yoklama düzeni: planlı ders',
  (public.pano_ozeti('c0000000-0000-0000-0000-0000000000d1', '2026-09-07', '2026-09-13') -> 'yoklama_duzeni' ->> 'planli'), '3');
select tst.esit('yoklama düzeni: yoklaması alınan',
  (public.pano_ozeti('c0000000-0000-0000-0000-0000000000d1', '2026-09-07', '2026-09-13') -> 'yoklama_duzeni' ->> 'alinan'), '2');
select tst.esit('dönem dışındaki yoklama sayılmaz',
  (public.pano_ozeti('c0000000-0000-0000-0000-0000000000d1', '2026-09-14', '2026-09-20') -> 'katilim' ->> 'geldi'), '0');
select tst.esit('önceki dönem ayrı gelir',
  (public.pano_ozeti('c0000000-0000-0000-0000-0000000000d1', '2026-09-14', '2026-09-20') -> 'onceki_katilim' ->> 'katildi'), '1');
select tst.esit('pano öğrenci adı döndürmez',
  position('oG' in public.pano_ozeti('c0000000-0000-0000-0000-0000000000d0', '2026-09-07', '2026-09-13')::text)::text, '0');
select tst.esit('pano sınıf adı döndürmez',
  position('sG' in public.pano_ozeti('c0000000-0000-0000-0000-0000000000d0', '2026-09-07', '2026-09-13')::text)::text, '0');
select tst.esit('il toplamı',
  (public.pano_iller('2026-09-07', '2026-09-13') -> 0 ->> 'ogrenci'), '1');
select tst.esit('il: plaka', (public.pano_iller('2026-09-07', '2026-09-13') -> 0 ->> 'il_kodu'), '34');
select tst.esit('il: doğrudan alt birim (ilçe) sayısı', (public.pano_iller('2026-09-07', '2026-09-13') -> 0 ->> 'alt_birim'), '2');
select tst.esit('ili olmayan bölge haritada yok', jsonb_array_length(public.pano_iller('2026-09-07', '2026-09-13'))::text, '1');
select tst.esit('geçersiz tarih aralığı reddedilir',
  tst.dene($q$select public.pano_ozeti('c0000000-0000-0000-0000-0000000000d0', '2026-09-13', '2026-09-07')$q$), 'hata:22023');
select tst.esit('başka müşterinin birimi istenemez',
  tst.dene($q$select public.pano_ozeti('c0000000-0000-0000-0000-00000000000a', '2026-09-07', '2026-09-13')$q$), 'hata:42501');
select tst.esit('komşu bölge yöneticisi G1 altındaki ili değiştiremez',
  tst.dene($q$update public.kurum set il_kodu = 6 where id = 'c0000000-0000-0000-0000-00000000d111'$q$), 'ok:0');

-- adminA (başka müşteri)
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('başka müşteri G panosunu alamaz',
  tst.dene($q$select public.pano_ozeti('c0000000-0000-0000-0000-0000000000d1', '2026-09-07', '2026-09-13')$q$), 'hata:42501');
select tst.esit('başka müşterinin il toplamında G yok',
  (select count(*) from jsonb_array_elements(public.pano_iller('2026-09-07', '2026-09-13')) i where i ->> 'il_kodu' = '34')::text, '0');

-- adminG1 (bölge): altındaki birimin ilini değiştirir
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000041","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('bölge yöneticisi alt birimin ilini değiştirir',
  tst.dene($q$update public.kurum set il_kodu = 34 where id = 'c0000000-0000-0000-0000-000000000d11'$q$), 'ok:1');
select tst.esit('geçersiz plaka reddedilir',
  tst.dene($q$update public.kurum set il_kodu = 99 where id = 'c0000000-0000-0000-0000-000000000d11'$q$), 'hata:23514');

-- ogrG (semt öğretmeni): yalnızca kendi birimi
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000047","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('öğretmen kendi biriminin panosunu alır',
  (public.pano_ozeti('c0000000-0000-0000-0000-00000000d111', '2026-09-07', '2026-09-13') -> 'sayilar' ->> 'ogrenci'), '1');
select tst.esit('öğretmen üst birimin panosunu alamaz',
  tst.dene($q$select public.pano_ozeti('c0000000-0000-0000-0000-0000000000d1', '2026-09-07', '2026-09-13')$q$), 'hata:42501');
select tst.esit('öğretmen tüm kurumun panosunu alamaz',
  tst.dene($q$select public.pano_ozeti('c0000000-0000-0000-0000-0000000000d0', '2026-09-07', '2026-09-13')$q$), 'hata:42501');
select tst.esit('öğretmen il toplamlarını alamaz',
  tst.dene($q$select public.pano_iller('2026-09-07', '2026-09-13')$q$), 'hata:42501');

-- veliG ve süper admin (kuruma bağlı değil): pano yok
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000045","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('veli pano alamaz',
  tst.dene($q$select public.pano_ozeti('c0000000-0000-0000-0000-00000000d111', '2026-09-07', '2026-09-13')$q$), 'hata:42501');

reset role;
set local role anon;
select tst.esit('anon pano çağıramaz',
  tst.dene($q$select public.pano_ozeti('c0000000-0000-0000-0000-00000000d111', '2026-09-07', '2026-09-13')$q$), 'hata:42501');

-- ===========================================================================
-- 31. ORTAK EZBER LİSTESİ (kademe_id boş) ve ezber grubu
--   adminA (02) kök admin | adminA2 (13) şube admini | ogrA1 (05) -> sA1 (oA1) | adminB (03)
--   26. bölümün sonunda A'nın kademesi silindi: sınıfların kademesi yok, ortak liste yine geçerli.
-- ===========================================================================
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('kök admin ortak listeye madde ekler',
  tst.dene($q$insert into public.ezber_maddesi (kurum_id, kademe_id, ad, sira, grup) values ('c0000000-0000-0000-0000-00000000000a', null, 'İhlâs Sûresi', 1, 'Sureler')$q$), 'ok:1');
select tst.esit('kök admin grubu değiştirir', tst.dene($q$update public.ezber_maddesi set grup = 'Kısa Sureler' where kademe_id is null$q$), 'ok:1');
select tst.esit('grup boş metin olamaz', tst.dene($q$update public.ezber_maddesi set grup = '  ' where kademe_id is null$q$), 'hata:23514');
select tst.esit('ortak madde sonradan kademeye bağlanamaz (kolon yetkisi)',
  tst.dene($q$update public.ezber_maddesi set kademe_id = gen_random_uuid() where kademe_id is null$q$), 'hata:42501');
select tst.esit('kök admin başka müşterinin ortak listesine ekleyemez',
  tst.dene($q$insert into public.ezber_maddesi (kurum_id, kademe_id, ad) values ('c0000000-0000-0000-0000-00000000000b', null, 'x')$q$), 'hata:42501');

-- adminA2 (şube admini): okur; ne kök kuruma ne kendi şubesine ortak madde yazabilir
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000013","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('şube admini ortak listeyi okur', (select count(*) from public.ezber_maddesi where kademe_id is null)::text, '1');
select tst.esit('şube admini kök kurumun ortak listesine ekleyemez',
  tst.dene($q$insert into public.ezber_maddesi (kurum_id, kademe_id, ad) values ('c0000000-0000-0000-0000-00000000000a', null, 'x')$q$), 'hata:42501');
select tst.esit('ortak liste şubede tanımlanamaz (trigger)',
  tst.dene($q$insert into public.ezber_maddesi (kurum_id, kademe_id, ad) values ('c0000000-0000-0000-0000-0000000000a2', null, 'x')$q$), 'hata:23514');
select tst.esit('şube admini ortak maddeyi silemez', tst.dene($q$delete from public.ezber_maddesi where kademe_id is null$q$), 'ok:0');

-- ogrA1: ortak listeyi okur, yazamaz; kademesiz sınıftaki öğrencisine ortak maddeden ezber girer
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('öğretmen ortak listeyi okur', (select count(*) from public.ezber_maddesi where kademe_id is null)::text, '1');
select tst.esit('öğretmen ortak listeye ekleyemez',
  tst.dene($q$insert into public.ezber_maddesi (kurum_id, kademe_id, ad) values ('c0000000-0000-0000-0000-00000000000a', null, 'x')$q$), 'hata:42501');
select tst.esit('öğretmen ortak maddeden ezber girer',
  tst.dene($q$insert into public.ogrenci_ezber (kurum_id, ogrenci_id, madde_id, durum) select 'c0000000-0000-0000-0000-00000000000a', 'e0000000-0000-0000-0000-0000000000a1', id, 'tamam' from public.ezber_maddesi where kademe_id is null$q$), 'ok:1');

-- adminB: A'nın ortak listesi sızmaz
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('başka müşterinin admini ortak listeyi görmez', (select count(*) from public.ezber_maddesi)::text, '0');

-- Ortak madde silinince ezber kayıtları da silinir
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('kök admin ortak maddeyi siler', tst.dene($q$delete from public.ezber_maddesi where kademe_id is null$q$), 'ok:1');
reset role;
select tst.esit('ortak maddeyle birlikte ezber kayıtları silinir',
  (select count(*) from public.ogrenci_ezber where ogrenci_id = 'e0000000-0000-0000-0000-0000000000a1')::text, '0');

-- ===========================================================================
-- 32. CİNSİYET: yönetici kapsamındaki personel ve öğrencide yazar; panoda yalnızca sayı
--   Kurum G ağacı (28. bölüm).
-- ===========================================================================
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000041","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('bölge yöneticisi altındaki öğrencinin cinsiyetini yazar',
  tst.dene($q$update public.ogrenci set cinsiyet = 'kadin' where id = 'e0000000-0000-0000-0000-00000000d111'$q$), 'ok:1');
select tst.esit('bölge yöneticisi altındaki yöneticinin cinsiyetini yazar',
  tst.dene($q$update public.kullanici set cinsiyet = 'erkek' where id = 'b0000000-0000-0000-0000-000000000043'$q$), 'ok:1');
select tst.esit('yönetici kendi cinsiyetini yazar',
  tst.dene($q$update public.kullanici set cinsiyet = 'erkek' where id = 'b0000000-0000-0000-0000-000000000041'$q$), 'ok:1');
select tst.esit('cinsiyetle öğrenci eklenir',
  tst.dene($q$insert into public.ogrenci (kurum_id, sinif_id, ad_soyad, dogum_tarihi, cinsiyet) values ('c0000000-0000-0000-0000-00000000d111', 'd0000000-0000-0000-0000-00000000d111', 'oG2', '2020-01-01', 'erkek')$q$), 'ok:1');
select tst.esit('geçersiz cinsiyet reddedilir',
  tst.dene($q$update public.ogrenci set cinsiyet = 'x' where id = 'e0000000-0000-0000-0000-00000000d111'$q$), 'hata:22P02');
select tst.esit('pano: kadın öğrenci',
  (public.pano_cinsiyet('c0000000-0000-0000-0000-0000000000d1') -> 'ogrenci' ->> 'kadin'), '1');
select tst.esit('pano: erkek öğrenci',
  (public.pano_cinsiyet('c0000000-0000-0000-0000-0000000000d1') -> 'ogrenci' ->> 'erkek'), '1');
select tst.esit('pano cinsiyet ad döndürmez',
  position('oG' in public.pano_cinsiyet('c0000000-0000-0000-0000-0000000000d0')::text)::text, '0');

-- adminG2 (komşu bölge): satırı yazamaz, toplamı görür
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000044","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('komşu bölge yöneticisi öğrencinin cinsiyetini yazamaz',
  tst.dene($q$update public.ogrenci set cinsiyet = 'erkek' where id = 'e0000000-0000-0000-0000-00000000d111'$q$), 'ok:0');
select tst.esit('komşu bölge yöneticisi başka bölgenin yöneticisini yazamaz',
  tst.dene($q$update public.kullanici set cinsiyet = 'kadin' where id = 'b0000000-0000-0000-0000-000000000043'$q$), 'ok:0');
select tst.esit('komşu bölge toplamı görür',
  (public.pano_cinsiyet('c0000000-0000-0000-0000-0000000000d1') -> 'ogrenci' ->> 'kadin'), '1');

-- adminG111 (semt): üstündeki yöneticiyi yazamaz
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000043","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('semt yöneticisi üstündeki yöneticiyi yazamaz',
  tst.dene($q$update public.kullanici set cinsiyet = 'kadin' where id = 'b0000000-0000-0000-0000-000000000041'$q$), 'ok:0');

-- veliG: pano yok, öğrencinin cinsiyetini yazamaz
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000045","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('veli cinsiyet panosunu alamaz',
  tst.dene($q$select public.pano_cinsiyet('c0000000-0000-0000-0000-00000000d111')$q$), 'hata:42501');
select tst.esit('veli çocuğunun cinsiyetini yazamaz',
  tst.dene($q$update public.ogrenci set cinsiyet = 'erkek' where id = 'e0000000-0000-0000-0000-00000000d111'$q$), 'ok:0');

-- ===========================================================================
-- 33. KONU NOTU, YÖNETİCİ YANITI, İŞLENME TARİHİ VE DERS RAPORU
--   Kurum G ağacı (28. bölüm). 47 ogrG (29. bölüm; semt öğretmeni) sG'ye atanır; yeni 48 ogrG2
--   (bölge G2) sG2'ye. Kurum G'de "Kademe G" -> "Ders G" -> iki konu; sG ve sG2 bu kademeyi izler.
-- ===========================================================================
reset role;

insert into auth.users (id, aud, role, email) values
  ('a0000000-0000-0000-0000-000000000048', 'authenticated', 'authenticated', 'ogrg2@test.local');
insert into public.kullanici (id, auth_id, rol, kurum_id, ad_soyad) values
  ('b0000000-0000-0000-0000-000000000048', 'a0000000-0000-0000-0000-000000000048', 'ogretmen', 'c0000000-0000-0000-0000-0000000000d2', 'ogrG2');
insert into public.ogretmen_sinif (kurum_id, ogretmen_id, sinif_id) values
  ('c0000000-0000-0000-0000-00000000d111', 'b0000000-0000-0000-0000-000000000047', 'd0000000-0000-0000-0000-00000000d111'),
  ('c0000000-0000-0000-0000-0000000000d2', 'b0000000-0000-0000-0000-000000000048', 'd0000000-0000-0000-0000-0000000000d2');
insert into public.kademe (id, kurum_id, ad) values
  ('f0000000-0000-0000-0000-0000000000d0', 'c0000000-0000-0000-0000-0000000000d0', 'Kademe G');
insert into public.kademe_dersi (id, kurum_id, kademe_id, ad) values
  ('f0000000-0000-0000-0000-0000000000d1', 'c0000000-0000-0000-0000-0000000000d0', 'f0000000-0000-0000-0000-0000000000d0', 'Ders G');
insert into public.ders_konusu (id, kurum_id, ders_id, ad, sira) values
  ('f0000000-0000-0000-0000-0000000000d2', 'c0000000-0000-0000-0000-0000000000d0', 'f0000000-0000-0000-0000-0000000000d1', 'Konu 1', 1),
  ('f0000000-0000-0000-0000-0000000000d3', 'c0000000-0000-0000-0000-0000000000d0', 'f0000000-0000-0000-0000-0000000000d1', 'Konu 2', 2);
update public.sinif set kademe_id = 'f0000000-0000-0000-0000-0000000000d0'
  where id in ('d0000000-0000-0000-0000-00000000d111', 'd0000000-0000-0000-0000-0000000000d2');

-- ogrG: kendi sınıfına not yazar, konuyu işler; yanıt ve görüldü yazamaz; ileri tarih yok
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000047","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('hoca kendi sınıfına konu notu yazar',
  tst.dene($q$insert into public.sinif_konu_notu (kurum_id, sinif_id, konu_id, not_metni) values ('c0000000-0000-0000-0000-00000000d111', 'd0000000-0000-0000-0000-00000000d111', 'f0000000-0000-0000-0000-0000000000d2', 'Tekrar edilecek')$q$), 'ok:1');
select tst.esit('hocanın notu okunmamış başlar',
  (select (goruldu_zamani is null and yazan_kullanici_id = 'b0000000-0000-0000-0000-000000000047')::text from public.sinif_konu_notu), 'true');
select tst.esit('hoca başka sınıfa not yazamaz',
  tst.dene($q$insert into public.sinif_konu_notu (kurum_id, sinif_id, konu_id, not_metni) values ('c0000000-0000-0000-0000-0000000000d2', 'd0000000-0000-0000-0000-0000000000d2', 'f0000000-0000-0000-0000-0000000000d2', 'x')$q$), 'hata:42501');
select tst.esit('boş not reddedilir',
  tst.dene($q$update public.sinif_konu_notu set not_metni = '  '$q$), 'hata:23514');
select tst.esit('hoca yanıt yazamaz', tst.dene($q$update public.sinif_konu_notu set yanit_metni = 'x'$q$), 'hata:42501');
select tst.esit('hoca görüldü işaretleyemez', tst.dene($q$update public.sinif_konu_notu set goruldu_zamani = now()$q$), 'hata:42501');
select tst.esit('hoca yazan kişiyi değiştiremez (kolon yetkisi)',
  tst.dene($q$update public.sinif_konu_notu set yazan_kullanici_id = null$q$), 'hata:42501');
select tst.esit('hoca konuyu işler',
  tst.dene($q$insert into public.sinif_konu_ilerleme (kurum_id, sinif_id, konu_id, giren_kullanici_id) values ('c0000000-0000-0000-0000-00000000d111', 'd0000000-0000-0000-0000-00000000d111', 'f0000000-0000-0000-0000-0000000000d2', 'b0000000-0000-0000-0000-000000000047')$q$), 'ok:1');
select tst.esit('hoca işlenme tarihini geçmişe alır',
  tst.dene($q$update public.sinif_konu_ilerleme set tamamlanma_tarihi = '2026-09-01'$q$), 'ok:1');
select tst.esit('işlenme tarihi ileri olamaz',
  tst.dene($q$update public.sinif_konu_ilerleme set tamamlanma_tarihi = current_date + 3$q$), 'hata:23514');
select tst.esit('hoca ders raporu alamaz (boş)', (select count(*) from public.ders_raporu())::text, '0');

-- ogrG2: başka sınıfın notunu görmez
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000048","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('başka sınıfın hocası notu görmez', (select count(*) from public.sinif_konu_notu)::text, '0');

-- adminG111 (semt): notu görür, görüldü işaretler, yanıt yazar
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000043","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('yönetici kapsamındaki notu görür', (select count(*) from public.sinif_konu_notu)::text, '1');
select tst.esit('ders raporunda okunmamış not 1',
  (select okunmamis_not::text from public.ders_raporu() where sinif_adi = 'sG'), '1');
select tst.esit('yönetici görüldü işaretler', tst.dene($q$update public.sinif_konu_notu set goruldu_zamani = '2000-01-01'$q$), 'ok:1');
select tst.esit('görüldü zamanı ve gören sunucudan',
  (select (goruldu_zamani > now() - interval '1 minute' and goren_kullanici_id = 'b0000000-0000-0000-0000-000000000043')::text from public.sinif_konu_notu), 'true');
select tst.esit('yönetici yanıt yazar', tst.dene($q$update public.sinif_konu_notu set yanit_metni = 'Tamam, haftaya bakalım'$q$), 'ok:1');
select tst.esit('yanıtı veren sunucudan',
  (select (yanit_veren_kullanici_id = 'b0000000-0000-0000-0000-000000000043' and yanit_zamani is not null)::text from public.sinif_konu_notu), 'true');
select tst.esit('ders raporu: 1/2 konu, son tarih',
  (select islenen_konu || '/' || toplam_konu || ' ' || son_islenme from public.ders_raporu() where sinif_adi = 'sG'), '1/2 2026-09-01');
select tst.esit('ders raporu hoca adı', (select hocalar from public.ders_raporu() where sinif_adi = 'sG'), 'ogrG');
select tst.esit('semt yöneticisi raporda komşu bölgenin sınıfını görmez',
  (select count(*) from public.ders_raporu() where sinif_adi = 'sG2')::text, '0');

-- ogrG: yanıtı görür; notu değiştirince yeniden okunmamış olur, yanıt korunur
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000047","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('hoca yanıtı görür', (select yanit_metni from public.sinif_konu_notu), 'Tamam, haftaya bakalım');
select tst.esit('hoca notunu değiştirir', tst.dene($q$update public.sinif_konu_notu set not_metni = 'Tekrar edildi'$q$), 'ok:1');
select tst.esit('değişen not yeniden okunmamış, yanıt korunur',
  (select (goruldu_zamani is null and yanit_metni is not null)::text from public.sinif_konu_notu), 'true');

-- adminG2 (komşu bölge): notu görmez, raporda yalnızca kendi sınıfı
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000044","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('komşu bölge yöneticisi notu görmez', (select count(*) from public.sinif_konu_notu)::text, '0');
select tst.esit('komşu bölge yöneticisi notu güncelleyemez', tst.dene($q$update public.sinif_konu_notu set yanit_metni = 'x'$q$), 'ok:0');
select tst.esit('komşu bölge raporunda sG yok', (select count(*) from public.ders_raporu() where sinif_adi = 'sG')::text, '0');
select tst.esit('komşu bölge raporunda sG2 var', (select count(*) from public.ders_raporu() where sinif_adi = 'sG2')::text, '1');

-- adminG (kök): raporda iki sınıf
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000040","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('kök yönetici raporda tüm ağacın sınıfları',
  (select count(*) from public.ders_raporu())::text, (select count(*) from public.sinif)::text);
select tst.esit('kök yönetici raporda sG ve sG2', (select count(*) from public.ders_raporu() where sinif_adi in ('sG', 'sG2'))::text, '2');

-- adminB (başka müşteri): hiçbir şey
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('başka müşterinin yöneticisi notu görmez', (select count(*) from public.sinif_konu_notu)::text, '0');
select tst.esit('başka müşterinin raporunda G sınıfı yok',
  (select count(*) from public.ders_raporu() where sinif_adi in ('sG', 'sG2'))::text, '0');

-- veliG: konunun işlendiğini görür, notu görmez, rapor boş
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000045","role":"authenticated"}', true);
set local role authenticated;

select tst.esit('veli işlenen konuyu görür', (select count(*) from public.sinif_konu_ilerleme)::text, '1');
select tst.esit('veli konu notunu göremez', (select count(*) from public.sinif_konu_notu)::text, '0');
select tst.esit('veli ders raporu alamaz (boş)', (select count(*) from public.ders_raporu())::text, '0');

-- anon
reset role;
set local role anon;
select tst.esit('anon konu notunu okuyamaz', tst.dene($q$select count(*) from public.sinif_konu_notu$q$), 'hata:42501');
select tst.esit('anon ders raporunu çağıramaz', tst.dene($q$select count(*) from public.ders_raporu()$q$), 'hata:42501');

-- Konu silinince not da silinir
reset role;
delete from public.ders_konusu where id = 'f0000000-0000-0000-0000-0000000000d2';
select tst.esit('konu silinince notu silinir', (select count(*) from public.sinif_konu_notu)::text, '0');

reset role;
select 'TÜM RLS TESTLERİ GEÇTİ' as sonuc;

rollback;
