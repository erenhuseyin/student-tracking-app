// Yükleniyor iskeleti: sabit bir blok değil, soluk-yoğun arası yumuşak geçişle nabız atar.
// Liste/kart yüklenirken `Yukleniyor` (dönen gösterge) yerine içeriğin yaklaşık şeklini
// gösterir. `SkeletonSatir`/`SkeletonKart` hazır önizleme biçimleridir.
import { useEffect, useMemo, useState } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';

import { type Tema, useTema } from '@/lib/tema';

type Props = {
  genislik?: number | `${number}%`;
  yukseklik?: number;
  yuvarlak?: boolean;
  stil?: ViewStyle;
};

export function Skeleton({ genislik = '100%', yukseklik = 16, yuvarlak = false, stil }: Props) {
  const tema = useTema();
  // `useRef(...).current`'ı render sırasında okumak React Compiler kuralını ihlal ediyor;
  // tembel `useState` başlatıcısı aynı "bir kez oluştur" etkisini ref olmadan verir.
  const [nabiz] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const dongu = Animated.loop(
      Animated.sequence([
        Animated.timing(nabiz, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(nabiz, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    );
    dongu.start();
    return () => dongu.stop();
  }, [nabiz]);

  return (
    <Animated.View
      style={[
        {
          width: genislik,
          height: yukseklik,
          borderRadius: yuvarlak ? tema.yaricap.tam : tema.yaricap.s,
          backgroundColor: tema.renkler.ayirici,
          opacity: nabiz.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
        },
        stil,
      ]}
    />
  );
}

// Bir ListeSatiri'nin yaklaşık şekli: sol daire + iki satır metin.
export function SkeletonSatir() {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  return (
    <View style={styles.satir}>
      <Skeleton genislik={40} yukseklik={40} yuvarlak />
      <View style={styles.metinler}>
        <Skeleton genislik="60%" yukseklik={15} />
        <Skeleton genislik="40%" yukseklik={13} />
      </View>
    </View>
  );
}

// Bir Kart'ın yaklaşık şekli: başlık + iki satır gövde.
export function SkeletonKart() {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  return (
    <View style={styles.kart}>
      <Skeleton genislik="50%" yukseklik={18} />
      <Skeleton genislik="100%" yukseklik={15} />
      <Skeleton genislik="80%" yukseklik={15} />
    </View>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    satir: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.m,
      minHeight: t.dokunmaAlani.buyuk,
      paddingHorizontal: t.bosluk.l,
      paddingVertical: t.bosluk.s,
      borderRadius: t.yaricap.l,
      borderWidth: 1,
      borderColor: t.renkler.ayirici,
      backgroundColor: t.renkler.yuzey,
    },
    metinler: {
      flex: 1,
      gap: t.bosluk.s,
    },
    kart: {
      gap: t.bosluk.m,
      padding: t.bosluk.l,
      borderRadius: t.yaricap.l,
      borderWidth: 1,
      borderColor: t.renkler.ayirici,
      backgroundColor: t.renkler.yuzey,
    },
  });
}
