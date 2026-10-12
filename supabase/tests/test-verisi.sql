-- TEST VERİSİ: tüm veriyi SİLER ve Genç Hareket örnek ağacını baştan kurar.
-- Yalnızca test ortamında çalıştırılır (Dashboard > SQL Editor). Gerçek veri varken ÇALIŞTIRMA.
--
--   Genç Hareket (Genel Merkez, marka: varsayilan)
--     İstanbul ─ Küçükçekmece ─ Sefaköy  (Kâşif 1, İnşirah 1)
--              │              └ İkitelli
--              └ Sancaktepe             (Kâşif 1, Kâşif 2, Kâşif 3, İnşirah 1)
--     Elazığ
--     Malatya
--
-- Tüm hesapların şifresi: Test.1234!   Her sınıfta 6 erkek öğrenci (TCKN'siz; veli hesabı yok).

begin;

-- Her tabloda kurum_id olduğu için kurum'dan zincirleme boşaltmak tüm uygulama verisini siler.
truncate table public.kurum cascade;
delete from auth.users;

create function pg_temp.kurum_ekle(p_ad text, p_ust uuid, p_marka text default null)
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  insert into public.kurum (ad, ust_kurum_id, marka_kodu, ozellikler)
  values (p_ad, p_ust, p_marka, case when p_ust is null then '{"icerik_takibi": true}'::jsonb else '{}'::jsonb end)
  returning id into v_id;
  return v_id;
end $$;

-- Auth hesabı (e-posta + şifre, onaylı) ve uygulama profili. kullanici.id döner.
create function pg_temp.kullanici_ekle(p_eposta text, p_ad_soyad text, p_rol public.rol, p_kurum uuid)
returns uuid language plpgsql as $$
declare
  v_auth uuid := gen_random_uuid();
  v_id uuid;
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) values (
    '00000000-0000-0000-0000-000000000000', v_auth, 'authenticated', 'authenticated', p_eposta,
    extensions.crypt('Test.1234!', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
    '', '', '', ''
  );
  insert into auth.identities (user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  values (v_auth, v_auth::text, 'email',
    jsonb_build_object('sub', v_auth::text, 'email', p_eposta, 'email_verified', true), now(), now(), now());
  insert into public.kullanici (auth_id, rol, kurum_id, ad_soyad, eposta, sifre_belirlendi)
  values (v_auth, p_rol, p_kurum, p_ad_soyad, p_eposta, true)
  returning id into v_id;
  return v_id;
end $$;

-- Sınıf + (verilirse) öğretmeni + 6 erkek öğrenci. p_sira: adların tekrar etmemesi için sınıf sırası.
create function pg_temp.sinif_ekle(p_kurum uuid, p_ad text, p_sira int, p_ogretmen uuid default null)
returns void language plpgsql as $$
declare
  v_sinif uuid;
  v_adlar text[] := array['Ahmet','Mehmet','Mustafa','Ali','Yusuf','Ömer','Emre','Burak','Enes','Furkan','Kerem','Eymen',
    'Hamza','Miraç','Berat','Yiğit','Talha','Halil','İbrahim','Bilal','Selim','Tarık','Kaan','Arda','Emir','Umut',
    'Salih','Harun','Musa','İsmail','Yasin','Taha','Alperen','Batuhan','Oğuz','Sefa'];
  v_soyadlar text[] := array['Yılmaz','Kaya','Demir','Çelik','Şahin','Yıldız','Öztürk','Aydın','Arslan','Doğan','Kılıç','Aslan',
    'Çetin','Kara','Koç','Kurt','Özkan','Şimşek','Polat','Korkmaz','Erdem','Güneş','Aktaş','Bulut','Tekin','Yavuz',
    'Acar','Uçar','Karaca','Bozkurt','Güler','Turan','Avcı','Sönmez','Keskin','Işık'];
  i int;
  n int;
begin
  insert into public.sinif (kurum_id, ad, donem) values (p_kurum, p_ad, '2026-2027') returning id into v_sinif;
  if p_ogretmen is not null then
    insert into public.ogretmen_sinif (kurum_id, ogretmen_id, sinif_id) values (p_kurum, p_ogretmen, v_sinif);
  end if;
  for i in 1..6 loop
    n := (p_sira - 1) * 6 + i;
    insert into public.ogrenci (kurum_id, sinif_id, ad_soyad, dogum_tarihi)
    values (p_kurum, v_sinif, v_adlar[n] || ' ' || v_soyadlar[1 + (n * 7) % 36],
      date '2010-01-01' + (floor(random() * 2190))::int);
  end loop;
end $$;

do $$
declare
  gh uuid; ist uuid; ela uuid; mal uuid; kck uuid; san uuid; sef uuid; iki uuid;
begin
  gh  := pg_temp.kurum_ekle('Genç Hareket', null, 'varsayilan');
  ist := pg_temp.kurum_ekle('İstanbul', gh);
  ela := pg_temp.kurum_ekle('Elazığ', gh);
  mal := pg_temp.kurum_ekle('Malatya', gh);
  kck := pg_temp.kurum_ekle('Küçükçekmece', ist);
  san := pg_temp.kurum_ekle('Sancaktepe', ist);
  sef := pg_temp.kurum_ekle('Sefaköy', kck);
  iki := pg_temp.kurum_ekle('İkitelli', kck);

  perform pg_temp.kullanici_ekle('admin@test.local', 'Süper Admin', 'super_admin', null);
  perform pg_temp.kullanici_ekle('abdulkadir_kizilboga@test.local', 'Abdulkadir Kızılboğa', 'kurum_admin', gh);
  perform pg_temp.kullanici_ekle('emir_yuksek@test.local', 'Emir Yüksek', 'kurum_admin', ist);
  perform pg_temp.kullanici_ekle('bekir_irtegun@test.local', 'Bekir İrtegün', 'kurum_admin', ela);
  perform pg_temp.kullanici_ekle('mehmet_topal@test.local', 'Mehmet Topal', 'kurum_admin', mal);
  perform pg_temp.kullanici_ekle('cemal_efe@test.local', 'Cemal Efe', 'kurum_admin', kck);
  perform pg_temp.kullanici_ekle('huseyin_eren@test.local', 'Hüseyin Eren', 'kurum_admin', san);
  perform pg_temp.kullanici_ekle('onur_gomleksiz@test.local', 'Onur Gömleksiz', 'kurum_admin', sef);
  perform pg_temp.kullanici_ekle('musab_kulaz@test.local', 'Musab Kulaz', 'kurum_admin', iki);

  perform pg_temp.sinif_ekle(sef, 'Kâşif 1', 1,
    pg_temp.kullanici_ekle('abdulkadir_cabbar_bitigen@test.local', 'Abdulkadir Cabbar Bitigen', 'ogretmen', sef));
  perform pg_temp.sinif_ekle(sef, 'İnşirah 1', 2);
  perform pg_temp.sinif_ekle(san, 'Kâşif 1', 3,
    pg_temp.kullanici_ekle('furkan_gumusn@test.local', 'Furkan Gümüş', 'ogretmen', san));
  perform pg_temp.sinif_ekle(san, 'Kâşif 2', 4,
    pg_temp.kullanici_ekle('huseyin_erdogan@test.local', 'Hüseyin Erdoğan', 'ogretmen', san));
  perform pg_temp.sinif_ekle(san, 'Kâşif 3', 5,
    pg_temp.kullanici_ekle('beraat_gundogdu@test.local', 'Beraat Gündoğdu', 'ogretmen', san));
  perform pg_temp.sinif_ekle(san, 'İnşirah 1', 6,
    pg_temp.kullanici_ekle('yusuf_seven@test.local', 'Yusuf Seven', 'ogretmen', san));
end $$;

commit;

select
  (select count(*) from public.kurum) as kurum,
  (select count(*) from public.kullanici) as kullanici,
  (select count(*) from public.sinif) as sinif,
  (select count(*) from public.ogrenci) as ogrenci;
