// Erişim: yalnızca kurum_admin (yönettiği kurumların sınıfları; RLS). Sınıf başına kademe, hoca,
// işlenen / toplam konu, ilerleme, son işlenme ve okunmamış konu notu; birim, kademe ve hoca
// süzgeci. Sayılar sunucuda toplanır (lib/dersRaporu.ts); süzme ve sıralama istemcide (satır sayısı
// sınıf sayısı kadardır). Web'de tablo + CSV, telefonda kart. Satır sınıfın ders takibini açar.
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { EylemCubugu } from '@/components/EylemCubugu';
import { IlerlemeCubugu } from '@/components/IlerlemeCubugu';
import { Kart } from '@/components/Kart';
import { Liste } from '@/components/Liste';
import { Rozet } from '@/components/Rozet';
import { Secim } from '@/components/Secim';
import { Tablo, type TabloSiralamasi, type TabloSutunu } from '@/components/Tablo';
import { type DersRaporuSatiri, dersRaporunuGetir, hocaAdlari, ilerlemeOrani } from '@/lib/dersRaporu';
import { dersRaporuCsv, disaAktarmaDestekleniyor, indir } from '@/lib/disaAktar';
import { birimSecenekleri, kurumAdlariniGetir, type KurumOzeti, kurumYolu } from '@/lib/kurumlar';
import { useOturum } from '@/lib/oturum';
import { bugununTarihi, tarihiBicimle } from '@/lib/tarih';
import { type Tema, useTema } from '@/lib/tema';
import { useToast } from '@/lib/toast';

const KADEMESIZ = '-';

export default function DersRaporu() {
  const router = useRouter();
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const toast = useToast();
  const { kurum, kokKurum } = useOturum();
  const web = tema.duzen === 'web';
  const [satirlar, setSatirlar] = useState<DersRaporuSatiri[] | null>(null);
  const [kurumlar, setKurumlar] = useState<KurumOzeti[]>([]);
  const [hata, setHata] = useState<string | null>(null);
  const [birimId, setBirimId] = useState<string | null>(null);
  const [kademe, setKademe] = useState<string | null>(null);
  const [hoca, setHoca] = useState<string | null>(null);
  const [siralama, setSiralama] = useState<TabloSiralamasi>({ anahtar: 'sinif', yon: 'artan' });

  const yenile = useCallback(async () => {
    setHata(null);
    try {
      setSatirlar(await dersRaporunuGetir());
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
    }
    kurumAdlariniGetir()
      .then(setKurumlar)
      .catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      yenile();
    }, [yenile]),
  );

  const birimAdi = useCallback((kurumId: string) => kurumYolu(kurumlar, kurumId, kokKurum?.id) || '', [kurumlar, kokKurum?.id]);
  const birimler = kurum ? birimSecenekleri(kurumlar, kurum.id) : [];
  const kademeler = useMemo(() => {
    const harita = new Map<string, string>();
    for (const s of satirlar ?? []) harita.set(s.kademe_id ?? KADEMESIZ, s.kademe_adi ?? 'Kademesiz');
    return [...harita].map(([deger, etiket]) => ({ deger, etiket })).sort((a, b) => a.etiket.localeCompare(b.etiket, 'tr'));
  }, [satirlar]);
  const hocalar = useMemo(
    () =>
      [...new Set((satirlar ?? []).flatMap(hocaAdlari))]
        .sort((a, b) => a.localeCompare(b, 'tr'))
        .map((ad) => ({ deger: ad, etiket: ad })),
    [satirlar],
  );

  const suzulmus = useMemo(() => {
    if (!satirlar) return null;
    const liste = satirlar.filter(
      (s) =>
        (!birimId || kurumlar.find((k) => k.id === s.kurum_id)?.yol.includes(birimId)) &&
        (!kademe || (s.kademe_id ?? KADEMESIZ) === kademe) &&
        (!hoca || hocaAdlari(s).includes(hoca)),
    );
    const deger = (s: DersRaporuSatiri): string | number => {
      switch (siralama.anahtar) {
        case 'birim':
          return birimAdi(s.kurum_id);
        case 'kademe':
          return s.kademe_adi ?? '';
        case 'hoca':
          return s.hocalar ?? '';
        case 'ogrenci':
          return s.ogrenci_sayisi;
        case 'ilerleme':
          return ilerlemeOrani(s) ?? -1;
        case 'son':
          return s.son_islenme ?? '';
        case 'not':
          return s.okunmamis_not;
        default:
          return s.sinif_adi;
      }
    };
    const yon = siralama.yon === 'artan' ? 1 : -1;
    return [...liste].sort((a, b) => {
      const x = deger(a);
      const y = deger(b);
      return yon * (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'tr'));
    });
  }, [satirlar, birimId, kademe, hoca, kurumlar, siralama, birimAdi]);

  const sirala = (anahtar: string) =>
    setSiralama((s) => ({ anahtar, yon: s.anahtar === anahtar && s.yon === 'artan' ? 'azalan' : 'artan' }));

  const ac = (s: DersRaporuSatiri) => router.push({ pathname: '/ders-takibi/[sinifId]', params: { sinifId: s.sinif_id } });

  const csvIndir = () => {
    if (!suzulmus) return;
    try {
      indir(`ders-raporu-${bugununTarihi()}.csv`, dersRaporuCsv(suzulmus, birimAdi));
      toast(`${suzulmus.length} satır indirildi`);
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İndirilemedi.');
    }
  };

  const notRozeti = (s: DersRaporuSatiri) =>
    s.okunmamis_not > 0 ? (
      <Rozet metin={`${s.okunmamis_not} not`} ikon="chatbubble-ellipses" renk={tema.renkler.ana} zemin={tema.renkler.anaSoluk} />
    ) : null;
  const ilerleme = (s: DersRaporuSatiri) =>
    s.kademe_id ? <IlerlemeCubugu tamam={s.islenen_konu} toplam={s.toplam_konu} /> : <Text style={tema.yazi.kucuk}>Kademe yok</Text>;

  const sutunlar: TabloSutunu<DersRaporuSatiri>[] = [
    { anahtar: 'sinif', baslik: 'Sınıf', genislik: 150, siralanabilir: true, icerik: (s) => s.sinif_adi },
    ...(birimler.length > 1
      ? [{ anahtar: 'birim', baslik: 'Birim', genislik: 200, siralanabilir: true, icerik: (s: DersRaporuSatiri) => birimAdi(s.kurum_id) }]
      : []),
    { anahtar: 'kademe', baslik: 'Kademe', genislik: 120, siralanabilir: true, icerik: (s) => s.kademe_adi ?? '—' },
    { anahtar: 'hoca', baslik: 'Hoca', genislik: 180, siralanabilir: true, icerik: (s) => s.hocalar ?? '—' },
    { anahtar: 'ogrenci', baslik: 'Öğrenci', genislik: 90, hizalama: 'sag', siralanabilir: true, icerik: (s) => String(s.ogrenci_sayisi) },
    { anahtar: 'ilerleme', baslik: 'İlerleme', siralanabilir: true, icerik: ilerleme },
    {
      anahtar: 'son',
      baslik: 'Son işlenme',
      genislik: 170,
      siralanabilir: true,
      icerik: (s) => (s.son_islenme ? tarihiBicimle(s.son_islenme) : '—'),
    },
    { anahtar: 'not', baslik: 'Not', genislik: 100, siralanabilir: true, icerik: notRozeti },
  ];

  return (
    <Ekran genis={web}>
      <Stack.Screen options={{ title: 'Ders Raporu' }} />
      {web && disaAktarmaDestekleniyor ? (
        <EylemCubugu>
          <Buton tur="ikincil" ikon="download-outline" baslik="Rapor İndir" onPress={csvIndir} pasif={!suzulmus?.length} />
        </EylemCubugu>
      ) : null}
      <View style={styles.suzgecler}>
        {birimler.length > 1 ? (
          <View style={styles.suzgec}>
            <Secim etiket="Birim" secenekler={birimler} secili={birimId} onSec={setBirimId} bosEtiket="Tümü" />
          </View>
        ) : null}
        {kademeler.length > 1 ? (
          <View style={styles.suzgec}>
            <Secim etiket="Kademe" secenekler={kademeler} secili={kademe} onSec={setKademe} bosEtiket="Tümü" />
          </View>
        ) : null}
        {hocalar.length > 1 ? (
          <View style={styles.suzgec}>
            <Secim etiket="Hoca" secenekler={hocalar} secili={hoca} onSec={setHoca} bosEtiket="Tümü" />
          </View>
        ) : null}
      </View>

      {web && suzulmus && suzulmus.length > 0 && !hata ? (
        <ScrollView style={styles.kaydirma} contentContainerStyle={styles.icerik}>
          <Tablo veri={suzulmus} sutunlar={sutunlar} anahtar={(s) => s.sinif_id} onPress={ac} siralama={siralama} onSirala={sirala} enAzGenislik={900} />
        </ScrollView>
      ) : (
        <Liste
          veri={suzulmus}
          hata={hata}
          onYenile={yenile}
          anahtar={(s) => s.sinif_id}
          bosIkon="stats-chart-outline"
          bosBaslik="Sınıf yok"
          bosAciklama={satirlar?.length ? 'Süzgeçlere uyan sınıf yok.' : 'Kapsamınızda sınıf bulunmuyor.'}
          satir={(s) => (
            <Pressable accessibilityRole="button" onPress={() => ac(s)} style={({ pressed }) => pressed && styles.basili}>
              <Kart>
                <View style={styles.ust}>
                  <Text style={[tema.yazi.bolum, styles.ad]}>{s.sinif_adi}</Text>
                  {notRozeti(s)}
                </View>
                <Text style={tema.yazi.kucuk}>
                  {[birimler.length > 1 ? birimAdi(s.kurum_id) : null, s.kademe_adi, s.hocalar, `${s.ogrenci_sayisi} öğrenci`]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
                {ilerleme(s)}
                {s.son_islenme ? <Text style={tema.yazi.kucuk}>Son işlenen: {tarihiBicimle(s.son_islenme)}</Text> : null}
              </Kart>
            </Pressable>
          )}
        />
      )}
    </Ekran>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    suzgecler: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: t.bosluk.m,
    },
    suzgec: {
      flexBasis: 220,
      flexGrow: t.duzen === 'web' ? 0 : 1,
    },
    kaydirma: {
      flex: 1,
    },
    icerik: {
      paddingBottom: t.bosluk.l,
    },
    ust: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.s,
    },
    ad: {
      flex: 1,
    },
    basili: {
      opacity: 0.7,
    },
  });
}
