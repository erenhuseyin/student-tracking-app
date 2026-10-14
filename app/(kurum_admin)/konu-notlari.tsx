// Erişim: yalnızca kurum_admin (yönettiği kurumların sınıfları; RLS). Hocaların ders takibinde
// konulara yazdığı notlar; okunmamışlar önce. Satıra dokununca sınıfın ders takibi o konu açık
// gelir — not orada okununca "görüldü" olur ve yanıt orada yazılır.
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Ekran } from '@/components/Ekran';
import { Kart } from '@/components/Kart';
import { Liste } from '@/components/Liste';
import { Rozet } from '@/components/Rozet';
import { Secenekler } from '@/components/Secenekler';
import { Secim } from '@/components/Secim';
import { etkinlikZamaniniBicimle } from '@/lib/duyurular';
import { type KonuNotuSatiri, konuNotlariniGetir } from '@/lib/konuNotlari';
import { birimSecenekleri, kurumAdlariniGetir, type KurumOzeti, kurumYolu } from '@/lib/kurumlar';
import { useOturum } from '@/lib/oturum';
import { type Tema, useTema } from '@/lib/tema';

type Durum = 'okunmamis' | 'tumu';
const DURUMLAR: { deger: Durum; etiket: string }[] = [
  { deger: 'okunmamis', etiket: 'Okunmamış' },
  { deger: 'tumu', etiket: 'Tümü' },
];

export default function KonuNotlari() {
  const router = useRouter();
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const { kurum, kokKurum } = useOturum();
  const [notlar, setNotlar] = useState<KonuNotuSatiri[] | null>(null);
  const [kurumlar, setKurumlar] = useState<KurumOzeti[]>([]);
  const [hata, setHata] = useState<string | null>(null);
  const [durum, setDurum] = useState<Durum>('okunmamis');
  const [birimId, setBirimId] = useState<string | null>(null);
  const [hocaId, setHocaId] = useState<string | null>(null);

  const yenile = useCallback(async () => {
    setHata(null);
    try {
      setNotlar(await konuNotlariniGetir());
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
    }
    // Birim adları okunamazsa birim süzgeci ve yolu gösterilmez.
    kurumAdlariniGetir()
      .then(setKurumlar)
      .catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      yenile();
    }, [yenile]),
  );

  const birimler = kurum ? birimSecenekleri(kurumlar, kurum.id) : [];
  const birimAdi = (kurumId: string) => kurumYolu(kurumlar, kurumId, kokKurum?.id) || '';
  const hocalar = useMemo(() => {
    const harita = new Map<string, string>();
    for (const n of notlar ?? []) for (const h of n.hocalar) harita.set(h.id, h.ad);
    return [...harita].map(([deger, etiket]) => ({ deger, etiket })).sort((a, b) => a.etiket.localeCompare(b.etiket, 'tr'));
  }, [notlar]);

  const suzulmus =
    notlar?.filter(
      (n) =>
        (durum === 'tumu' || !n.goruldu) &&
        (!birimId || kurumlar.find((k) => k.id === n.kurumId)?.yol.includes(birimId)) &&
        (!hocaId || n.hocalar.some((h) => h.id === hocaId)),
    ) ?? null;

  const ac = (n: KonuNotuSatiri) =>
    router.push({ pathname: '/ders-takibi/[sinifId]', params: { sinifId: n.sinifId, konu: n.konuId } });

  const durumRozeti = (n: KonuNotuSatiri) =>
    !n.goruldu ? (
      <Rozet metin="Yeni" ikon="ellipse" renk={tema.renkler.ana} zemin={tema.renkler.anaSoluk} />
    ) : n.yanitVar ? (
      <Rozet metin="Yanıtlandı" ikon="checkmark" renk={tema.renkler.metinIkincil} zemin={tema.renkler.ayirici} />
    ) : null;

  const hocaMetni = (n: KonuNotuSatiri) => n.hocalar.map((h) => h.ad).join(', ');

  return (
    <Ekran genis={tema.duzen === 'web'}>
      <Stack.Screen options={{ title: 'Konu Notları' }} />
      <View style={styles.suzgecler}>
        <Secenekler secenekler={DURUMLAR} secili={durum} onSec={setDurum} />
        {birimler.length > 1 ? (
          <View style={styles.suzgec}>
            <Secim etiket="Birim" secenekler={birimler} secili={birimId} onSec={setBirimId} bosEtiket="Tümü" />
          </View>
        ) : null}
        {hocalar.length > 1 ? (
          <View style={styles.suzgec}>
            <Secim etiket="Hoca" secenekler={hocalar} secili={hocaId} onSec={setHocaId} bosEtiket="Tümü" />
          </View>
        ) : null}
      </View>
      <Liste
        veri={suzulmus}
        hata={hata}
        onYenile={yenile}
        anahtar={(n) => n.anahtar}
        bosIkon="chatbubble-ellipses-outline"
        bosBaslik={durum === 'okunmamis' ? 'Okunmamış not yok' : 'Henüz konu notu yok'}
        bosAciklama="Hocalar ders takibinde konulara not yazabilir; buradan okuyup yanıtlarsınız."
        onSatirPress={ac}
        sutunlar={[
          { anahtar: 'sinif', baslik: 'Sınıf', genislik: 160, icerik: (n) => n.sinifAdi },
          ...(birimler.length > 1
            ? [{ anahtar: 'birim', baslik: 'Birim', genislik: 200, icerik: (n: KonuNotuSatiri) => birimAdi(n.kurumId) }]
            : []),
          { anahtar: 'konu', baslik: 'Ders › Konu', genislik: 240, icerik: (n) => `${n.dersAdi} › ${n.konuAdi}` },
          {
            anahtar: 'not',
            baslik: 'Not',
            icerik: (n) => <Text style={[tema.yazi.govde, { paddingVertical: tema.bosluk.s }]}>{n.notMetni}</Text>,
          },
          { anahtar: 'hoca', baslik: 'Hoca', genislik: 160, icerik: hocaMetni },
          { anahtar: 'tarih', baslik: 'Tarih', genislik: 170, icerik: (n) => etkinlikZamaniniBicimle(n.yazilmaZamani) },
          { anahtar: 'durum', baslik: '', genislik: 120, icerik: durumRozeti },
        ]}
        satir={(n) => (
          <Pressable accessibilityRole="button" onPress={() => ac(n)} style={({ pressed }) => pressed && styles.basili}>
            <Kart>
            <View style={styles.ust}>
              <Text style={[tema.yazi.kucuk, styles.kunye]}>
                {[n.sinifAdi, hocaMetni(n), etkinlikZamaniniBicimle(n.yazilmaZamani)].filter(Boolean).join(' · ')}
              </Text>
              {durumRozeti(n)}
            </View>
            <Text style={tema.yazi.etiket}>
              {n.dersAdi} › {n.konuAdi}
            </Text>
            <Text style={tema.yazi.govde}>{n.notMetni}</Text>
            </Kart>
          </Pressable>
        )}
      />
    </Ekran>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    suzgecler: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'flex-end',
      gap: t.bosluk.m,
    },
    suzgec: {
      flexBasis: 220,
      flexGrow: t.duzen === 'web' ? 0 : 1,
    },
    ust: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.s,
    },
    kunye: {
      flex: 1,
    },
    basili: {
      opacity: 0.7,
    },
  });
}
