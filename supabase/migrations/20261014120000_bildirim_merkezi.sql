-- Bildirim merkezi: gönderilen bildirimler uygulamada da listelenir (bildirimi kaçıran kişi
-- sonradan görebilsin) ve okundu olarak işaretlenir.
--
-- bildirim_log zaten her alıcı için bir satır tutuyordu ama içeriği yoktu. Eklenenler:
--   baslik, metin : bildirimde gösterilen metin (push ile aynı; içerik/not asla yazılmaz)
--   ogrenci_id    : yoklama / gelişim bildiriminin ilgili öğrencisi (dokununca o ekrana gidilir)
--   duyuru_id     : duyuru bildiriminin duyurusu
-- Satırları yine yalnızca service-role Edge Function'lar ekler. İstemci yalnızca KENDİ satırının
-- okundu_mu kolonunu güncelleyebilir.
alter table public.bildirim_log
  add column baslik text,
  add column metin text,
  -- İlgili kayıt silinince bildirimi de silinir (ölü bağlantı kalmasın).
  add column ogrenci_id uuid references public.ogrenci (id) on delete cascade,
  add column duyuru_id uuid references public.duyuru (id) on delete cascade;

create index bildirim_log_alici_tarih_idx on public.bildirim_log (alici_kullanici_id, gonderim_tarihi desc);

grant update (okundu_mu) on public.bildirim_log to authenticated;

-- Okuma politikası (bildirim_log_veli_oku) adına rağmen her rol için "alıcı kendi satırını okur"
-- demektir; güncelleme de aynı koşulla verilir.
create policy bildirim_log_alici_guncelle on public.bildirim_log
  for update to authenticated
  using (alici_kullanici_id = (select gizli.mevcut_kullanici_id()))
  with check (alici_kullanici_id = (select gizli.mevcut_kullanici_id()));
