// Salt okunur 1-5 puan göstergesi (beş nokta, puan kadarı dolu).
import { StyleSheet, View } from 'react-native';

import { OLCEK_DEGERLERI } from '@/lib/gelisim';
import { bosluk, renkler, yaricap } from '@/lib/tema';

export function OlcekGostergesi({ deger }: { deger: number }) {
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

const styles = StyleSheet.create({
  satir: {
    flexDirection: 'row',
    gap: bosluk.xs + 2,
  },
  nokta: {
    width: 12,
    height: 12,
    borderRadius: yaricap.tam,
    backgroundColor: renkler.ayirici,
  },
  dolu: {
    backgroundColor: renkler.anaParlak,
  },
});
