// Gelişim kategorisi seçimi: alt satıra kayan çip bulutu. Kategorileri kurum tanımladığı için
// sayısı ve ad uzunluğu belirsizdir; bu yüzden eşit genişlikli segment yerine içeriğe göre
// boyutlanan çipler kullanılır. Görsel olarak Chip üzerine kurulu; bkz. components/Chip.tsx.
import { StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { bosluk, yazi } from '@/lib/tema';
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
        {kategoriler.map((k) => (
          <Chip key={k.id} etiket={k.ad} secili={k.id === seciliId} onPress={() => onSec(k.id)} pasif={pasif} />
        ))}
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
});
