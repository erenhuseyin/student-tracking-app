-- Hoca (personel) ve öğrenci için isteğe bağlı cinsiyet (müşteri isteği, 2026-10-14).
-- Kullanıcılar ve Öğrenciler tablolarında süzgeç, panoda kırılım için kullanılır.
--
-- Yazma yetkisi mevcut kolon bazlı desenle verilir; satırı RLS sınırlar: yönetici kapsamındaki
-- personeli ve öğrenciyi, herkes kendi kullanici satırını günceller.

create type public.cinsiyet as enum ('kadin', 'erkek');

alter table public.kullanici add column cinsiyet public.cinsiyet;
alter table public.ogrenci add column cinsiyet public.cinsiyet;

grant update (cinsiyet) on public.kullanici to authenticated;
grant insert (cinsiyet), update (cinsiyet) on public.ogrenci to authenticated;

-- Takvim: etkinlikler tarih aralığıyla okunur.
create index duyuru_etkinlik_zamani_idx on public.duyuru (kok_kurum_id, etkinlik_zamani)
  where tur = 'etkinlik';

-- ---------------------------------------------------------------------------
-- pano_cinsiyet: seçilen düğüm ve altındaki aktif öğrenci ve öğretmenlerin cinsiyete göre sayısı.
--   Yetki pano_ozeti ile aynıdır (gizli.pano_yetki): yönetici müşterisinin herhangi bir düğümü,
--   öğretmen yalnızca kendi kurumu. Yalnızca sayı döndürür.
-- ---------------------------------------------------------------------------
create function public.pano_cinsiyet(p_kurum_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_sonuc jsonb;
begin
  perform gizli.pano_yetki(p_kurum_id);

  with dugumler as (
    select k.id from public.kurum k where k.yol @> array[p_kurum_id]
  )
  select jsonb_build_object(
    'ogrenci', (
      select jsonb_build_object(
        'kadin', count(*) filter (where o.cinsiyet = 'kadin'),
        'erkek', count(*) filter (where o.cinsiyet = 'erkek'),
        'belirtilmemis', count(*) filter (where o.cinsiyet is null)
      )
      from public.ogrenci o
      where o.aktif and o.kurum_id in (select id from dugumler)
    ),
    'ogretmen', (
      select jsonb_build_object(
        'kadin', count(*) filter (where c.cinsiyet = 'kadin'),
        'erkek', count(*) filter (where c.cinsiyet = 'erkek'),
        'belirtilmemis', count(*) filter (where c.cinsiyet is null)
      )
      from public.kullanici c
      where c.rol = 'ogretmen' and c.aktif and c.kurum_id in (select id from dugumler)
    )
  ) into v_sonuc;

  return v_sonuc;
end;
$$;

revoke all on function public.pano_cinsiyet(uuid) from public, anon;
grant execute on function public.pano_cinsiyet(uuid) to authenticated;
