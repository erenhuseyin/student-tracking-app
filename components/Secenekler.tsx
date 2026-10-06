// Yan yana tek seçimli segment (ör. rol seçimi, Tablo/Katılım listesi görünüm değiştirici).
// Görsel olarak Chip üzerine kurulu; bkz. components/Chip.tsx.
import { StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { bosluk, yazi } from '@/lib/tema';

type Props<T extends string> = {
  // Verilmezse yalnızca seçenek satırı çizilir (ör. ekran içi görünüm değiştirici).
  etiket?: string;
  secenekler: { deger: T; etiket: string }[];
  secili: T;
  onSec: (deger: T) => void;
  pasif?: boolean;
};

export function Secenekler<T extends string>({ etiket, secenekler, secili, onSec, pasif = false }: Props<T>) {
  return (
    <View style={styles.kapsayici}>
      {etiket ? <Text style={yazi.etiket}>{etiket}</Text> : null}
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

const styles = StyleSheet.create({
  kapsayici: {
    gap: bosluk.xs,
  },
  satir: {
    flexDirection: 'row',
    gap: bosluk.s,
  },
});
