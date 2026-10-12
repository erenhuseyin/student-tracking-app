-- Genç Hareket'in ezber listesi (GH KÂŞİF'ten): 11 dua ve temel ezber + 41 sure ve âyet = 52 madde.
-- Müşterinin ORTAK listesine eklenir (kademe_id boş): tüm kademeler ve kademesiz sınıflar kullanır.
--
-- Migration değildir (müşteriye özel veri): 20261020120000_ortak_ezber_listesi.sql uygulandıktan
-- sonra SQL Editor'de bir kez çalıştırılır. Yeniden çalıştırmak güvenlidir (aynı adlı madde
-- atlanır). Hedef müşteri aşağıdaki marka koduyla seçilir; başka müşteri için kodu değiştirin.
with kok as (
  select id from public.kurum where marka_kodu = 'varsayilan'
),
liste (sira, grup, ad) as (
  values
    (1, 'Dualar', 'Eûzü-Besmele'),
    (2, 'Dualar', 'Kelime-i Tevhid'),
    (3, 'Dualar', 'Kelime-i Şehâdet'),
    (4, 'Dualar', 'Sübhâneke Duası'),
    (5, 'Dualar', 'Rabbenâ Âtinâ Duası'),
    (6, 'Dualar', 'Rabbenağfirlî Duası'),
    (7, 'Dualar', 'Ettehiyyâtü Duası'),
    (8, 'Dualar', 'Salli Duası'),
    (9, 'Dualar', 'Bârik Duası'),
    (10, 'Dualar', 'Kunut Duası 1'),
    (11, 'Dualar', 'Kunut Duası 2'),
    (12, 'Sureler', 'İhlâs Sûresi'),
    (13, 'Sureler', 'Kevser Sûresi'),
    (14, 'Sureler', 'Asr Sûresi'),
    (15, 'Sureler', 'Nasr Sûresi'),
    (16, 'Sureler', 'Kureyş Sûresi'),
    (17, 'Sureler', 'Fîl Sûresi'),
    (18, 'Sureler', 'Âyetü''l-Kürsî'),
    (19, 'Sureler', 'Âmenerresûlü'),
    (20, 'Sureler', 'Felak Sûresi'),
    (21, 'Sureler', 'Nâs Sûresi'),
    (22, 'Sureler', 'Kâfirûn Sûresi'),
    (23, 'Sureler', 'Mâûn Sûresi'),
    (24, 'Sureler', 'Tebbet Sûresi'),
    (25, 'Sureler', 'Fâtiha Sûresi'),
    (26, 'Sureler', 'Hümeze Sûresi'),
    (27, 'Sureler', 'Tekâsür Sûresi'),
    (28, 'Sureler', 'Kadr Sûresi'),
    (29, 'Sureler', 'Kâria Sûresi'),
    (30, 'Sureler', 'Zilzâl Sûresi'),
    (31, 'Sureler', 'Tîn Sûresi'),
    (32, 'Sureler', 'İnşirah Sûresi'),
    (33, 'Sureler', 'Âdiyât Sûresi'),
    (34, 'Sureler', 'Beyyine Sûresi'),
    (35, 'Sureler', 'Alak Sûresi'),
    (36, 'Sureler', 'Duhâ Sûresi'),
    (37, 'Sureler', 'Şems Sûresi'),
    (38, 'Sureler', 'Leyl Sûresi'),
    (39, 'Sureler', 'A''lâ Sûresi'),
    (40, 'Sureler', 'Târık Sûresi'),
    (41, 'Sureler', 'Beled Sûresi'),
    (42, 'Sureler', 'Gâşiye Sûresi'),
    (43, 'Sureler', 'Bürûc Sûresi'),
    (44, 'Sureler', 'Fecr Sûresi'),
    (45, 'Sureler', 'İnfitâr Sûresi'),
    (46, 'Sureler', 'Tekvîr Sûresi'),
    (47, 'Sureler', 'İnşikâk Sûresi'),
    (48, 'Sureler', 'Mutaffifîn Sûresi'),
    (49, 'Sureler', 'Abese Sûresi'),
    (50, 'Sureler', 'Nâziât Sûresi'),
    (51, 'Sureler', 'Nebe Sûresi'),
    (52, 'Sureler', 'Haşr Sûresi''nin Son Üç Âyeti')
)
insert into public.ezber_maddesi (kurum_id, kademe_id, ad, sira, grup)
select kok.id, null, l.ad, l.sira, l.grup
from kok cross join liste l
where not exists (
  select 1 from public.ezber_maddesi e
  where e.kurum_id = kok.id and e.kademe_id is null and e.ad = l.ad
);
