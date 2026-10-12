// Erişim: yalnızca kurum_admin. "Menü Yetkileri": hangi rol ya da görev hangi menüyü görür.
// Satır = menü öğesi, sütun = rol/görev, hücre = onay kutusu; kutu değişince hemen kaydedilir.
//
//   Sistem rolleri Öğretmen ve Veli  -> kapali_bolum (lib/bolumler.ts)
//   Tanımlı görevler                 -> gorev.kapali_ogeler (lib/gorevler.ts)
//   Yönetici (görevsiz)              -> kapatılamaz; kimse kendini dışarıda bırakamasın diye
//
// Bu bir GÖRÜNÜRLÜK ayarıdır: ekranı gizler, veri yetkisini değiştirmez (onu rol ve RLS belirler).
// Yalnızca kök kurumun (genel merkezin) yöneticisi değiştirir; alt birim yöneticisi salt okunur görür.
import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text } from 'react-native';

import { Ekran } from '@/components/Ekran';
import { HataMesaji } from '@/components/HataMesaji';
import { OnayIsareti } from '@/components/OnayIsareti';
import { Secim } from '@/components/Secim';
import { Tablo, type TabloSutunu } from '@/components/Tablo';
import { Yukleniyor } from '@/components/Yukleniyor';
import { bolumGorunurlugunuAyarla, kapaliBolumleriGetir, type KapaliBolum } from '@/lib/bolumler';
import { gorevKapaliOgeleriAyarla, gorevleriGetir } from '@/lib/gorevler';
import { AYARLANABILIR_BOLUMLER, type Bolum, ROL_ETIKETLERI, YONETICI_MENU_OGELERI } from '@/lib/menu';
import { useOturum } from '@/lib/oturum';
import { useTema } from '@/lib/tema';
import type { Gorev } from '@/lib/tipler';

type TemelRol = 'kurum_admin' | 'ogretmen' | 'veli';
const TEMEL_ROL_SECENEKLERI: { deger: TemelRol; etiket: string }[] = [
  { deger: 'kurum_admin', etiket: 'Yönetici ve yönetici görevleri' },
  { deger: 'ogretmen', etiket: 'Öğretmen ve öğretmen görevleri' },
  { deger: 'veli', etiket: 'Veli' },
];
const OGELER: Record<TemelRol, Bolum[]> = {
  kurum_admin: YONETICI_MENU_OGELERI,
  ogretmen: AYARLANABILIR_BOLUMLER.ogretmen,
  veli: AYARLANABILIR_BOLUMLER.veli,
};
const OGE_SUTUNU_GENISLIGI = 280;
const ROL_SUTUNU_GENISLIGI = 140;

export default function MenuYetkileri() {
  const tema = useTema();
  const { kurum, kokKurum } = useOturum();
  const degistirebilir = kurum !== null && kurum.ust_kurum_id === null;
  const kokKurumId = kokKurum?.id;

  const [temelRol, setTemelRol] = useState<TemelRol>('kurum_admin');
  const [gorevler, setGorevler] = useState<Gorev[] | null>(null);
  const [kapalilar, setKapalilar] = useState<KapaliBolum[]>([]);
  const [hata, setHata] = useState<string | null>(null);
  const [degisen, setDegisen] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!kokKurumId) return;
      let iptalEdildi = false;
      setHata(null);
      Promise.all([gorevleriGetir(), kapaliBolumleriGetir(kokKurumId)])
        .then(([g, k]) => {
          if (iptalEdildi) return;
          setGorevler(g);
          setKapalilar(k);
        })
        .catch((e: Error) => {
          if (!iptalEdildi) setHata(e.message);
        });
      return () => {
        iptalEdildi = true;
      };
    }, [kokKurumId]),
  );

  const sistemAcik = (anahtar: string) =>
    temelRol === 'kurum_admin' || !kapalilar.some((k) => k.rol === temelRol && k.anahtar === anahtar);

  const sistemDegistir = async (anahtar: string, acik: boolean) => {
    if (!kokKurumId || temelRol === 'kurum_admin') return;
    setDegisen(`sistem:${anahtar}`);
    setHata(null);
    try {
      await bolumGorunurlugunuAyarla(kokKurumId, temelRol, anahtar, acik);
      setKapalilar((mevcut) => {
        const digerleri = mevcut.filter((k) => !(k.rol === temelRol && k.anahtar === anahtar));
        return acik ? digerleri : [...digerleri, { rol: temelRol, anahtar }];
      });
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
    } finally {
      setDegisen(null);
    }
  };

  const gorevDegistir = async (gorev: Gorev, anahtar: string, acik: boolean) => {
    const yeni = acik ? gorev.kapali_ogeler.filter((a) => a !== anahtar) : [...gorev.kapali_ogeler, anahtar];
    setDegisen(`${gorev.id}:${anahtar}`);
    setHata(null);
    try {
      await gorevKapaliOgeleriAyarla(gorev.id, yeni);
      setGorevler((mevcut) => (mevcut ?? []).map((g) => (g.id === gorev.id ? { ...g, kapali_ogeler: yeni } : g)));
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
    } finally {
      setDegisen(null);
    }
  };

  const roldekiGorevler = (gorevler ?? []).filter((g) => g.temel_rol === temelRol);
  const sutunlar: TabloSutunu<Bolum>[] = [
    {
      anahtar: 'oge',
      baslik: 'Menü',
      genislik: OGE_SUTUNU_GENISLIGI,
      icerik: (b) => (
        <>
          <Text style={tema.yazi.govde}>{b.etiket}</Text>
          {b.aciklama ? <Text style={tema.yazi.kucuk}>{b.aciklama}</Text> : null}
        </>
      ),
    },
    {
      anahtar: 'sistem',
      baslik: ROL_ETIKETLERI[temelRol],
      genislik: ROL_SUTUNU_GENISLIGI,
      icerik: (b) => (
        <OnayIsareti
          etiket={`${ROL_ETIKETLERI[temelRol]}: ${b.etiket}`}
          secili={sistemAcik(b.anahtar)}
          pasif={!degistirebilir || temelRol === 'kurum_admin' || degisen !== null}
          calisiyor={degisen === `sistem:${b.anahtar}`}
          onDegis={(acik) => sistemDegistir(b.anahtar, acik)}
        />
      ),
    },
    ...roldekiGorevler.map<TabloSutunu<Bolum>>((g) => ({
      anahtar: g.id,
      baslik: g.ad,
      genislik: ROL_SUTUNU_GENISLIGI,
      icerik: (b) => (
        <OnayIsareti
          etiket={`${g.ad}: ${b.etiket}`}
          secili={!g.kapali_ogeler.includes(b.anahtar)}
          pasif={!degistirebilir || degisen !== null}
          calisiyor={degisen === `${g.id}:${b.anahtar}`}
          onDegis={(acik) => gorevDegistir(g, b.anahtar, acik)}
        />
      ),
    })),
  ];

  return (
    <Ekran kaydirilabilir genis>
      <Stack.Screen options={{ title: 'Menü Yetkileri' }} />

      <Secim etiket="Rol grubu" secenekler={TEMEL_ROL_SECENEKLERI} secili={temelRol} onSec={(r) => setTemelRol(r ?? 'kurum_admin')} />
      <HataMesaji mesaj={hata} />

      {gorevler === null ? (
        hata ? null : (
          <Yukleniyor />
        )
      ) : (
        <Tablo
          veri={OGELER[temelRol]}
          sutunlar={sutunlar}
          anahtar={(b) => b.anahtar}
          enAzGenislik={OGE_SUTUNU_GENISLIGI + ROL_SUTUNU_GENISLIGI * (1 + roldekiGorevler.length) + 80}
        />
      )}

      <Text style={tema.yazi.kucuk}>
        {temelRol === 'kurum_admin'
          ? 'Görevi olmayan yöneticinin menüleri kapatılamaz. Özet ve Menü her görevde açıktır.'
          : temelRol === 'ogretmen'
            ? 'Öğretmen sütununda kapatılan bölüm tüm öğretmenlerde (görevi olanlar dahil) kapalıdır; görev sütunu yalnızca o görevdekileri etkiler.'
            : 'Veli için görev tanımlanmaz; ayar tüm veliler için geçerlidir.'}
      </Text>
      <Text style={tema.yazi.kucuk}>
        {degistirebilir
          ? 'İşareti kaldırdığınız menü o roldeki ya da görevdeki herkesin uygulamasında gizlenir (alt birimler dahil); değişiklik kişinin bir sonraki girişinde görünür. Bu ayar yalnızca ekranları gizler: kimin hangi veriye erişebildiği role ve bağlı olduğu birime bağlıdır, buradan değişmez.'
          : 'Bu ayarları yalnızca ana kurumun yöneticisi değiştirebilir.'}
      </Text>
      {roldekiGorevler.length === 0 && temelRol !== 'veli' ? (
        <Text style={tema.yazi.kucuk}>Bu role dayanan tanımlı görev yok; Roller ekranından görev tanımlayabilirsiniz.</Text>
      ) : null}
    </Ekran>
  );
}
