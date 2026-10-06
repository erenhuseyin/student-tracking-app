// Yalnızca ikondan oluşan buton (satır eylemleri, başlık çubuğu). Ekran okuyucu için `etiket` zorunlu.
import { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Ikon, type IkonAdi } from '@/components/Ikon';
import { type Tema, useTema } from '@/lib/tema';

type Props = {
  ikon: IkonAdi;
  etiket: string;
  onPress: () => void;
  renk?: string;
};

export function IkonButon({ ikon, etiket, onPress, renk }: Props) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiket}
      onPress={onPress}
      style={({ pressed }) => [styles.buton, pressed && styles.basili]}
    >
      <Ikon ad={ikon} renk={renk ?? tema.renkler.ana} />
    </Pressable>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    buton: {
      width: t.dokunmaAlani.normal,
      height: t.dokunmaAlani.normal,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: t.yaricap.tam,
    },
    basili: {
      backgroundColor: t.renkler.ayirici,
    },
  });
}
