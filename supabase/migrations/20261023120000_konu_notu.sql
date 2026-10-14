-- Konu notu, yönetici yanıtı ve ders raporu (GH KÂŞİF'ten eksikler, 2026-10-14).
--
--   sinif_konu_notu : sınıfın bir konusuna hocanın (ya da yöneticinin) notu; kapsamdaki herhangi
--                     bir yönetici okuyunca "görüldü" olur (tek işaret, kimin gördüğü yazılır) ve
--                     nota tek bir yanıt yazabilir (yeniden yazılırsa üstüne yazılır).
--   ders_raporu()   : yöneticinin kapsamındaki sınıfların konu ilerlemesi (sunucuda toplanır).
--
-- Not ayrı tablodadır: sinif_konu_ilerleme'yi veli okur, not veliye kapalıdır. Not konunun işlenmiş
-- olmasına bağlı değildir (henüz işlenmemiş konuya da yazılabilir; işareti kaldırmak notu silmez).
-- Yetki: sınıfın öğretmeni ve yönettiği kurumlarda kurum admini; yanıtı ve görüldü işaretini
-- yalnızca yönetici yazar (trigger — politikada eski değer karşılaştırılamaz).

alter type public.bildirim_tipi add value if not exists 'konu_notu';

-- Konu notu bildirimine dokununca sınıfın ders takibi açılır (satırı yalnızca service role yazar).
alter table public.bildirim_log
  add column sinif_id uuid references public.sinif (id) on delete cascade;

create table public.sinif_konu_notu (
  kurum_id uuid not null references public.kurum (id),
  sinif_id uuid not null,
  konu_id uuid not null references public.ders_konusu (id) on delete cascade,
  not_metni text not null,
  yazan_kullanici_id uuid references public.kullanici (id) on delete set null,
  yazilma_zamani timestamptz not null default now(),
  goruldu_zamani timestamptz,
  goren_kullanici_id uuid references public.kullanici (id) on delete set null,
  yanit_metni text,
  yanit_veren_kullanici_id uuid references public.kullanici (id) on delete set null,
  yanit_zamani timestamptz,
  primary key (sinif_id, konu_id),
  constraint sinif_konu_notu_metin_uzunluk check (char_length(btrim(not_metni)) between 1 and 1000),
  constraint sinif_konu_notu_yanit_uzunluk check (yanit_metni is null or char_length(btrim(yanit_metni)) between 1 and 1000),
  constraint sinif_konu_notu_sinif_ayni_kurum_fkey
    foreign key (sinif_id, kurum_id) references public.sinif (id, kurum_id) on delete cascade
);

create index sinif_konu_notu_kurum_idx on public.sinif_konu_notu (kurum_id, goruldu_zamani);

-- Yazan/gören/yanıtlayan ve zamanlar sunucuda dolar; istemcinin yazdığı değer ezilir.
create function gizli.sinif_konu_notu_hazirla()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ben uuid := gizli.mevcut_kullanici_id();
  v_rol public.rol := gizli.mevcut_rol();
  -- Rolü olmayan bağlam (migration, tohum, service role) kısıtlanmaz; satırı zaten RLS sınırlar.
  v_yonetici boolean := v_rol is null or v_rol in ('kurum_admin', 'super_admin');
begin
  if tg_op = 'INSERT' then
    new.yazan_kullanici_id := v_ben;
    new.yazilma_zamani := now();
    new.yanit_metni := null;
    new.yanit_veren_kullanici_id := null;
    new.yanit_zamani := null;
    -- Yöneticinin kendi notu görülmüş başlar.
    if v_yonetici then
      new.goruldu_zamani := now();
      new.goren_kullanici_id := v_ben;
    else
      new.goruldu_zamani := null;
      new.goren_kullanici_id := null;
    end if;
    return new;
  end if;

  if not v_yonetici
     and (new.yanit_metni is distinct from old.yanit_metni or new.goruldu_zamani is distinct from old.goruldu_zamani) then
    raise exception 'Yanıtı ve görüldü işaretini yalnızca yönetici yazar'
      using errcode = 'insufficient_privilege';
  end if;

  new.yazan_kullanici_id := old.yazan_kullanici_id;
  new.yazilma_zamani := old.yazilma_zamani;
  new.goren_kullanici_id := old.goren_kullanici_id;
  new.yanit_veren_kullanici_id := old.yanit_veren_kullanici_id;
  new.yanit_zamani := old.yanit_zamani;

  -- Görüldü: yönetici işaretler (zaman sunucudan) ya da kaldırır.
  if new.goruldu_zamani is distinct from old.goruldu_zamani then
    if new.goruldu_zamani is null then
      new.goren_kullanici_id := null;
    else
      new.goruldu_zamani := now();
      new.goren_kullanici_id := v_ben;
    end if;
  end if;

  -- Yanıt: yazılınca not görülmüş sayılır; boşaltılırsa yanıt bilgisi silinir.
  if new.yanit_metni is distinct from old.yanit_metni then
    if new.yanit_metni is null then
      new.yanit_veren_kullanici_id := null;
      new.yanit_zamani := null;
    else
      new.yanit_veren_kullanici_id := v_ben;
      new.yanit_zamani := now();
      if new.goruldu_zamani is null then
        new.goruldu_zamani := now();
        new.goren_kullanici_id := v_ben;
      end if;
    end if;
  end if;

  -- Not değişince yeniden yazılmış sayılır; hoca değiştirdiyse yöneticiye yeniden okunmamış görünür.
  if new.not_metni is distinct from old.not_metni then
    new.yazan_kullanici_id := v_ben;
    new.yazilma_zamani := now();
    if v_yonetici then
      new.goruldu_zamani := now();
      new.goren_kullanici_id := v_ben;
    else
      new.goruldu_zamani := null;
      new.goren_kullanici_id := null;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function gizli.sinif_konu_notu_hazirla() from public, anon;

create trigger sinif_konu_notu_hazirla
  before insert or update on public.sinif_konu_notu
  for each row execute function gizli.sinif_konu_notu_hazirla();

alter table public.sinif_konu_notu enable row level security;
revoke all on public.sinif_konu_notu from anon;
revoke insert, update on public.sinif_konu_notu from authenticated;
grant insert (kurum_id, sinif_id, konu_id, not_metni) on public.sinif_konu_notu to authenticated;
grant update (not_metni, goruldu_zamani, yanit_metni) on public.sinif_konu_notu to authenticated;

create policy sinif_konu_notu_super_admin on public.sinif_konu_notu
  for all to authenticated
  using ((select gizli.mevcut_rol()) = 'super_admin')
  with check ((select gizli.mevcut_rol()) = 'super_admin');

create policy sinif_konu_notu_kurum_admin on public.sinif_konu_notu
  for all to authenticated
  using (kurum_id in (select gizli.yonetilen_kurum_idleri()))
  with check (kurum_id in (select gizli.yonetilen_kurum_idleri()));

create policy sinif_konu_notu_ogretmen on public.sinif_konu_notu
  for all to authenticated
  using (gizli.ogretmen_sinifi_mi(sinif_id))
  with check (gizli.ogretmen_sinifi_mi(sinif_id));

-- ---------------------------------------------------------------------------
-- İşlenme tarihi ileri bir gün olamaz (ürün Türkiye saatiyle çalışır; sunucu UTC'dedir).
-- ---------------------------------------------------------------------------
create function gizli.konu_tarihi_dogrula()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.tamamlanma_tarihi > (now() at time zone 'Europe/Istanbul')::date then
    raise exception 'İşlenme tarihi ileri bir gün olamaz'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke all on function gizli.konu_tarihi_dogrula() from public, anon;

create trigger sinif_konu_ilerleme_tarih
  before insert or update of tamamlanma_tarihi on public.sinif_konu_ilerleme
  for each row execute function gizli.konu_tarihi_dogrula();

-- ---------------------------------------------------------------------------
-- Ders raporu: yöneticinin kapsamındaki her sınıfın konu ilerlemesi. security invoker: hangi
-- sınıfların döneceğini çağıranın RLS'i belirler (sınıf, öğrenci, hoca adları satır düzeyinde
-- zaten yöneticiye açıktır). Öğretmen ve veli boş liste alır.
-- ---------------------------------------------------------------------------
create function public.ders_raporu()
returns table (
  sinif_id uuid,
  sinif_adi text,
  kurum_id uuid,
  kademe_id uuid,
  kademe_adi text,
  hocalar text,
  ogrenci_sayisi integer,
  toplam_konu integer,
  islenen_konu integer,
  son_islenme date,
  okunmamis_not integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    s.id,
    s.ad,
    s.kurum_id,
    s.kademe_id,
    k.ad,
    (select string_agg(u.ad_soyad, ', ' order by u.ad_soyad)
       from public.ogretmen_sinif os join public.kullanici u on u.id = os.ogretmen_id
      where os.sinif_id = s.id),
    (select count(*)::integer from public.ogrenci o where o.sinif_id = s.id and o.aktif),
    coalesce(kn.toplam, 0),
    coalesce(il.islenen, 0),
    il.son,
    (select count(*)::integer from public.sinif_konu_notu n where n.sinif_id = s.id and n.goruldu_zamani is null)
  from public.sinif s
  left join public.kademe k on k.id = s.kademe_id
  left join lateral (
    select count(*)::integer as toplam
    from public.kademe_dersi d join public.ders_konusu c on c.ders_id = d.id
    where d.kademe_id = s.kademe_id
  ) kn on true
  left join lateral (
    select count(*)::integer as islenen, max(i.tamamlanma_tarihi) as son
    from public.sinif_konu_ilerleme i
    join public.ders_konusu c on c.id = i.konu_id
    join public.kademe_dersi d on d.id = c.ders_id
    where i.sinif_id = s.id and d.kademe_id = s.kademe_id
  ) il on true
  where gizli.mevcut_rol() in ('kurum_admin', 'super_admin')
  order by s.ad
$$;

revoke all on function public.ders_raporu() from public, anon;
grant execute on function public.ders_raporu() to authenticated;
