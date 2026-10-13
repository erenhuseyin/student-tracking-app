// Erişim: yalnızca kurum_admin. "Kullanıcılar": yöneticinin kapsamındaki (kendi birimi ve altındaki
// tüm birimler; RLS) yöneticiler, öğretmenler ve veliler tek tabloda. Filtreler sunucuda uygulanır.
// Seçilen kişi yan panelde düzenlenir; "Yeni kullanıcı" seçilen birime personel davet eder
// (veli hesabı öğrenci eklenince açılır, buradan açılmaz).
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Avatar } from '@/components/Avatar';
import { Girdi } from '@/components/Girdi';
import { Kart } from '@/components/Kart';
import { ListeSatiri } from '@/components/ListeSatiri';
import { PersonelDavetFormu } from '@/components/PersonelDavetFormu';
import { PersonelDetay } from '@/components/PersonelDetay';
import { PersonelDurumRozeti } from '@/components/PersonelDurumRozeti';
import { Secim } from '@/components/Secim';
import type { TabloSutunu } from '@/components/Tablo';
import { VeliDetay } from '@/components/VeliDetay';
import { VeriEkrani } from '@/components/VeriEkrani';
import { gorevleriGetir } from '@/lib/gorevler';
import {
  KULLANICI_DURUMU_ETIKETLERI,
  KULLANICI_SAYFA_BOYUTU,
  type KullaniciDurumu,
  type KullaniciSiralamasi,
  kullanicilariAra,
  type ListelenenRol,
} from '@/lib/kullanicilar';
import { birimSecenekleri, kurumAdlariniGetir, type KurumOzeti, kurumYolu } from '@/lib/kurumlar';
import { ROL_ETIKETLERI, rolEtiketi } from '@/lib/menu';
import { useOturum } from '@/lib/oturum';
import type { Gorev, Kullanici } from '@/lib/tipler';

const ARAMA_GECIKMESI_MS = 350;
const ROL_SECENEKLERI: { deger: ListelenenRol; etiket: string }[] = [
  { deger: 'kurum_admin', etiket: ROL_ETIKETLERI.kurum_admin },
  { deger: 'ogretmen', etiket: ROL_ETIKETLERI.ogretmen },
  { deger: 'veli', etiket: ROL_ETIKETLERI.veli },
];
const DURUM_SECENEKLERI = (Object.keys(KULLANICI_DURUMU_ETIKETLERI) as KullaniciDurumu[]).map((d) => ({
  deger: d,
  etiket: KULLANICI_DURUMU_ETIKETLERI[d],
}));

type Secili = { tur: 'kayit'; kullanici: Kullanici } | { tur: 'yeni' } | null;

export default function Kullanicilar() {
  const { kurum, kokKurum } = useOturum();
  const [yazilan, setYazilan] = useState('');
  const [arama, setArama] = useState('');
  const [rol, setRol] = useState<ListelenenRol | null>(null);
  const [gorevId, setGorevId] = useState<string | null>(null);
  const [birimId, setBirimId] = useState<string | null>(null);
  const [durum, setDurum] = useState<KullaniciDurumu | null>(null);
  const [siralama, setSiralama] = useState<KullaniciSiralamasi>({ anahtar: 'ad_soyad', yon: 'artan' });
  const [sayfa, setSayfa] = useState(0);
  const [yenileme, setYenileme] = useState(0);

  const [kullanicilar, setKullanicilar] = useState<Kullanici[] | null>(null);
  const [toplam, setToplam] = useState(0);
  const [hata, setHata] = useState<string | null>(null);
  const [kurumlar, setKurumlar] = useState<KurumOzeti[]>([]);
  const [gorevler, setGorevler] = useState<Gorev[]>([]);
  const [secili, setSecili] = useState<Secili>(null);
  const [yeniBirimId, setYeniBirimId] = useState<string | null>(null);

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
      kullanicilariAra({ arama, rol, gorevId, birimId, durum }, siralama, sayfa)
        .then((sonuc) => {
          if (iptalEdildi) return;
          setKullanicilar(sonuc.kullanicilar);
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
    }, [arama, rol, gorevId, birimId, durum, siralama, sayfa, yenileme]),
  );

  useFocusEffect(
    useCallback(() => {
      // Birim ve görev adları okunamazsa tablo yine çalışır; ilgili sütun ve filtre boş kalır.
      kurumAdlariniGetir()
        .then(setKurumlar)
        .catch(() => {});
      gorevleriGetir()
        .then(setGorevler)
        .catch(() => {});
    }, []),
  );

  const yenile = () => setYenileme((n) => n + 1);
  const filtrele = <T,>(ayarla: (deger: T) => void) => (deger: T) => {
    ayarla(deger);
    setSayfa(0);
  };
  const sirala = (anahtar: string) => {
    setSiralama((s) => ({
      anahtar: anahtar as KullaniciSiralamasi['anahtar'],
      yon: s.anahtar === anahtar && s.yon === 'artan' ? 'azalan' : 'artan',
    }));
    setSayfa(0);
  };

  const birimAdi = useCallback(
    (kurumId: string | null) => {
      if (!kurumId) return '';
      return kurumYolu(kurumlar, kurumId, kokKurum?.id) || (kurumlar.find((k) => k.id === kurumId)?.ad ?? '');
    },
    [kurumlar, kokKurum?.id],
  );
  const gorevi = useCallback(
    (k: Kullanici) =>
      rolEtiketi(k.rol, kurumlar.find((x) => x.id === k.kurum_id) ?? null, gorevler.find((g) => g.id === k.gorev_id)?.ad),
    [kurumlar, gorevler],
  );

  const sutunlar = useMemo<TabloSutunu<Kullanici>[]>(
    () => [
      { anahtar: 'ad_soyad', baslik: 'Ad Soyad', icerik: (k) => k.ad_soyad, siralanabilir: true },
      { anahtar: 'rol', baslik: 'Rol / Görev', icerik: gorevi, siralanabilir: true },
      { anahtar: 'birim', baslik: 'Birim', icerik: (k) => birimAdi(k.kurum_id) },
      { anahtar: 'eposta', baslik: 'E-posta', icerik: (k) => k.eposta ?? '—', siralanabilir: true, ikincil: true },
      { anahtar: 'durum', baslik: 'Durum', icerik: (k) => <PersonelDurumRozeti personel={k} />, genislik: 170 },
    ],
    [birimAdi, gorevi],
  );

  const birimler = kurum ? birimSecenekleri(kurumlar, kurum.id) : [];
  const davetBirimi = yeniBirimId ?? kurum?.id ?? null;
  const seciliKullanici = secili?.tur === 'kayit' ? secili.kullanici : null;
  const kapat = () => setSecili(null);
  const kapatVeYenile = () => {
    setSecili(null);
    yenile();
  };

  return (
    <VeriEkrani
      arama={<Girdi etiket="Ad ya da e-posta ara" value={yazilan} onChangeText={setYazilan} autoCorrect={false} autoCapitalize="none" />}
      filtreler={[
        <Secim key="rol" etiket="Rol" secenekler={ROL_SECENEKLERI} secili={rol} onSec={filtrele(setRol)} bosEtiket="Tümü" />,
        gorevler.length > 0 ? (
          <Secim
            key="gorev"
            etiket="Görev"
            secenekler={gorevler.map((g) => ({ deger: g.id, etiket: g.ad }))}
            secili={gorevId}
            onSec={filtrele(setGorevId)}
            bosEtiket="Tümü"
          />
        ) : null,
        birimler.length > 1 ? (
          <Secim key="birim" etiket="Birim" secenekler={birimler} secili={birimId} onSec={filtrele(setBirimId)} bosEtiket="Tümü" />
        ) : null,
        <Secim key="durum" etiket="Durum" secenekler={DURUM_SECENEKLERI} secili={durum} onSec={filtrele(setDurum)} bosEtiket="Tümü" />,
      ]}
      etkinFiltreSayisi={[rol, gorevId, birimId, durum].filter(Boolean).length}
      yeniEtiket="Yeni Kullanıcı"
      onYeni={() => setSecili({ tur: 'yeni' })}
      ozet={`${toplam} kullanıcı`}
      veri={kullanicilar}
      hata={hata}
      anahtar={(k) => k.id}
      sutunlar={sutunlar}
      tabloEnAzGenislik={820}
      kart={(k) => (
        <ListeSatiri
          baslik={k.ad_soyad}
          altBaslik={[gorevi(k), birimAdi(k.kurum_id)].filter(Boolean).join(' · ')}
          sol={<Avatar ad={k.ad_soyad} />}
          sag={<PersonelDurumRozeti personel={k} />}
          onPress={() => setSecili({ tur: 'kayit', kullanici: k })}
        />
      )}
      bosIkon="people-outline"
      bosBaslik="Eşleşen kullanıcı yok"
      bosAciklama="Filtreleri değiştirin ya da yeni kullanıcı ekleyin."
      seciliAnahtar={seciliKullanici?.id ?? null}
      onSec={(k) => setSecili({ tur: 'kayit', kullanici: k })}
      siralama={siralama}
      onSirala={sirala}
      sayfalama={{ sayfa, sayfaBoyutu: KULLANICI_SAYFA_BOYUTU, toplam, onDegis: setSayfa }}
      onYenile={yenile}
      panelBasligi={secili?.tur === 'yeni' ? 'Yeni Kullanıcı' : seciliKullanici?.ad_soyad}
      onPanelKapat={kapat}
      panel={
        secili?.tur === 'yeni' ? (
          <>
            {birimler.length > 1 ? (
              <Kart>
                <Secim etiket="Birim" secenekler={birimler} secili={davetBirimi} onSec={(b) => setYeniBirimId(b)} />
              </Kart>
            ) : null}
            {davetBirimi ? (
              <PersonelDavetFormu
                key={davetBirimi}
                kurumId={davetBirimi}
                roller={['ogretmen', 'kurum_admin']}
                gorevler={gorevler}
                onTamam={kapatVeYenile}
              />
            ) : null}
          </>
        ) : seciliKullanici?.rol === 'veli' ? (
          <VeliDetay key={seciliKullanici.id} id={seciliKullanici.id} ogrenciAltBasligi={(o) => birimAdi(o.kurum_id)} />
        ) : seciliKullanici ? (
          <PersonelDetay key={seciliKullanici.id} id={seciliKullanici.id} onDegisti={yenile} onSilindi={kapatVeYenile} />
        ) : null
      }
    />
  );
}
