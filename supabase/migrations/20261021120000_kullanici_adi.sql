-- TCKN'nin kaldırılması; veli girişi öğrencinin adından üretilen kullanıcı adıyla.
--
-- Bilgi güvenliği gereği öğrencinin TC kimlik numarası tutulmaz (2026-10-13 kararı). TCKN'nin
-- gördüğü üç işi `ogrenci.kullanici_adi` devralır:
--   1. velinin giriş adı (kullanıcı adı + PIN; bkz. supabase/functions/veli-giris)
--   2. veli auth hesabının e-postası: {kullanici_adi}@{marka_kodu}.veli.internal
--   3. "bu öğrencinin veli girişi açık" işareti (kullanıcı adı hesap açılırken atanır)
--
-- Kural: adın tüm kelimeleri küçük harfle, noktayla birleştirilir; Türkçe harfler çevrilir
-- ("Ahmet Emin Yılmaz" -> ahmet.emin.yilmaz). Müşteri (kök kurum) başına tekildir; çakışmada sona
-- 1, 2, 3… eklenir. Atandıktan sonra değişmez (öğrencinin adı düzeltilse bile).
--
-- Kolonu yalnızca service-role Edge Function'lar yazar (veli-hesap-olustur); istemcinin ogrenci
-- üzerindeki insert/update yetkisi kolon bazlıdır ve bu kolonu içermez (bkz. 20260928120200).
--
-- DİKKAT: ogrenci.tckn ve basvuru.tckn kolonları SİLİNİR; veri geri getirilemez.

-- ---------------------------------------------------------------------------
-- 1. Kullanıcı adı
-- ---------------------------------------------------------------------------
alter table public.ogrenci
  add column kullanici_adi text,
  add constraint ogrenci_kullanici_adi_bicim
    check (kullanici_adi is null or kullanici_adi ~ '^[a-z0-9]+(\.[a-z0-9]+)*$' and char_length(kullanici_adi) <= 60),
  add constraint ogrenci_kok_kurum_kullanici_adi_key unique (kok_kurum_id, kullanici_adi);

-- Addan kullanıcı adının tabanı (sayı eki olmadan). Önce Türkçe büyük harfler çevrilir: lower()
-- veritabanı yereline göre "I" ve "İ" için beklenmeyen sonuç verebilir. Harf ve rakam dışındaki
-- her şey kelime ayracı sayılır. Hiç harf kalmazsa (ör. yalnızca başka alfabeden bir ad) 'ogrenci'.
create function gizli.kullanici_adi_tabani(p_ad_soyad text)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    nullif(
      left(
        trim(both '.' from regexp_replace(
          lower(translate(p_ad_soyad, 'ŞşÇçĞğİIıÖöÜüÂâÎîÛû', 'ssccggiiioouuaaiiuu')),
          '[^a-z0-9]+', '.', 'g'
        )),
        50
      ),
      ''
    ),
    'ogrenci'
  );
$$;

revoke all on function gizli.kullanici_adi_tabani(text) from public, anon;

-- Öğrenciye kullanıcı adı atar ve döndürür; atanmışsa mevcut adı döndürür (ad değişmez).
-- Adaylar sırayla denenir (taban, taban1, taban2 …); tekillik kısıtı çakışmayı yakalar, böylece
-- aynı anda eklenen aynı adlı iki öğrenci aynı adı alamaz. Yalnızca service_role çağırır.
create function public.ogrenci_kullanici_adi_ata(p_ogrenci_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mevcut text;
  v_ad_soyad text;
  v_taban text;
  v_aday text;
  v_ek integer := 0;
begin
  select o.kullanici_adi, o.ad_soyad into v_mevcut, v_ad_soyad
  from public.ogrenci o where o.id = p_ogrenci_id for update;
  if not found then
    raise exception 'Öğrenci bulunamadı' using errcode = 'no_data_found';
  end if;
  if v_mevcut is not null then
    return v_mevcut;
  end if;

  v_taban := gizli.kullanici_adi_tabani(v_ad_soyad);
  loop
    v_aday := v_taban || case when v_ek = 0 then '' else v_ek::text end;
    begin
      update public.ogrenci set kullanici_adi = v_aday where id = p_ogrenci_id;
      return v_aday;
    exception when unique_violation then
      v_ek := v_ek + 1;
      if v_ek > 999 then
        raise exception 'Kullanıcı adı üretilemedi' using errcode = 'unique_violation';
      end if;
    end;
  end loop;
end;
$$;

revoke all on function public.ogrenci_kullanici_adi_ata(uuid) from public, anon, authenticated;
grant execute on function public.ogrenci_kullanici_adi_ata(uuid) to service_role;

-- Mevcut veri: TCKN'si olan (= veli hesabı açılmış) öğrenciler kullanıcı adı alır. Auth hesabının
-- e-postası burada değişmez; yönetici "PIN'i sıfırla" deyince hesap yeni ada çevrilir
-- (bkz. supabase/functions/veli-pin-sifirla).
do $$
declare o record;
begin
  for o in select id from public.ogrenci where tckn is not null order by olusturma_tarihi, id loop
    perform public.ogrenci_kullanici_adi_ata(o.id);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2. TCKN'nin silinmesi
-- ---------------------------------------------------------------------------
alter table public.ogrenci
  drop constraint ogrenci_kok_kurum_tckn_key,
  drop constraint ogrenci_tckn_format,
  drop column tckn;

alter table public.basvuru
  drop constraint basvuru_tur_alanlari,
  drop column tckn,
  -- "is not null" koşulları açıkça yazıldı: check, sonucu NULL olan ifadeyi geçirir.
  add constraint basvuru_tur_alanlari check (
    (
      tur = 'ogrenci'
      and dogum_tarihi is not null
      and veli_ad_soyad is not null and char_length(btrim(veli_ad_soyad)) between 1 and 120
      and veli_telefon is not null and veli_telefon ~ '^[0-9+ ]{10,20}$'
      and eposta is null
    )
    or (
      tur = 'personel'
      and eposta is not null and eposta ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      and char_length(eposta) <= 254
      and dogum_tarihi is null and veli_ad_soyad is null and veli_telefon is null
    )
  );

-- ---------------------------------------------------------------------------
-- 3. pano_ozeti: "veli girişi açık" sayısı artık kullanıcı adına bakar. Gövdenin geri kalanı
--    20261019120000_pano.sql'deki ile aynıdır (plpgsql gövdesi silinen kolona çalışma anında
--    takılacağı için fonksiyon bütünüyle yeniden tanımlanır).
-- ---------------------------------------------------------------------------
create or replace function public.pano_ozeti(p_kurum_id uuid, p_baslangic date, p_bitis date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_bugun date := (now() at time zone 'Europe/Istanbul')::date;
  v_gun_sayisi integer;
  v_sonuc jsonb;
begin
  perform gizli.pano_yetki(p_kurum_id);
  if p_baslangic is null or p_bitis is null or p_bitis < p_baslangic or p_bitis - p_baslangic > 370 then
    raise exception 'Geçersiz tarih aralığı' using errcode = 'invalid_parameter_value';
  end if;
  v_gun_sayisi := p_bitis - p_baslangic + 1;

  with dugumler as (
    select k.id, k.ad, k.seviye, k.ust_kurum_id, k.yol
    from public.kurum k
    where k.yol @> array[p_kurum_id]
  ),
  -- Her düğümün verisi, seçilen alt ağaçtaki tüm üstlerine de sayılır.
  atalar as (
    select d.id as kurum_id, u.ata
    from dugumler d
    cross join lateral unnest(d.yol) as u (ata)
    where u.ata in (select id from dugumler)
  ),
  ogr as (
    select t.ata, count(*) as n
    from public.ogrenci o join atalar t on t.kurum_id = o.kurum_id
    where o.aktif
    group by t.ata
  ),
  snf as (
    select t.ata, count(*) as n
    from public.sinif s join atalar t on t.kurum_id = s.kurum_id
    group by t.ata
  ),
  ogt as (
    select t.ata, count(*) as n
    from public.kullanici c join atalar t on t.kurum_id = c.kurum_id
    where c.rol = 'ogretmen' and c.aktif
    group by t.ata
  ),
  alt as (
    select d.ust_kurum_id as ata, count(*) as n
    from dugumler d
    where d.id <> p_kurum_id
    group by d.ust_kurum_id
  ),
  yok as (
    select t.ata,
      count(*) filter (where y.durum in ('geldi', 'gec')) as katildi,
      count(*) filter (where y.durum = 'gelmedi') as gelmedi
    from public.yoklama y join atalar t on t.kurum_id = y.kurum_id
    where y.tarih between p_baslangic and p_bitis
    group by t.ata
  ),
  -- Yoklama düzeni: sınıfın planına göre ders günü olan günler (plan, başladığı haftadan itibaren
  -- bir sonraki plana kadar geçerlidir) ve bunlardan yoklaması alınmış olanlar.
  gunler as (
    select g::date as gun
    from generate_series(p_baslangic::timestamp, least(p_bitis, v_bugun)::timestamp, interval '1 day') as g
  ),
  planli as (
    select s.id as sinif_id, s.kurum_id, g.gun
    from public.sinif s
    join dugumler d on d.id = s.kurum_id
    cross join gunler g
    join lateral (
      select p.ders_gunleri
      from public.sinif_ders_plani p
      where p.sinif_id = s.id and p.baslangic_tarihi <= g.gun
      order by p.baslangic_tarihi desc
      limit 1
    ) pl on true
    where extract(isodow from g.gun)::smallint = any (pl.ders_gunleri)
      and exists (select 1 from public.ogrenci o where o.sinif_id = s.id and o.aktif)
  ),
  alinan as (
    select distinct o.sinif_id, y.tarih
    from public.yoklama y
    join public.ogrenci o on o.id = y.ogrenci_id
    join dugumler d on d.id = y.kurum_id
    where y.tarih between p_baslangic and p_bitis
  ),
  duzen as (
    select t.ata,
      count(*) as planli,
      count(*) filter (where exists (select 1 from alinan a where a.sinif_id = p.sinif_id and a.tarih = p.gun)) as alinan
    from planli p join atalar t on t.kurum_id = p.kurum_id
    group by t.ata
  ),
  bugun_planli as (
    select s.id as sinif_id
    from public.sinif s
    join dugumler d on d.id = s.kurum_id
    join lateral (
      select p.ders_gunleri
      from public.sinif_ders_plani p
      where p.sinif_id = s.id and p.baslangic_tarihi <= v_bugun
      order by p.baslangic_tarihi desc
      limit 1
    ) pl on true
    where extract(isodow from v_bugun)::smallint = any (pl.ders_gunleri)
      and exists (select 1 from public.ogrenci o where o.sinif_id = s.id and o.aktif)
  ),
  haftalar as (
    select (date_trunc('week', v_bugun::timestamp) - (i * interval '7 day'))::date as hafta
    from generate_series(0, 11) as i
  ),
  haftalik as (
    select h.hafta,
      count(y.id) filter (where y.durum in ('geldi', 'gec')) as katildi,
      count(y.id) filter (where y.durum = 'gelmedi') as gelmedi
    from haftalar h
    left join public.yoklama y
      on y.tarih between h.hafta and h.hafta + 6
     and y.kurum_id in (select id from dugumler)
    group by h.hafta
  )
  select jsonb_build_object(
    'bugun', v_bugun,
    'birim', (
      select jsonb_build_object(
        'id', d.id, 'ad', d.ad, 'seviye', d.seviye,
        'yol', (
          select jsonb_agg(jsonb_build_object('id', k.id, 'ad', k.ad) order by u.sira)
          from unnest(d.yol) with ordinality as u (id, sira) join public.kurum k on k.id = u.id
        )
      )
      from dugumler d where d.id = p_kurum_id
    ),
    'sayilar', jsonb_build_object(
      'ogrenci', coalesce((select n from ogr where ata = p_kurum_id), 0),
      'sinif', coalesce((select n from snf where ata = p_kurum_id), 0),
      'ogretmen', coalesce((select n from ogt where ata = p_kurum_id), 0),
      'yonetici', (
        select count(*) from public.kullanici c
        where c.rol = 'kurum_admin' and c.aktif and c.kurum_id in (select id from dugumler)
      ),
      'alt_birim', (select count(*) from dugumler where id <> p_kurum_id),
      'veli_girisi_acik', (
        select count(*) from public.ogrenci o
        where o.aktif and o.kullanici_adi is not null and o.kurum_id in (select id from dugumler)
      ),
      'pasif_ogrenci', (
        select count(*) from public.ogrenci o
        where not o.aktif and o.kurum_id in (select id from dugumler)
      ),
      'yeni_kayit', (
        select count(*) from public.ogrenci o
        where o.kurum_id in (select id from dugumler)
          and (o.olusturma_tarihi at time zone 'Europe/Istanbul')::date between p_baslangic and p_bitis
      )
    ),
    'katilim', (
      select jsonb_build_object(
        'geldi', count(*) filter (where y.durum = 'geldi'),
        'gec', count(*) filter (where y.durum = 'gec'),
        'gelmedi', count(*) filter (where y.durum = 'gelmedi'),
        'mazeretli', count(*) filter (where y.durum = 'mazeretli')
      )
      from public.yoklama y
      where y.kurum_id in (select id from dugumler) and y.tarih between p_baslangic and p_bitis
    ),
    -- Aynı uzunluktaki bir önceki dönem (fark göstergesi için).
    'onceki_katilim', (
      select jsonb_build_object(
        'katildi', count(*) filter (where y.durum in ('geldi', 'gec')),
        'gelmedi', count(*) filter (where y.durum = 'gelmedi')
      )
      from public.yoklama y
      where y.kurum_id in (select id from dugumler)
        and y.tarih between p_baslangic - v_gun_sayisi and p_baslangic - 1
    ),
    'haftalik', (
      select jsonb_agg(jsonb_build_object('hafta', hafta, 'katildi', katildi, 'gelmedi', gelmedi) order by hafta)
      from haftalik
    ),
    'yoklama_duzeni', jsonb_build_object(
      'bugun_dersi_olan', (select count(*) from bugun_planli),
      'bugun_alinan', (
        select count(*) from bugun_planli b
        where exists (
          select 1 from public.yoklama y join public.ogrenci o on o.id = y.ogrenci_id
          where o.sinif_id = b.sinif_id and y.tarih = v_bugun
        )
      ),
      'planli', coalesce((select planli from duzen where ata = p_kurum_id), 0),
      'alinan', coalesce((select alinan from duzen where ata = p_kurum_id), 0)
    ),
    'egitim', jsonb_build_object(
      'toplam_konu', (
        select count(*)
        from public.sinif s
        join public.kademe_dersi kd on kd.kademe_id = s.kademe_id
        join public.ders_konusu dk on dk.ders_id = kd.id
        where s.kurum_id in (select id from dugumler)
      ),
      'islenen_konu', (
        select count(*) from public.sinif_konu_ilerleme i where i.kurum_id in (select id from dugumler)
      ),
      'ezber_tamam', (
        select count(*) from public.ogrenci_ezber e join public.ogrenci o on o.id = e.ogrenci_id
        where o.aktif and e.durum = 'tamam' and e.kurum_id in (select id from dugumler)
      ),
      'ezber_devam', (
        select count(*) from public.ogrenci_ezber e join public.ogrenci o on o.id = e.ogrenci_id
        where o.aktif and e.durum = 'devam' and e.kurum_id in (select id from dugumler)
      ),
      'kitap_biten', (
        select count(*) from public.kitap_okuma b
        where b.durum = 'bitti' and b.bitis_tarihi between p_baslangic and p_bitis
          and b.kurum_id in (select id from dugumler)
      ),
      'kitap_okunan', (
        select count(*) from public.kitap_okuma b
        where b.durum = 'okuyor' and b.kurum_id in (select id from dugumler)
      ),
      'gelisim_kaydi', (
        select count(*) from public.gelisim_kaydi g
        where g.tarih between p_baslangic and p_bitis and g.kurum_id in (select id from dugumler)
      )
    ),
    -- Seçilen düğümün altındaki tüm düğümler, her biri kendi alt ağacının toplamıyla.
    'birimler', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', d.id, 'ad', d.ad, 'seviye', d.seviye, 'ust_kurum_id', d.ust_kurum_id,
          'il_kodu', gizli.etkin_il(d.yol),
          'ogrenci', coalesce(o.n, 0),
          'sinif', coalesce(s.n, 0),
          'ogretmen', coalesce(t.n, 0),
          'alt_birim', coalesce(a.n, 0),
          'katildi', coalesce(y.katildi, 0),
          'gelmedi', coalesce(y.gelmedi, 0),
          'planli', coalesce(z.planli, 0),
          'alinan', coalesce(z.alinan, 0)
        )
        order by d.ad
      )
      from dugumler d
      left join ogr o on o.ata = d.id
      left join snf s on s.ata = d.id
      left join ogt t on t.ata = d.id
      left join alt a on a.ata = d.id
      left join yok y on y.ata = d.id
      left join duzen z on z.ata = d.id
      where d.id <> p_kurum_id
    ), '[]'::jsonb)
  ) into v_sonuc;

  return v_sonuc;
end;
$$;

