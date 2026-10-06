// Ad soyadın baş harflerini gösteren yuvarlak rozet (öğrenci fotoğrafı yokken yer tutucu).
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { type Tema, useTema } from '@/lib/tema';

function basHarfler(ad: string): string {
  const kelimeler = ad.trim().split(/\s+/).filter(Boolean);
  const ilk = kelimeler[0]?.[0] ?? '';
  const son = kelimeler.length > 1 ? (kelimeler[kelimeler.length - 1][0] ?? '') : '';
  return (ilk + son).toLocaleUpperCase('tr-TR');
}

export function Avatar({ ad, boyut = 40 }: { ad: string; boyut?: number }) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  return (
    <View style={[styles.daire, { width: boyut, height: boyut }]}>
      <Text style={[styles.harfler, { fontSize: boyut * 0.38 }]}>{basHarfler(ad)}</Text>
    </View>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    daire: {
      borderRadius: t.yaricap.tam,
      backgroundColor: t.renkler.anaSoluk,
      alignItems: 'center',
      justifyContent: 'center',
    },
    harfler: {
      fontFamily: t.yaziTipi.kalin,
      color: t.renkler.ana,
    },
  });
}
