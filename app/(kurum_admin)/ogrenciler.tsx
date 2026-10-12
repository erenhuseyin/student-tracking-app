// Erişim: yalnızca kurum_admin (yönettiği kurumların öğrencileri; RLS). Tüm öğrenciler tek tabloda:
// ada, birime, sınıfa ve aktif/pasif durumuna göre süzülür. Sonuçlar sunucuda süzülür, sıralanır
// ve sayfalanır. Seçilen öğrenci yan panelde düzenlenir; "Yeni öğrenci" sınıf seçerek ekler.
import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Avatar } from '@/components/Avatar';
import { Girdi } from '@/components/Girdi';
import { ListeSatiri } from '@/components/ListeSatiri';
import { OgrenciFormu } from '@/components/OgrenciFormu';
import { Rozet } from '@/components/Rozet';
import { Secim } from '@/components/Secim';
import type { TabloSutunu } from '@/components/Tablo';
import { VeriEkrani } from '@/components/VeriEkrani';
import { YeniOgrenciFormu } from '@/components/YeniOgrenciFormu';
import { birimSecenekleri, kurumAdlariniGetir, type KurumOzeti, kurumYolu } from '@/lib/kurumlar';
import { OGRENCI_SAYFA_BOYUTU, type OgrenciSiralamasi, ogrencileriAra } from '@/lib/ogrenciler';
import { useOturum } from '@/lib/oturum';
import { siniflariGetir } from '@/lib/siniflar';
import { useTema } from '@/lib/tema';
import type { Ogrenci, Sinif } from '@/lib/tipler';

type Durum = 'aktif' | 'pasif';
const DURUM_SECENEKLERI: { deger: Durum; etiket: string }[] = [
  { deger: 'aktif', etiket: 'Aktif' },
  { deger: 'pasif', etiket: 'Pasif (ayrılmış)' },
];
const ARAMA_GECIKMESI_MS = 350;

// 'YYYY-AA-GG' -> 'GG.AA.YYYY'
const tarih = (t: string) => t.split('-').reverse().join('.');

type Secili = { tur: 'kayit'; ogrenci: Ogrenci } | { tur: 'yeni' } | null;

export default function Ogrenciler() {
  const tema = useTema();
  const { kurum, kokKurum } = useOturum();
  const [yazilan, setYazilan] = useState('');
  const [arama, setArama] = useState('');
  const [birimId, setBirimId] = useState<string | null>(null);
  const [sinifId, setSinifId] = useState<string | null>(null);
  const [durum, setDurum] = useState<Durum>('aktif');
  const [siralama, setSiralama] = useState<OgrenciSiralamasi>({ anahtar: 'ad_soyad', yon: 'artan' });
  const [sayfa, setSayfa] = useState(0);
  const [yenileme, setYenileme] = useState(0);

  const [ogrenciler, setOgrenciler] = useState<Ogrenci[] | null>(null);
  const [toplam, setToplam] = useState(0);
  const [hata, setHata] = useState<string | null>(null);
  const [kurumlar, setKurumlar] = useState<KurumOzeti[]>([]);
  const [siniflar, setSiniflar] = useState<Sinif[]>([]);
  const [secili, setSecili] = useState<Secili>(null);

  // Her tuş vuruşunda sorgu atmamak için yazma bitince aranır.
  useEffect(() => {
    const zamanlayici = setTimeout(() => {
      setArama(yazilan);
      setSayfa(0);
    }, ARAMA_GECIKMESI_MS);
    return () => clearTimeout(zamanlayici);
  }, [yazilan]);

  useFocusEffect(
    useCallback(() => {
      let iptalEdildi = false;
      setHata(null);
      ogrencileriAra({ arama, sinifId, durum, birimId }, sayfa, siralama)
        .then((sonuc) => {
          if (iptalEdildi) return;
          setOgrenciler(sonuc.ogrenciler);
          setToplam(sonuc.toplam);
        })
        .catch((e: Error) => {
          if (!iptalEdildi) setHata(e.message);
        });
      return () => {
        iptalEdildi = true;
      };
      // `yenileme`: panelde bir kayıt değişince aynı sorguyu yeniden çalıştırır.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [arama, sinifId, durum, birimId, sayfa, siralama, yenileme]),
  );

  useFocusEffect(
    useCallback(() => {
      // Birim ve sınıf adları okunamazsa tablo yine çalışır; ilgili sütun ve filtre boş kalır.
      kurumAdlariniGetir()
        .then(setKurumlar)
        .catch(() => {});
      siniflariGetir()
        .then(setSiniflar)
        .catch(() => {});
    }, []),
  );

  const yenile = () => setYenileme((n) => n + 1);
  const sirala = (anahtar: string) => {
    setSiralama((s) => ({
      anahtar: anahtar as OgrenciSiralamasi['anahtar'],
      yon: s.anahtar === anahtar && s.yon === 'artan' ? 'azalan' : 'artan',
    }));
    setSayfa(0);
  };

  const birimAdi = useCallback(
    (kurumId: string) => kurumYolu(kurumlar, kurumId, kokKurum?.id) || (kurumlar.find((k) => k.id === kurumId)?.ad ?? ''),
    [kurumlar, kokKurum?.id],
  );
  const sinifAdi = useCallback((id: string) => siniflar.find((s) => s.id === id)?.ad ?? '', [siniflar]);
  // Sınıf adı birimler arasında tekrar edebilir ("Kâşif 1"); seçim kutularında birimiyle gösterilir.
  const sinifEtiketi = (s: Sinif) => `${s.ad} — ${birimAdi(s.kurum_id)}`;
  const birimdekiSiniflar = birimId
    ? siniflar.filter((s) => kurumlar.find((k) => k.id === s.kurum_id)?.yol.includes(birimId))
    : siniflar;

  const sutunlar = useMemo<TabloSutunu<Ogrenci>[]>(
    () => [
      { anahtar: 'ad_soyad', baslik: 'Ad Soyad', icerik: (o) => o.ad_soyad, siralanabilir: true },
      { anahtar: 'birim', baslik: 'Birim', icerik: (o) => birimAdi(o.kurum_id) },
      { anahtar: 'sinif', baslik: 'Sınıf', icerik: (o) => sinifAdi(o.sinif_id) },
      { anahtar: 'dogum_tarihi', baslik: 'Doğum Tarihi', icerik: (o) => tarih(o.dogum_tarihi), siralanabilir: true, genislik: 140, ikincil: true },
      {
        anahtar: 'veli',
        baslik: 'Veli Girişi',
        genislik: 120,
        ikincil: true,
        icerik: (o) =>
          o.tckn ? (
            <Rozet metin="Açık" renk={tema.renkler.basari} zemin={tema.renkler.basariSoluk} ikon="checkmark-circle" />
          ) : (
            'Yok'
          ),
      },
    ],
    [birimAdi, sinifAdi, tema],
  );

  const birimler = kurum ? birimSecenekleri(kurumlar, kurum.id) : [];
  const seciliOgrenci = secili?.tur === 'kayit' ? secili.ogrenci : null;
  const kapatVeYenile = () => {
    setSecili(null);
    yenile();
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Öğrenciler' }} />
      <VeriEkrani
        arama={<Girdi etiket="Ada göre ara" value={yazilan} onChangeText={setYazilan} autoCorrect={false} returnKeyType="search" />}
        filtreler={[
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
          <Secim
            key="sinif"
            etiket="Sınıf"
            secenekler={birimdekiSiniflar.map((s) => ({ deger: s.id, etiket: sinifEtiketi(s) }))}
            secili={sinifId}
            onSec={(s) => {
              setSinifId(s);
              setSayfa(0);
            }}
            bosEtiket="Tümü"
          />,
          <Secim
            key="durum"
            etiket="Durum"
            secenekler={DURUM_SECENEKLERI}
            secili={durum}
            onSec={(d) => {
              setDurum(d ?? 'aktif');
              setSayfa(0);
            }}
          />,
        ]}
        etkinFiltreSayisi={[birimId, sinifId, durum === 'pasif' ? durum : null].filter(Boolean).length}
        yeniEtiket="Yeni Öğrenci"
        onYeni={() => setSecili({ tur: 'yeni' })}
        ozet={`${toplam} öğrenci`}
        veri={ogrenciler}
        hata={hata}
        anahtar={(o) => o.id}
        sutunlar={sutunlar}
        tabloEnAzGenislik={760}
        kart={(o) => (
          <ListeSatiri
            baslik={o.ad_soyad}
            altBaslik={[sinifAdi(o.sinif_id), birimAdi(o.kurum_id)].filter(Boolean).join(' · ')}
            sol={<Avatar ad={o.ad_soyad} />}
            onPress={() => setSecili({ tur: 'kayit', ogrenci: o })}
          />
        )}
        bosIkon="search-outline"
        bosBaslik={arama ? 'Eşleşen öğrenci yok' : durum === 'pasif' ? 'Pasif öğrenci yok' : 'Henüz öğrenci yok'}
        seciliAnahtar={seciliOgrenci?.id ?? null}
        onSec={(o) => setSecili({ tur: 'kayit', ogrenci: o })}
        siralama={siralama}
        onSirala={sirala}
        sayfalama={{ sayfa, sayfaBoyutu: OGRENCI_SAYFA_BOYUTU, toplam, onDegis: setSayfa }}
        onYenile={yenile}
        panelBasligi={secili?.tur === 'yeni' ? 'Yeni Öğrenci' : seciliOgrenci?.ad_soyad}
        onPanelKapat={() => setSecili(null)}
        panel={
          secili?.tur === 'yeni' ? (
            <YeniOgrenciFormu
              siniflar={birimdekiSiniflar}
              sinifEtiketi={sinifEtiketi}
              varsayilanSinifId={sinifId}
              onEklendi={kapatVeYenile}
            />
          ) : seciliOgrenci ? (
            <OgrenciFormu key={seciliOgrenci.id} id={seciliOgrenci.id} onDegisti={yenile} onSilindi={kapatVeYenile} />
          ) : null
        }
      />
    </>
  );
}
