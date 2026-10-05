// Ad soyadın baş harflerini gösteren yuvarlak rozet (öğrenci fotoğrafı yokken yer tutucu).
import { StyleSheet, Text, View } from 'react-native';

import { renkler, yaricap } from '@/lib/tema';

function basHarfler(ad: string): string {
  const kelimeler = ad.trim().split(/\s+/).filter(Boolean);
  const ilk = kelimeler[0]?.[0] ?? '';
  const son = kelimeler.length > 1 ? (kelimeler[kelimeler.length - 1][0] ?? '') : '';
  return (ilk + son).toLocaleUpperCase('tr-TR');
}

export function Avatar({ ad, boyut = 40 }: { ad: string; boyut?: number }) {
  return (
    <View style={[styles.daire, { width: boyut, height: boyut }]}>
      <Text style={[styles.harfler, { fontSize: boyut * 0.38 }]}>{basHarfler(ad)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  daire: {
    borderRadius: yaricap.tam,
    backgroundColor: renkler.anaSoluk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  harfler: {
    color: renkler.ana,
    fontWeight: '700',
  },
});
