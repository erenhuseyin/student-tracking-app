// Haftanın günleri için çoklu seçim (Pzt ... Paz). Değerler ISO gün numarasıdır (1 = Pzt ... 7 = Paz).
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GUN_ADLARI, GUN_KISA_ADLARI } from '@/lib/tarih';
import { bosluk, dokunmaAlani, renkler, yaricap, yazi } from '@/lib/tema';

type Props = {
  etiket: string;
  secililer: number[];
  onDegis: (secililer: number[]) => void;
  pasif?: boolean;
};

export function GunSecici({ etiket, secililer, onDegis, pasif = false }: Props) {
  const degistir = (gun: number) =>
    onDegis(secililer.includes(gun) ? secililer.filter((g) => g !== gun) : [...secililer, gun].sort((a, b) => a - b));

  return (
    <View style={styles.kapsayici}>
      <Text style={yazi.etiket}>{etiket}</Text>
      <View style={styles.satir}>
        {GUN_KISA_ADLARI.map((kisaAd, i) => {
          const gun = i + 1;
          const secili = secililer.includes(gun);
          return (
            <Pressable
              key={gun}
              accessibilityRole="checkbox"
              accessibilityLabel={GUN_ADLARI[i]}
              accessibilityState={{ checked: secili, disabled: pasif }}
              disabled={pasif}
              onPress={() => degistir(gun)}
              style={[styles.gun, secili && styles.secili]}
            >
              <Text style={[styles.metin, secili && styles.seciliMetin]}>{kisaAd}</Text>
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
    gap: bosluk.xs,
  },
  gun: {
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
    fontSize: 14,
    fontWeight: '600',
    color: renkler.metinIkincil,
  },
  seciliMetin: {
    color: renkler.anaUstu,
  },
});
