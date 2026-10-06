// Onay kutulu satır (çoklu seçim; ör. öğretmenin sınıfları).
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { Ikon } from '@/components/Ikon';
import { type Tema, useTema } from '@/lib/tema';

type Props = {
  etiket: string;
  secili: boolean;
  onDegis: (secili: boolean) => void;
  pasif?: boolean;
  calisiyor?: boolean;
};

export function OnayKutusu({ etiket, secili, onDegis, pasif = false, calisiyor = false }: Props) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: secili, disabled: pasif || calisiyor }}
      disabled={pasif || calisiyor}
      onPress={() => onDegis(!secili)}
      style={({ pressed }) => [styles.satir, pressed && styles.basili]}
    >
      {calisiyor ? (
        <ActivityIndicator size="small" color={tema.renkler.ana} style={styles.gosterge} />
      ) : (
        <Ikon
          ad={secili ? 'checkbox' : 'square-outline'}
          boyut={24}
          renk={secili ? tema.renkler.ana : tema.renkler.kenarlik}
        />
      )}
      <Text style={[styles.etiket, styles.esnek]}>{etiket}</Text>
    </Pressable>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    satir: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.m,
      minHeight: t.dokunmaAlani.normal,
    },
    basili: {
      opacity: 0.6,
    },
    gosterge: {
      width: 24,
    },
    etiket: {
      ...t.yazi.govde,
    },
    esnek: {
      flex: 1,
    },
  });
}
