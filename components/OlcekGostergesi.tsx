// Salt okunur 1-5 puan göstergesi (beş nokta, puan kadarı dolu).
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { OLCEK_DEGERLERI } from '@/lib/gelisim';
import { type Tema, useTema } from '@/lib/tema';

export function OlcekGostergesi({ deger }: { deger: number }) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Puan: ${OLCEK_DEGERLERI.length} üzerinden ${deger}`}
      style={styles.satir}
    >
      {OLCEK_DEGERLERI.map((n) => (
        <View key={n} style={[styles.nokta, n <= deger && styles.dolu]} />
      ))}
    </View>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    satir: {
      flexDirection: 'row',
      gap: t.bosluk.xs + 2,
    },
    nokta: {
      width: 12,
      height: 12,
      borderRadius: t.yaricap.tam,
      backgroundColor: t.renkler.ayirici,
    },
    dolu: {
      backgroundColor: t.renkler.anaParlak,
    },
  });
}
