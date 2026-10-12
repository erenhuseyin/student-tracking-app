-- Ortak ezber listesi ve ezber grupları.
--
-- Ezber maddeleri şimdiye kadar yalnızca bir kademeye bağlıydı. Müşterinin tüm kademelerinde aynı
-- liste kullanılabildiği için (ör. dualar ve sureler) kademe bağı isteğe bağlı oldu:
--   kademe_id boş  : müşterinin ORTAK listesi — tüm kademeler ve kademesi olmayan sınıflar görür
--   kademe_id dolu : yalnızca o kademeye özel ek madde (eski davranış)
-- Öğrencinin ezber kaydı maddeye bağlı olduğu için, ortak listedeki ilerleme öğrenci başka
-- kademedeki bir sınıfa geçince de korunur.
--
-- `grup` listeyi başlıklara ayırır ("Dualar", "Sureler"); serbest metindir, boş olabilir.
--
-- Yetki değişmedi: müşterinin herkesi okur, yalnızca kök kurumun admini yazar
-- (ezber_maddesi_musteri_oku / ezber_maddesi_kok_admin). Kademeli maddede kök kurumu bileşik FK
-- garanti ediyordu; ortak maddede FK devreye girmediği için aynı kuralı trigger uygular.

alter table public.ezber_maddesi alter column kademe_id drop not null;

alter table public.ezber_maddesi add column grup text;
alter table public.ezber_maddesi
  add constraint ezber_maddesi_grup_uzunluk check (grup is null or char_length(btrim(grup)) between 1 and 60);

create index ezber_maddesi_ortak_idx on public.ezber_maddesi (kurum_id, sira) where kademe_id is null;

create function gizli.ezber_maddesi_kok_dogrula()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kademe_id is null
     and exists (select 1 from public.kurum k where k.id = new.kurum_id and k.ust_kurum_id is not null) then
    raise exception 'Ortak ezber listesi yalnızca ana kurumda tanımlanır'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke all on function gizli.ezber_maddesi_kok_dogrula() from public, anon;

create trigger ezber_maddesi_kok
  before insert or update of kurum_id, kademe_id on public.ezber_maddesi
  for each row execute function gizli.ezber_maddesi_kok_dogrula();

-- kurum_id ve kademe_id sonradan değiştirilemez (önceki kolon yetkisi korunur); grup yazılabilir.
grant insert (grup) on public.ezber_maddesi to authenticated;
grant update (grup) on public.ezber_maddesi to authenticated;
