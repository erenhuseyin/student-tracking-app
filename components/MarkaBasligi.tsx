// Giriş ekranlarının üstündeki marka alanı (ad `lib/marka.ts`'ten gelir, ekrana sabit yazılmaz).
import { StyleSheet, Text, View } from 'react-native';

import { Ikon } from '@/components/Ikon';
import { marka } from '@/lib/marka';
import { bosluk, renkler, yaricap, yazi } from '@/lib/tema';

export function MarkaBasligi({ altBaslik }: { altBaslik: string }) {
  return (
    <View style={styles.kapsayici}>
      <View style={styles.logo}>
        <Ikon ad="school" boyut={36} renk={renkler.anaUstu} />
      </View>
      <Text style={[yazi.baslik, styles.ortali]}>{marka.ad}</Text>
      <View style={styles.ayrac} />
      <Text style={[yazi.kucuk, styles.ortali]}>{altBaslik}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kapsayici: {
    alignItems: 'center',
    gap: bosluk.s,
    marginBottom: bosluk.l,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: yaricap.l,
    backgroundColor: renkler.ana,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: bosluk.s,
  },
  ayrac: {
    width: 40,
    height: 3,
    borderRadius: yaricap.tam,
    backgroundColor: renkler.vurgu,
  },
  ortali: {
    textAlign: 'center',
  },
});
