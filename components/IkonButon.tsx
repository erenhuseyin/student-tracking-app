// Yalnızca ikondan oluşan buton (satır eylemleri, başlık çubuğu). Ekran okuyucu için `etiket` zorunlu.
import { Pressable, StyleSheet } from 'react-native';

import { Ikon, type IkonAdi } from '@/components/Ikon';
import { dokunmaAlani, renkler, yaricap } from '@/lib/tema';

type Props = {
  ikon: IkonAdi;
  etiket: string;
  onPress: () => void;
  renk?: string;
};

export function IkonButon({ ikon, etiket, onPress, renk = renkler.ana }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiket}
      onPress={onPress}
      style={({ pressed }) => [styles.buton, pressed && styles.basili]}
    >
      <Ikon ad={ikon} renk={renk} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  buton: {
    width: dokunmaAlani.normal,
    height: dokunmaAlani.normal,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: yaricap.tam,
  },
  basili: {
    backgroundColor: renkler.ayirici,
  },
});
