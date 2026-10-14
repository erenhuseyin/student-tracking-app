-- Genç Hareket'in temsilcilik bulunan illeri (genchareket.org.tr/temsilcilikler, 2026-10-14):
-- 27 il genel merkezin altına il (seviye 2) olarak, Gebze Kocaeli'nin altına ilçe olarak eklenir.
-- Pano haritası için plaka kodu (il_kodu) yazılır. Hoca, sınıf ve yönetici eklenmez.
--
-- Migration değildir (müşteriye özel veri). Yeniden çalıştırmak güvenlidir: genel merkezin altında
-- adında şehir adı geçen bir birim varsa (ör. "İstanbul" ya da "Genç Hareket İstanbul") yeni birim
-- açılmaz, yalnızca il kodu boşsa doldurulur. Ad öneki aşağıdaki v_onek'tedir; birimler yalnızca
-- şehir adıyla açılsın isteniyorsa '' yapın. Hedef müşteri marka koduyla seçilir.
do $$
declare
  v_onek text := 'Genç Hareket ';
  v_kok uuid;
  v_il uuid;
  v_eklenen int := 0;
  r record;
begin
  select id into v_kok from public.kurum where marka_kodu = 'varsayilan';
  if v_kok is null then raise exception 'varsayilan markalı müşteri bulunamadı'; end if;

  for r in
    select * from (values
      ('Adana', 1), ('Ağrı', 4), ('Aksaray', 68), ('Ankara', 6), ('Antalya', 7), ('Aydın', 9),
      ('Bartın', 74), ('Bolu', 14), ('Bursa', 16), ('Erzurum', 25), ('Hakkari', 30), ('Isparta', 32),
      ('İstanbul', 34), ('İzmir', 35), ('Karaman', 70), ('Kayseri', 38), ('Kırıkkale', 71), ('Kilis', 79),
      ('Kocaeli', 41), ('Konya', 42), ('Mardin', 47), ('Mersin', 33), ('Niğde', 51), ('Rize', 53),
      ('Sakarya', 54), ('Trabzon', 61), ('Van', 65)
    ) as t (sehir, plaka)
  loop
    select id into v_il from public.kurum
    where ust_kurum_id = v_kok and ad ilike '%' || r.sehir || '%'
    order by ad limit 1;
    if v_il is null then
      insert into public.kurum (ad, ust_kurum_id, il_kodu) values (v_onek || r.sehir, v_kok, r.plaka) returning id into v_il;
      v_eklenen := v_eklenen + 1;
    else
      update public.kurum set il_kodu = r.plaka where id = v_il and il_kodu is null;
    end if;

    if r.sehir = 'Kocaeli' and not exists (
      select 1 from public.kurum where ust_kurum_id = v_il and ad ilike '%Gebze%'
    ) then
      insert into public.kurum (ad, ust_kurum_id) values (v_onek || 'Gebze', v_il);
      v_eklenen := v_eklenen + 1;
    end if;
  end loop;

  raise notice '% birim eklendi', v_eklenen;
end $$;

select k.ad, k.seviye, k.il_kodu, (select ad from public.kurum u where u.id = k.ust_kurum_id) as ust
from public.kurum k
where k.kok_kurum_id = (select id from public.kurum where marka_kodu = 'varsayilan') and k.seviye <= 3
order by k.seviye, k.ad;
