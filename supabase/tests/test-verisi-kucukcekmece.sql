-- TEST VERİSİ (ek): genel merkez yöneticisi Hamza Karaca + Küçükçekmece altındaki İkitelli ve Sefaköy temsilciliklerine
-- sınıf, kademe, ders programı, öğrenci, yoklama, konu ilerlemesi, ezber ve konu notu.
--
-- Hiçbir şeyi SİLMEZ; yalnızca ekler. Dashboard > SQL Editor'de bir kez çalıştırılır; hamza_karaca
-- hesabı zaten varsa hiçbir şey yapmadan durur. Birimler adla aranır (içinde "Küçükçekmece",
-- "İkitelli", "Sefaköy" geçen, `varsayilan` markalı müşterinin birimleri).
--
-- Ön koşul: Kademe I-III tanımlı olmalı (supabase/tohum/kademe-dersleri-genchareket.sql). Ortak
-- ezber listesi varsa (supabase/tohum/ezber-listesi-genchareket.sql) ezber kayıtları da eklenir.
--
-- Hocalar: temsilcilikteki mevcut aktif öğretmenler kullanılır; ikiden azsa yeni hoca açılır.
-- Hocanın bu birimde sınıfı varsa o kullanılır ve eksikleri tamamlanır (kademesi yoksa atanır, 8
-- öğrenciye tamamlanır, programı/ders günleri yoksa eklenir; var olan yoklama ve kayıtlar
-- değişmez). Sınıfı yoksa yeni sınıf açılır; sınıflar sırayla Kademe I, II, III'ü izler.
-- Yeni hesapların şifresi: Test.1234!   Öğrencilerin veli girişi açılmaz (öğrenci ekranından açılır).

begin;

create function pg_temp.hesap_ekle(p_eposta text, p_ad_soyad text, p_rol public.rol, p_kurum uuid)
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
  insert into public.kullanici (auth_id, rol, kurum_id, ad_soyad, eposta, sifre_belirlendi, cinsiyet)
  values (v_auth, p_rol, p_kurum, p_ad_soyad, p_eposta, true, 'erkek')
  returning id into v_id;
  return v_id;
end $$;

-- İçinde p_ad geçen tek birim (müşterinin ağacında; verilirse p_ust'un doğrudan altında).
create function pg_temp.birim_bul(p_kok uuid, p_ad text, p_ust uuid default null)
returns uuid language plpgsql as $$
declare v_idler uuid[];
begin
  select array_agg(id) into v_idler from public.kurum
  where kok_kurum_id = p_kok and ad ilike '%' || p_ad || '%' and (p_ust is null or ust_kurum_id = p_ust);
  if coalesce(array_length(v_idler, 1), 0) <> 1 then
    raise exception 'Adında "%" geçen tek bir birim bulunamadı (bulunan: %)', p_ad, coalesce(array_length(v_idler, 1), 0);
  end if;
  return v_idler[1];
end $$;

do $$
declare
  v_kok uuid;
  v_kck uuid;
  v_temsilcilik uuid;
  v_kademeler uuid[];
  v_kademe_adlari text[] := array['Kâşif', 'İnşirah', 'Fetih'];
  v_yeni_hocalar text[][] := array[
    ['zeki_aksoy@test.local', 'Zeki Aksoy'], ['bunyamin_er@test.local', 'Bünyamin Er'],
    ['said_yalcin@test.local', 'Said Yalçın'], ['osman_tuna@test.local', 'Osman Tuna']];
  v_yeni_sira int := 1;
  v_adlar text[] := array['Ahmet','Mehmet','Mustafa','Ali','Yusuf','Ömer','Emre','Burak','Enes','Furkan','Kerem','Eymen',
    'Hamza','Miraç','Berat','Yiğit','Talha','Halil','İbrahim','Bilal','Selim','Tarık','Kaan','Arda','Emir','Umut',
    'Salih','Harun','Musa','İsmail','Yasin','Taha','Alperen','Batuhan','Oğuz','Sefa','Zeyd','Ensar','Abdullah','Hüseyin'];
  v_soyadlar text[] := array['Yılmaz','Kaya','Demir','Çelik','Şahin','Yıldız','Öztürk','Aydın','Arslan','Doğan','Kılıç','Aslan',
    'Çetin','Kara','Koç','Kurt','Özkan','Şimşek','Polat','Korkmaz','Erdem','Güneş','Aktaş','Bulut','Tekin','Yavuz',
    'Acar','Uçar','Bozkurt','Güler','Turan','Avcı','Sönmez','Keskin','Işık','Ateş','Duman','Ekinci','Sarı','Tunç'];
  v_hocalar uuid[];
  v_hoca uuid;
  v_sinif uuid;
  v_kademe uuid;
  v_no int;
  v_sinif_no int := 0;
  v_ogrenci_no int := 0;
  v_kademe_sira int;
  v_gunler smallint[];
  v_pazartesi date := (date_trunc('week', current_date) - interval '56 day')::date;
  t text;
  i int;
begin
  select id into v_kok from public.kurum where marka_kodu = 'varsayilan';
  if v_kok is null then raise exception 'varsayilan markalı müşteri bulunamadı'; end if;

  if exists (select 1 from auth.users where email = 'hamza_karaca@test.local') then
    raise notice 'hamza_karaca@test.local zaten var; test verisi daha önce kurulmuş, hiçbir şey eklenmedi.';
    return;
  end if;

  select array_agg(id order by ad) into v_kademeler
  from public.kademe where kurum_id = v_kok and ad in ('Kademe I', 'Kademe II', 'Kademe III');
  if coalesce(array_length(v_kademeler, 1), 0) <> 3 then
    raise exception 'Kademe I-III bulunamadı; önce supabase/tohum/kademe-dersleri-genchareket.sql çalıştırılmalı';
  end if;

  v_kck := pg_temp.birim_bul(v_kok, 'Küçükçekmece');
  -- Genel merkez (kök) yöneticisi: tüm ağacı görür.
  perform pg_temp.hesap_ekle('hamza_karaca@test.local', 'Hamza Karaca', 'kurum_admin', v_kok);

  foreach t in array array['İkitelli', 'Sefaköy'] loop
    v_temsilcilik := pg_temp.birim_bul(v_kok, t, v_kck);

    -- Mevcut hocalar; ikiden azsa yenileri açılır.
    select coalesce(array_agg(id order by ad_soyad), '{}') into v_hocalar
    from public.kullanici where kurum_id = v_temsilcilik and rol = 'ogretmen' and aktif;
    while coalesce(array_length(v_hocalar, 1), 0) < 2 loop
      if exists (select 1 from auth.users where email = v_yeni_hocalar[v_yeni_sira][1]) then
        v_yeni_sira := v_yeni_sira + 1;
        continue;
      end if;
      v_hocalar := v_hocalar || pg_temp.hesap_ekle(v_yeni_hocalar[v_yeni_sira][1], v_yeni_hocalar[v_yeni_sira][2], 'ogretmen', v_temsilcilik);
      v_yeni_sira := v_yeni_sira + 1;
    end loop;

    foreach v_hoca in array v_hocalar loop
      v_sinif_no := v_sinif_no + 1;
      v_kademe_sira := 1 + (v_sinif_no - 1) % 3;

      -- Hocanın bu birimde sınıfı varsa o kullanılır (eksikleri tamamlanır); yoksa yeni sınıf açılır.
      select s.id, s.kademe_id into v_sinif, v_kademe
      from public.sinif s join public.ogretmen_sinif os on os.sinif_id = s.id
      where os.ogretmen_id = v_hoca and s.kurum_id = v_temsilcilik
      order by s.ad limit 1;
      if v_sinif is null then
        v_no := 1;
        while exists (select 1 from public.sinif where kurum_id = v_temsilcilik and ad = v_kademe_adlari[v_kademe_sira] || ' ' || v_no) loop
          v_no := v_no + 1;
        end loop;
        insert into public.sinif (kurum_id, ad, donem, kademe_id)
        values (v_temsilcilik, v_kademe_adlari[v_kademe_sira] || ' ' || v_no, '2026-2027', v_kademeler[v_kademe_sira])
        returning id into v_sinif;
        insert into public.ogretmen_sinif (kurum_id, ogretmen_id, sinif_id) values (v_temsilcilik, v_hoca, v_sinif);
        v_kademe := v_kademeler[v_kademe_sira];
      elsif v_kademe is null then
        -- Mevcut sınıfın kademesi adından (Kâşif -> I, İnşirah -> II, Fetih -> III), değilse sıradan.
        select coalesce(min(x.i), v_kademe_sira) into v_kademe_sira
        from unnest(v_kademe_adlari) with ordinality as x (ad, i)
        where (select ad from public.sinif where id = v_sinif) ilike x.ad || '%';
        v_kademe := v_kademeler[v_kademe_sira];
        update public.sinif set kademe_id = v_kademe where id = v_sinif;
      end if;

      -- Sınıf 8 aktif öğrenciye tamamlanır.
      for i in 1..greatest(0, 8 - (select count(*) from public.ogrenci where sinif_id = v_sinif and aktif)::int) loop
        v_ogrenci_no := v_ogrenci_no + 1;
        insert into public.ogrenci (kurum_id, sinif_id, ad_soyad, dogum_tarihi, cinsiyet)
        values (v_temsilcilik, v_sinif,
          v_adlar[1 + (v_ogrenci_no * 7) % 40] || ' ' || v_soyadlar[1 + (v_ogrenci_no * 11) % 40],
          date '2012-01-01' + (floor(random() * 1800))::int, 'erkek');
      end loop;

      -- Ders günleri (sınıfın planı yoksa): tek sıradaki sınıflar hafta sonu, çiftler salı-perşembe.
      select ders_gunleri into v_gunler from public.sinif_ders_plani where sinif_id = v_sinif
      order by baslangic_tarihi desc limit 1;
      if v_gunler is null then
        v_gunler := case when v_sinif_no % 2 = 1 then '{6,7}'::smallint[] else '{2,4}'::smallint[] end;
        insert into public.sinif_ders_plani (kurum_id, sinif_id, baslangic_tarihi, ders_gunleri)
        values (v_temsilcilik, v_sinif, v_pazartesi, v_gunler);
      end if;

      -- Ders programı (sınıfın programı yoksa): dört ders, ders günlerinin ilkine ve sonuncusuna ikişer;
      -- hafta sonu sabah, hafta içi akşam.
      if not exists (select 1 from public.ders_programi where sinif_id = v_sinif) then
        insert into public.ders_programi (kurum_id, sinif_id, gun, baslangic_saati, bitis_saati, ders_adi)
        select v_temsilcilik, v_sinif, d.gun,
          (case when d.gun >= 6 then '10:00'::time else '19:00'::time end) + d.kayma,
          (case when d.gun >= 6 then '11:00'::time else '20:00'::time end) + d.kayma,
          d.ders
        from (values
          (v_gunler[1], interval '0', 'Kur''an'),
          (v_gunler[1], interval '75 min', 'Siyer'),
          (v_gunler[array_length(v_gunler, 1)], interval '0', 'İlmihal'),
          (v_gunler[array_length(v_gunler, 1)], interval '75 min', 'Şahsiyet Penceresi')
        ) as d (gun, kayma, ders)
        on conflict (sinif_id, gun, baslangic_saati) do nothing;
      end if;

      -- Son 8 haftanın yoklaması (ders günlerinin ~%10'unda alınmamış).
      insert into public.yoklama (kurum_id, ogrenci_id, tarih, durum, giren_kullanici_id)
      select v_temsilcilik, o.id, g.gun::date,
        (case when r < 0.78 then 'geldi' when r < 0.84 then 'gec' when r < 0.88 then 'mazeretli' else 'gelmedi' end)::public.yoklama_durumu,
        v_hoca
      from public.ogrenci o
      cross join generate_series(v_pazartesi::timestamp, current_date::timestamp, interval '1 day') as g (gun)
      cross join lateral (select random() as r) x
      where o.sinif_id = v_sinif
        and extract(isodow from g.gun)::smallint = any (v_gunler)
        and ('x' || substr(md5(v_sinif::text || g.gun::text), 1, 2))::bit(8)::int > 25
      on conflict (ogrenci_id, tarih) do nothing;

      -- Konu ilerlemesi: her derste baştan 2-8 konu işlenmiş, tarihleri son haftalara yayılmış.
      insert into public.sinif_konu_ilerleme (kurum_id, sinif_id, konu_id, tamamlanma_tarihi, giren_kullanici_id)
      select v_temsilcilik, v_sinif, c.id, current_date - (d.islenen - c.sira) * 6, v_hoca
      from public.kademe_dersi kd
      cross join lateral (select 2 + floor(random() * 7)::int as islenen) d
      join public.ders_konusu c on c.ders_id = kd.id and c.sira <= d.islenen
      where kd.kademe_id = v_kademe
      on conflict (sinif_id, konu_id) do nothing;

      -- Ezber (ortak liste varsa): öğrenci başına baştan 3-14 madde tamam, sonraki 2 madde devam.
      insert into public.ogrenci_ezber (kurum_id, ogrenci_id, madde_id, durum)
      select v_temsilcilik, o.id, m.id, case when m.sira <= o.tamam then 'tamam' else 'devam' end::public.ezber_durumu
      from (select id, 3 + floor(random() * 12)::int as tamam from public.ogrenci where sinif_id = v_sinif) o
      join public.ezber_maddesi m on m.kurum_id = v_kok and m.kademe_id is null and m.sira <= o.tamam + 2
      on conflict (ogrenci_id, madde_id) do nothing;

      -- Her temsilciliğin ilk sınıfında hocanın son işlediği Kur'an konusuna okunmamış bir not.
      if v_hoca = v_hocalar[1] and not exists (select 1 from public.sinif_konu_notu where sinif_id = v_sinif) then
        perform set_config('request.jwt.claims',
          json_build_object('sub', (select auth_id from public.kullanici where id = v_hoca), 'role', 'authenticated')::text, true);
        insert into public.sinif_konu_notu (kurum_id, sinif_id, konu_id, not_metni)
        select v_temsilcilik, v_sinif, i2.konu_id, 'Sınıfın yarısı bu konuda zorlandı, haftaya tekrar edeceğim.'
        from public.sinif_konu_ilerleme i2
        join public.ders_konusu c on c.id = i2.konu_id
        join public.kademe_dersi kd on kd.id = c.ders_id and kd.ad = 'Kur''an'
        where i2.sinif_id = v_sinif
        order by c.sira desc
        limit 1;
        perform set_config('request.jwt.claims', '', true);
      end if;
    end loop;
  end loop;
end $$;

commit;

select
  k.ad as birim,
  s.ad as sinif,
  kd.ad as kademe,
  (select string_agg(u.ad_soyad || ' <' || u.eposta || '>', ', ') from public.ogretmen_sinif os
     join public.kullanici u on u.id = os.ogretmen_id where os.sinif_id = s.id) as hoca,
  (select count(*) from public.ogrenci o where o.sinif_id = s.id) as ogrenci,
  (select count(*) from public.sinif_konu_ilerleme i where i.sinif_id = s.id) as islenen_konu,
  (select count(*) from public.yoklama y join public.ogrenci o on o.id = y.ogrenci_id where o.sinif_id = s.id) as yoklama
from public.sinif s
join public.kurum k on k.id = s.kurum_id
left join public.kademe kd on kd.id = s.kademe_id
where k.ust_kurum_id = (select id from public.kurum where ad ilike '%Küçükçekmece%'
  and kok_kurum_id = (select id from public.kurum where marka_kodu = 'varsayilan'))
order by k.ad, s.ad;
