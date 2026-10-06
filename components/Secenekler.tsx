// Yan yana tek seçimli segment (ör. rol seçimi, Tablo/Katılım listesi görünüm değiştirici).
// Görsel olarak Chip üzerine kurulu; bkz. components/Chip.tsx.
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { type Tema, useTema } from '@/lib/tema';

type Props<T extends string> = {
  // Verilmezse yalnızca seçenek satırı çizilir (ör. ekran içi görünüm değiştirici).
  etiket?: string;
  secenekler: { deger: T; etiket: string }[];
  secili: T;
  onSec: (deger: T) => void;
  pasif?: boolean;
};

export function Secenekler<T extends string>({ etiket, secenekler, secili, onSec, pasif = false }: Props<T>) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  return (
    <View style={styles.kapsayici}>
      {etiket ? <Text style={styles.etiket}>{etiket}</Text> : null}
      <View style={styles.satir}>
        {secenekler.map((s) => (
          <Chip
            key={s.deger}
            etiket={s.etiket}
            secili={s.deger === secili}
            onPress={() => onSec(s.deger)}
            pasif={pasif}
            esitGenislik
          />
        ))}
      </View>
    </View>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    kapsayici: {
      gap: t.bosluk.xs,
    },
    etiket: {
      ...t.yazi.etiket,
    },
    satir: {
      flexDirection: 'row',
      gap: t.bosluk.s,
    },
  });
}
