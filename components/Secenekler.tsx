// Yan yana tek seçimli seçenekler (ör. rol seçimi).
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { bosluk, dokunmaAlani, renkler, yaricap, yazi } from '@/lib/tema';

type Props<T extends string> = {
  etiket: string;
  secenekler: { deger: T; etiket: string }[];
  secili: T;
  onSec: (deger: T) => void;
  pasif?: boolean;
};

export function Secenekler<T extends string>({ etiket, secenekler, secili, onSec, pasif = false }: Props<T>) {
  return (
    <View style={styles.kapsayici}>
      <Text style={yazi.etiket}>{etiket}</Text>
      <View style={styles.satir}>
        {secenekler.map((s) => {
          const seciliMi = s.deger === secili;
          return (
            <Pressable
              key={s.deger}
              accessibilityRole="radio"
              accessibilityState={{ selected: seciliMi, disabled: pasif }}
              disabled={pasif}
              onPress={() => onSec(s.deger)}
              style={[styles.secenek, seciliMi && styles.secili]}
            >
              <Text style={[styles.metin, seciliMi && styles.seciliMetin]}>{s.etiket}</Text>
            </Pressable>
          );
        })}
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
  secenek: {
    flex: 1,
    minHeight: dokunmaAlani.normal,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: renkler.kenarlik,
    borderRadius: yaricap.m,
    backgroundColor: renkler.yuzey,
  },
  secili: {
    backgroundColor: renkler.ana,
    borderColor: renkler.ana,
  },
  metin: {
    ...yazi.govde,
    fontWeight: '600',
    color: renkler.metinIkincil,
  },
  seciliMetin: {
    color: renkler.anaUstu,
  },
});
