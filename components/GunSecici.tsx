// Haftanın günleri için çoklu seçim (Pzt ... Paz). Değerler ISO gün numarasıdır (1 = Pzt ... 7 = Paz).
// Görsel olarak Chip üzerine kurulu; bkz. components/Chip.tsx.
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { GUN_ADLARI, GUN_KISA_ADLARI } from '@/lib/tarih';
import { type Tema, useTema } from '@/lib/tema';

type Props = {
  etiket: string;
  secililer: number[];
  onDegis: (secililer: number[]) => void;
  pasif?: boolean;
};

export function GunSecici({ etiket, secililer, onDegis, pasif = false }: Props) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const degistir = (gun: number) =>
    onDegis(secililer.includes(gun) ? secililer.filter((g) => g !== gun) : [...secililer, gun].sort((a, b) => a - b));

  return (
    <View style={styles.kapsayici}>
      <Text style={styles.etiket}>{etiket}</Text>
      <View style={styles.satir}>
        {GUN_KISA_ADLARI.map((kisaAd, i) => {
          const gun = i + 1;
          return (
            <Chip
              key={gun}
              rol="checkbox"
              etiket={kisaAd}
              accessibilityLabel={GUN_ADLARI[i]}
              secili={secililer.includes(gun)}
              onPress={() => degistir(gun)}
              pasif={pasif}
              esitGenislik
            />
          );
        })}
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
      gap: t.bosluk.xs,
    },
  });
}
