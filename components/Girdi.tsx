import { useState } from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { bosluk, dokunmaAlani, renkler, yaricap, yazi } from '@/lib/tema';

type Props = TextInputProps & {
  etiket: string;
  hata?: string | null;
  // Veli ekranları gibi büyük dokunma alanı gereken yerler için.
  buyuk?: boolean;
};

export function Girdi({ etiket, hata, buyuk = false, style, editable = true, ...digerleri }: Props) {
  const [odakta, setOdakta] = useState(false);

  return (
    <View style={styles.kapsayici}>
      <Text style={yazi.etiket}>{etiket}</Text>
      <TextInput
        accessibilityLabel={etiket}
        placeholderTextColor={renkler.kenarlik}
        editable={editable}
        {...digerleri}
        onFocus={(e) => {
          setOdakta(true);
          digerleri.onFocus?.(e);
        }}
        onBlur={(e) => {
          setOdakta(false);
          digerleri.onBlur?.(e);
        }}
        style={[
          styles.girdi,
          buyuk && styles.buyuk,
          odakta && styles.odakta,
          hata ? styles.hatali : null,
          !editable && styles.pasif,
          style,
        ]}
      />
      {hata ? <Text style={styles.hataMetni}>{hata}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  kapsayici: {
    gap: bosluk.xs,
  },
  girdi: {
    ...yazi.govde,
    minHeight: dokunmaAlani.normal,
    backgroundColor: renkler.yuzey,
    borderWidth: 1,
    borderColor: renkler.kenarlik,
    borderRadius: yaricap.m,
    paddingHorizontal: bosluk.l,
    paddingVertical: bosluk.m,
  },
  buyuk: {
    minHeight: dokunmaAlani.buyuk,
    fontSize: 20,
  },
  odakta: {
    borderColor: renkler.ana,
  },
  hatali: {
    borderColor: renkler.hata,
  },
  pasif: {
    backgroundColor: renkler.ayirici,
    color: renkler.metinIkincil,
  },
  hataMetni: {
    ...yazi.kucuk,
    color: renkler.hata,
  },
});
