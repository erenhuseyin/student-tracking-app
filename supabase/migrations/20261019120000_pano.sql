-- Pano (dashboard): birim seçimli özet sayılar, katılım, karşılaştırma ve il haritası.
--
-- Satır düzeyindeki RLS değişmez: yönetici yalnızca kendi düğümünün ve altının satırlarını okur.
-- Pano ise TOPLAMLARI müşterinin tamamı için gösterir (kullanıcı kararı, 2026-10-12): her yönetici
-- tüm kurumun ve seçtiği herhangi bir birimin özetini görür; öğretmen yalnızca kendi biriminin.
-- Bu yüzden toplamlar, yetkiyi kendi içinde denetleyen SECURITY DEFINER fonksiyonlardan gelir.
-- Fonksiyonlar yalnızca sayı ve BİRİM adı döndürür; öğrenci, veli ya da sınıf adı döndürmez —
-- yeni alan eklerken bu sınır korunmalıdır.

-- Birimin bulunduğu il (plaka kodu). İsteğe bağlı; harita ve il sıralaması için.
alter table public.kurum
  add column il_kodu smallint,
  add constraint kurum_il_kodu_araligi check (il_kodu between 1 and 81);

-- Yönetici kendi düğümünün ve altındakilerin ilini değiştirir (kurum_admin_guncelle politikası).
grant update (il_kodu) on public.kurum to authenticated;

create index yoklama_kurum_tarih_idx on public.yoklama (kurum_id, tarih);

-- Düğümün etkin ili: kendi ili, yoksa en yakın üstünün ili.
create function gizli.etkin_il(p_yol uuid[])
returns smallint
language sql
stable
security definer
set search_path = ''
as $$
  select k.il_kodu
  from unnest(p_yol) with ordinality as u (id, sira)
  join public.kurum k on k.id = u.id
  where k.il_kodu is not null
  order by u.sira desc
  limit 1
$$;

revoke all on function gizli.etkin_il(uuid[]) from public, anon;

-- Çağıranı doğrular ve müşterisinin kök kurumunu döndürür. p_kurum_id verilirse o düğümün
-- çağıranın müşterisine ait olduğunu ve — öğretmen için — kendi kurumu olduğunu da doğrular.
create function gizli.pano_yetki(p_kurum_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_rol public.rol;
  v_kurum uuid;
  v_kok uuid;
begin
  select c.rol, c.kurum_id, k.kok_kurum_id
    into v_rol, v_kurum, v_kok
  from public.kullanici c
  join public.kurum k on k.id = c.kurum_id
  where c.auth_id = (select auth.uid()) and c.aktif;

  if not found or v_rol not in ('kurum_admin', 'ogretmen') then
    raise exception 'Bu bilgiyi görme yetkiniz yok' using errcode = 'insufficient_privilege';
  end if;
  if p_kurum_id is null then
    if v_rol <> 'kurum_admin' then
      raise exception 'Bu bilgiyi görme yetkiniz yok' using errcode = 'insufficient_privilege';
    end if;
    return v_kok;
  end if;
  if v_rol = 'ogretmen' and p_kurum_id <> v_kurum then
    raise exception 'Bu bilgiyi görme yetkiniz yok' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.kurum k where k.id = p_kurum_id and k.kok_kurum_id = v_kok) then
    raise exception 'Bu bilgiyi görme yetkiniz yok' using errcode = 'insufficient_privilege';
  end if;
  return v_kok;
end;
$$;

revoke all on function gizli.pano_yetki(uuid) from public, anon;

-- ---------------------------------------------------------------------------
-- pano_ozeti: seçilen düğüm ve altındaki tüm düğümler için toplamlar.
--   Erişim: kurum_admin (müşterisinin herhangi bir düğümü), ogretmen (yalnızca kendi kurumu).
--   Katılım oranı istemcide hesaplanır: katildi / (katildi + gelmedi); mazeretli paydaya girmez
--   (bkz. lib/katilim.ts). Her düğümün sayıları kendi alt ağacını kapsar (kurum.yol ile).
-- ---------------------------------------------------------------------------
create function public.pano_ozeti(p_kurum_id uuid, p_baslangic date, p_bitis date)
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
        where o.aktif and o.tckn is not null and o.kurum_id in (select id from dugumler)
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

-- ---------------------------------------------------------------------------
-- pano_iller: müşterinin tamamı için il başına toplamlar (harita). Yalnızca kurum_admin.
--   Bir düğümün verisi etkin iline (kendi ili, yoksa en yakın üstünün ili) sayılır; ili hiç
--   belirlenmemiş dallar haritada yer almaz. `dugumler`: ili doğrudan atanmış birimler (haritada
--   ile tıklanınca seçilecek birim).
-- ---------------------------------------------------------------------------
create function public.pano_iller(p_baslangic date, p_bitis date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_kok uuid;
  v_sonuc jsonb;
begin
  v_kok := gizli.pano_yetki(null);
  if p_baslangic is null or p_bitis is null or p_bitis < p_baslangic or p_bitis - p_baslangic > 370 then
    raise exception 'Geçersiz tarih aralığı' using errcode = 'invalid_parameter_value';
  end if;

  with dugumler as (
    select k.id, k.ad, k.il_kodu, k.ust_kurum_id, gizli.etkin_il(k.yol) as etkin_il
    from public.kurum k
    where k.kok_kurum_id = v_kok
  ),
  illi as (select * from dugumler where etkin_il is not null),
  ogr as (
    select d.etkin_il, count(*) as n
    from public.ogrenci o join illi d on d.id = o.kurum_id
    where o.aktif
    group by d.etkin_il
  ),
  snf as (
    select d.etkin_il, count(*) as n
    from public.sinif s join illi d on d.id = s.kurum_id
    group by d.etkin_il
  ),
  yok as (
    select d.etkin_il,
      count(*) filter (where y.durum in ('geldi', 'gec')) as katildi,
      count(*) filter (where y.durum = 'gelmedi') as gelmedi
    from public.yoklama y join illi d on d.id = y.kurum_id
    where y.tarih between p_baslangic and p_bitis
    group by d.etkin_il
  ),
  -- İl birimi: ili doğrudan atanmış düğüm. Alt birim: o düğümlerin doğrudan altındakiler
  -- ("ilçe temsilciliği").
  il_birimi as (
    select d.il_kodu as il, jsonb_agg(jsonb_build_object('id', d.id, 'ad', d.ad) order by d.ad) as dugumler
    from dugumler d
    where d.il_kodu is not null
    group by d.il_kodu
  ),
  alt as (
    select u.il_kodu as il, count(*) as n
    from dugumler c join dugumler u on u.id = c.ust_kurum_id
    where u.il_kodu is not null
    group by u.il_kodu
  ),
  iller as (select distinct etkin_il as il from illi)
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'il_kodu', i.il,
      'dugumler', coalesce(b.dugumler, '[]'::jsonb),
      'ogrenci', coalesce(o.n, 0),
      'sinif', coalesce(s.n, 0),
      'alt_birim', coalesce(a.n, 0),
      'katildi', coalesce(y.katildi, 0),
      'gelmedi', coalesce(y.gelmedi, 0)
    )
    order by i.il
  ), '[]'::jsonb)
  into v_sonuc
  from iller i
  left join il_birimi b on b.il = i.il
  left join ogr o on o.etkin_il = i.il
  left join snf s on s.etkin_il = i.il
  left join alt a on a.il = i.il
  left join yok y on y.etkin_il = i.il;

  return v_sonuc;
end;
$$;

revoke all on function public.pano_ozeti(uuid, date, date), public.pano_iller(date, date) from public, anon;
grant execute on function public.pano_ozeti(uuid, date, date), public.pano_iller(date, date) to authenticated;
