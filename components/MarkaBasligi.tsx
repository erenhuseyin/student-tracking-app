// Giriş ekranlarının üstündeki marka alanı (ad `lib/marka.ts`'ten gelir, ekrana sabit yazılmaz).
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Ikon } from '@/components/Ikon';
import { marka } from '@/lib/marka';
import { type Tema, useTema } from '@/lib/tema';

export function MarkaBasligi({ altBaslik }: { altBaslik: string }) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  return (
    <View style={styles.kapsayici}>
      <View style={styles.logo}>
        <Ikon ad="school" boyut={36} renk={tema.renkler.anaUzeriMetin} />
      </View>
      <Text style={[styles.baslik, styles.ortali]}>{marka.ad}</Text>
      <View style={styles.ayrac} />
      <Text style={[styles.altBaslik, styles.ortali]}>{altBaslik}</Text>
    </View>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    kapsayici: {
      alignItems: 'center',
      gap: t.bosluk.s,
      marginBottom: t.bosluk.l,
    },
    logo: {
      width: 72,
      height: 72,
      borderRadius: t.yaricap.l,
      backgroundColor: t.renkler.ana,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: t.bosluk.s,
    },
    ayrac: {
      width: 40,
      height: 3,
      borderRadius: t.yaricap.tam,
      backgroundColor: t.renkler.vurgu,
    },
    baslik: {
      ...t.yazi.baslik,
    },
    altBaslik: {
      ...t.yazi.kucuk,
    },
    ortali: {
      textAlign: 'center',
    },
  });
}
