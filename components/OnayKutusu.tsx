// Onay kutulu satır (çoklu seçim; ör. öğretmenin sınıfları).
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { Ikon } from '@/components/Ikon';
import { bosluk, dokunmaAlani, renkler, yazi } from '@/lib/tema';

type Props = {
  etiket: string;
  secili: boolean;
  onDegis: (secili: boolean) => void;
  pasif?: boolean;
  calisiyor?: boolean;
};

export function OnayKutusu({ etiket, secili, onDegis, pasif = false, calisiyor = false }: Props) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: secili, disabled: pasif || calisiyor }}
      disabled={pasif || calisiyor}
      onPress={() => onDegis(!secili)}
      style={({ pressed }) => [styles.satir, pressed && styles.basili]}
    >
      {calisiyor ? (
        <ActivityIndicator size="small" color={renkler.ana} style={styles.gosterge} />
      ) : (
        <Ikon ad={secili ? 'checkbox' : 'square-outline'} boyut={24} renk={secili ? renkler.ana : renkler.kenarlik} />
      )}
      <Text style={[yazi.govde, styles.etiket]}>{etiket}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: bosluk.m,
    minHeight: dokunmaAlani.normal,
  },
  basili: {
    opacity: 0.6,
  },
  gosterge: {
    width: 24,
  },
  etiket: {
    flex: 1,
  },
});
