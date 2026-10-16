// Tek serili dikey çubuk grafik (ör. haftalık katılım oranı). Değerler 0-1 arasındadır; `null`
// "veri yok" demektir ve çubuk çizilmez. Çubuğa dokununca / fareyle gelince üstte o çubuğun
// ayrıntısı (`ipucu`) görünür; seçim yokken son çubuk gösterilir. View tabanlıdır, bağımlılık yok.
//
// Tek seri olduğu için lejant yoktur (başlığı ekran verir). Renk tek tondur; değer metinleri
// metin renginde kalır.
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type Tema, useKirilma, useTema } from '@/lib/tema';

export type GrafikCubugu = {
  anahtar: string;
  // Eksen etiketi (kısa; ör. "7 Eyl").
  etiket: string;
  deger: number | null;
  // Seçilince gösterilen tam açıklama (ör. "7–13 Eylül: %85 · 34 yoklama").
  ipucu: string;
};

const IZGARA = [1, 0.5, 0];

export function CubukGrafik({ cubuklar, yukseklik = 160 }: { cubuklar: GrafikCubugu[]; yukseklik?: number }) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const dar = useKirilma() === 'mobil';
  const [secili, setSecili] = useState<number | null>(null);
  const gosterilen = cubuklar[secili ?? cubuklar.length - 1];
  // Dar ekranda eksen etiketleri çubuk genişliğine sığmaz: sondan başlayarak ikişer atlanır ve
  // etiket kendi sütununun iki yanına taşarak tam yazılır (kırpılıp "1…" olmasın).
  const etiketGoster = (i: number) => !dar || (cubuklar.length - 1 - i) % 3 === 0;

  return (
    <View style={styles.kapsayici}>
      <Text style={tema.yazi.kucuk}>{gosterilen?.ipucu ?? ' '}</Text>
      <View style={styles.govde}>
        <View style={[styles.eksen, { height: yukseklik }]}>
          {IZGARA.map((d) => (
            <Text key={d} style={styles.eksenMetni}>
              %{d * 100}
            </Text>
          ))}
        </View>
        <View style={styles.esnek}>
          <View style={[styles.alan, { height: yukseklik }]}>
            {IZGARA.map((d) => (
              <View key={d} style={[styles.izgara, { top: (1 - d) * yukseklik }]} />
            ))}
            {cubuklar.map((c, i) => (
              <Pressable
                key={c.anahtar}
                accessibilityRole="button"
                accessibilityLabel={c.ipucu}
                onPress={() => setSecili(i)}
                onHoverIn={() => setSecili(i)}
                onHoverOut={() => setSecili(null)}
                style={styles.sutun}
              >
                {c.deger === null ? (
                  <View style={styles.bos} />
                ) : (
                  <View
                    style={[
                      styles.cubuk,
                      { height: Math.max(3, c.deger * yukseklik) },
                      secili !== null && secili !== i && styles.soluk,
                    ]}
                  />
                )}
              </Pressable>
            ))}
          </View>
          <View style={styles.etiketler}>
            {cubuklar.map((c, i) => (
              <View key={c.anahtar} style={styles.etiketSutunu}>
                <Text style={styles.etiket} numberOfLines={1}>
                  {etiketGoster(i) ? c.etiket : ''}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    kapsayici: {
      gap: t.bosluk.s,
    },
    govde: {
      flexDirection: 'row',
      gap: t.bosluk.s,
    },
    esnek: {
      flex: 1,
    },
    eksen: {
      justifyContent: 'space-between',
      // Etiket, hizalandığı ızgara çizgisinin ortasına gelsin.
      marginVertical: -8,
    },
    eksenMetni: {
      ...t.yazi.kucuk,
      fontSize: 11,
      lineHeight: 16,
      textAlign: 'right',
    },
    alan: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 4,
    },
    izgara: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: t.renkler.ayirici,
    },
    sutun: {
      flex: 1,
      height: '100%',
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    cubuk: {
      width: '100%',
      maxWidth: 36,
      backgroundColor: t.renkler.anaParlak,
      borderTopLeftRadius: 4,
      borderTopRightRadius: 4,
    },
    soluk: {
      opacity: 0.45,
    },
    bos: {
      width: '100%',
      maxWidth: 36,
      height: 2,
      backgroundColor: t.renkler.kenarlik,
    },
    etiketler: {
      flexDirection: 'row',
      gap: 4,
      marginTop: t.bosluk.xs,
    },
    etiketSutunu: {
      flex: 1,
      alignItems: 'center',
    },
    // Sütundan geniş, ortalı: dar sütunda iki yana eşit taşar.
    etiket: {
      ...t.yazi.kucuk,
      fontSize: 11,
      width: 48,
      // react-native-web metne `max-width: 100%` verir; o kalırsa yine sütun genişliğine kırpılır.
      maxWidth: 48,
      textAlign: 'center',
    },
  });
}
