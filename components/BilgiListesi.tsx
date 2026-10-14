// Salt okunur etiket – değer satırları (detay ekranlarının kimlik kartı). Web'de etiket solda sabit
// genişlikte, telefonda etiket değerin üstündedir. Boş değer "—" yazılır.
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { type Tema, useTema } from '@/lib/tema';

export type BilgiSatiri = { etiket: string; deger: string | null | undefined };

export function BilgiListesi({ satirlar }: { satirlar: BilgiSatiri[] }) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  return (
    <View style={styles.liste}>
      {satirlar.map((s) => (
        <View key={s.etiket} style={styles.satir}>
          <Text style={styles.etiket}>{s.etiket}</Text>
          <Text style={styles.deger} selectable>
            {s.deger || '—'}
          </Text>
        </View>
      ))}
    </View>
  );
}

function olustur(t: Tema) {
  const web = t.duzen === 'web';
  return StyleSheet.create({
    liste: {
      gap: web ? t.bosluk.s : t.bosluk.m,
    },
    satir: {
      flexDirection: web ? 'row' : 'column',
      gap: web ? t.bosluk.l : 2,
    },
    etiket: {
      ...t.yazi.kucuk,
      width: web ? 160 : undefined,
    },
    deger: {
      ...t.yazi.govde,
      flexShrink: 1,
    },
  });
}
