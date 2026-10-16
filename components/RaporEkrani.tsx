// Bir raporun sorgulama ekranı (Menü > Raporlar): ada, birime, sınıfa, (varsa) duruma ve döneme göre
// süzülen satırlar; web'de tablo, telefonda kart. Veri bir kez çekilir (lib/raporlar.ts; dönem
// değişince yeniden), süzme, sıralama ve sayfalama istemcidedir. Web'de "Rapor İndir" süzülmüş
// satırların tamamını CSV olarak indirir.
//
// Erişim: yalnızca kurum_admin (rota: app/(kurum_admin)/rapor/[tur].tsx).
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { Girdi } from '@/components/Girdi';
import { ListeSatiri } from '@/components/ListeSatiri';
import { Secim } from '@/components/Secim';
import type { TabloSiralamasi, TabloSutunu } from '@/components/Tablo';
import { VeriEkrani } from '@/components/VeriEkrani';
import { listeyiIndir } from '@/lib/disaAktar';
import { birimSecenekleri } from '@/lib/kurumlar';
import { useOturum } from '@/lib/oturum';
import { RAPOR_DONEMLERI, type RaporDonemi, type RaporSatiri, type RaporTanimi, type RaporVerisi, raporVerisiGetir } from '@/lib/raporlar';

const SAYFA_BOYUTU = 30;

// Hücreleri karşılaştırır: sayılar sayı olarak, metinler Türkçe ve içindeki sayılara göre ("%9" < "%85").
function karsilastir(a: RaporSatiri['hucreler'][number], b: RaporSatiri['hucreler'][number]): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a ?? '').localeCompare(String(b ?? ''), 'tr', { numeric: true });
}

export function RaporEkrani({ tanim }: { tanim: RaporTanimi }) {
  const { kurum } = useOturum();
  const [donem, setDonem] = useState<RaporDonemi>('30');
  const [veri, setVeri] = useState<RaporVerisi | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [arama, setArama] = useState('');
  const [birimId, setBirimId] = useState<string | null>(null);
  const [sinifId, setSinifId] = useState<string | null>(null);
  const [durum, setDurum] = useState<string | null>(null);
  const [siralama, setSiralama] = useState<TabloSiralamasi | null>(null);
  const [sayfa, setSayfa] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let iptalEdildi = false;
      setHata(null);
      setVeri(null);
      raporVerisiGetir(tanim.tur, donem)
        .then((v) => {
          if (!iptalEdildi) setVeri(v);
        })
        .catch((e: Error) => {
          if (!iptalEdildi) setHata(e.message);
        });
      return () => {
        iptalEdildi = true;
      };
    }, [tanim.tur, donem]),
  );

  const kurumlar = useMemo(() => veri?.kurumlar ?? [], [veri]);
  const birimler = kurum ? birimSecenekleri(kurumlar, kurum.id) : [];
  const birimde = useCallback(
    (kurumId: string) => !birimId || (kurumlar.find((k) => k.id === kurumId)?.yol.includes(birimId) ?? false),
    [birimId, kurumlar],
  );
  // Sınıf adı birimler arasında tekrar edebilir ("Kâşif 1"); seçimde birim adıyla gösterilir.
  const siniflar = (veri?.siniflar ?? [])
    .filter((s) => birimde(s.kurum_id))
    .map((s) => ({ deger: s.id, etiket: `${s.ad} — ${birimler.find((b) => b.deger === s.kurum_id)?.etiket ?? ''}` }));

  const suzulmus = useMemo(() => {
    if (!veri) return null;
    const aranan = arama.trim().toLocaleLowerCase('tr');
    const satirlar = veri.satirlar.filter(
      (s) =>
        birimde(s.kurumId) &&
        (!sinifId || s.sinifId === sinifId) &&
        (!durum || s.durum === durum) &&
        (!aranan || s.adSoyad.toLocaleLowerCase('tr').includes(aranan)),
    );
    if (!siralama) return satirlar;
    const i = Number(siralama.anahtar);
    const yon = siralama.yon === 'artan' ? 1 : -1;
    return [...satirlar].sort((a, b) => karsilastir(a.hucreler[i], b.hucreler[i]) * yon);
  }, [veri, arama, birimde, sinifId, durum, siralama]);

  // Süzgeç değişince ilk sayfaya dönülür; liste kısalınca son sayfa aşılmaz.
  const sayfaSayisi = Math.max(1, Math.ceil((suzulmus?.length ?? 0) / SAYFA_BOYUTU));
  const gecerliSayfa = Math.min(sayfa, sayfaSayisi - 1);
  const sayfadakiler = suzulmus?.slice(gecerliSayfa * SAYFA_BOYUTU, (gecerliSayfa + 1) * SAYFA_BOYUTU) ?? null;
  const suz =
    <T,>(ayarla: (deger: T) => void) =>
    (deger: T) => {
      ayarla(deger);
      setSayfa(0);
    };

  const sutunlar = useMemo<TabloSutunu<RaporSatiri>[]>(
    () =>
      tanim.basliklar.map((baslik, i) => {
        const sayi = tanim.sayilar.includes(i);
        return {
          anahtar: String(i),
          baslik,
          icerik: (s: RaporSatiri) => {
            const h = s.hucreler[i];
            return h === null || h === undefined || h === '' ? '—' : h;
          },
          genislik: sayi ? 110 : undefined,
          hizalama: sayi ? ('sag' as const) : undefined,
          siralanabilir: true,
          // Dar tabloda (yan panel yok ama ekran dar) önce birim gizlenir.
          ikincil: i === 1,
        };
      }),
    [tanim],
  );

  // Dar pencerede (ör. 800 px) sabit genişlikli sayı sütunları ad sütunlarını ezmesin: tablo bundan
  // darsa yatay kayar.
  const tabloEnAzGenislik = tanim.sayilar.length * 110 + (tanim.basliklar.length - tanim.sayilar.length) * 170;

  const sinifAdi = (s: RaporSatiri) => veri?.siniflar.find((x) => x.id === s.sinifId)?.ad;

  return (
    <VeriEkrani
      arama={<Girdi etiket="Ada göre ara" value={arama} onChangeText={suz(setArama)} autoCorrect={false} returnKeyType="search" />}
      filtreler={[
        tanim.donemli ? (
          <Secim key="donem" etiket="Dönem" secenekler={RAPOR_DONEMLERI} secili={donem} onSec={(d) => d && setDonem(d)} />
        ) : null,
        birimler.length > 1 ? (
          <Secim
            key="birim"
            etiket="Birim"
            secenekler={birimler}
            secili={birimId}
            onSec={(b) => {
              setBirimId(b);
              setSinifId(null);
              setSayfa(0);
            }}
            bosEtiket="Tümü"
          />
        ) : null,
        <Secim key="sinif" etiket="Sınıf" secenekler={siniflar} secili={sinifId} onSec={suz(setSinifId)} bosEtiket="Tümü" />,
        tanim.durumlar ? (
          <Secim key="durum" etiket="Durum" secenekler={tanim.durumlar} secili={durum} onSec={suz(setDurum)} bosEtiket="Tümü" />
        ) : null,
      ]}
      etkinFiltreSayisi={[birimId, sinifId, durum].filter(Boolean).length}
      onIndir={async () =>
        listeyiIndir(
          tanim.menuAnahtari,
          tanim.basliklar,
          (suzulmus ?? []).map((s) => s.hucreler),
        )
      }
      ozet={suzulmus ? `${suzulmus.length} kayıt` : undefined}
      veri={sayfadakiler}
      hata={hata}
      anahtar={(s) => s.anahtar}
      sutunlar={sutunlar}
      tabloEnAzGenislik={tabloEnAzGenislik}
      kart={(s) => <ListeSatiri baslik={s.adSoyad} altBaslik={[sinifAdi(s), s.ozet].filter(Boolean).join(' · ')} />}
      bosIkon="document-text-outline"
      bosBaslik={tanim.bosBaslik}
      bosAciklama="Süzgeçleri ya da dönemi değiştirin."
      siralama={siralama}
      onSirala={(anahtar) => {
        setSiralama((s) => ({ anahtar, yon: s?.anahtar === anahtar && s.yon === 'artan' ? 'azalan' : 'artan' }));
        setSayfa(0);
      }}
      sayfalama={{ sayfa: gecerliSayfa, sayfaBoyutu: SAYFA_BOYUTU, toplam: suzulmus?.length ?? 0, onDegis: setSayfa }}
      panel={null}
    />
  );
}
