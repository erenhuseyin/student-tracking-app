// Gelişim kategorisi seçimi: alt satıra kayan çipler. Kategorileri kurum tanımladığı için
// sayısı ve ad uzunluğu belirsizdir; bu yüzden eşit genişlikli `Secenekler` kullanılmadı.
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { bosluk, dokunmaAlani, renkler, yaricap, yazi } from '@/lib/tema';
import type { GelisimKategorisi } from '@/lib/tipler';

type Props = {
  etiket: string;
  kategoriler: GelisimKategorisi[];
  seciliId: string | null;
  onSec: (id: string) => void;
  pasif?: boolean;
};

export function KategoriSecici({ etiket, kategoriler, seciliId, onSec, pasif = false }: Props) {
  return (
    <View style={styles.kapsayici}>
      <Text style={yazi.etiket}>{etiket}</Text>
      <View style={styles.cipler}>
        {kategoriler.map((k) => {
          const secili = k.id === seciliId;
          return (
            <Pressable
              key={k.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: secili, disabled: pasif }}
              disabled={pasif}
              onPress={() => onSec(k.id)}
              style={[styles.cip, secili && styles.secili]}
            >
              <Text style={[styles.metin, secili && styles.seciliMetin]}>{k.ad}</Text>
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
  cipler: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: bosluk.s,
  },
  cip: {
    minHeight: dokunmaAlani.normal,
    justifyContent: 'center',
    paddingHorizontal: bosluk.l,
    borderWidth: 1,
    borderColor: renkler.kenarlik,
    borderRadius: yaricap.tam,
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
