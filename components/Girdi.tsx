import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { type Tema, useTema } from '@/lib/tema';

type Props = TextInputProps & {
  etiket: string;
  hata?: string | null;
  // Veli ekranları gibi büyük dokunma alanı gereken yerler için.
  buyuk?: boolean;
};

export function Girdi({ etiket, hata, buyuk = false, style, editable = true, ...digerleri }: Props) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const [odakta, setOdakta] = useState(false);

  return (
    <View style={styles.kapsayici}>
      <Text style={styles.etiket}>{etiket}</Text>
      <TextInput
        accessibilityLabel={etiket}
        placeholderTextColor={tema.renkler.kenarlik}
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

function olustur(t: Tema) {
  return StyleSheet.create({
    kapsayici: {
      gap: t.bosluk.xs,
    },
    etiket: {
      ...t.yazi.etiket,
    },
    girdi: {
      ...t.yazi.govde,
      minHeight: t.dokunmaAlani.normal,
      backgroundColor: t.renkler.yuzey,
      color: t.renkler.metin,
      borderWidth: 1,
      borderColor: t.renkler.kenarlik,
      borderRadius: t.yaricap.m,
      paddingHorizontal: t.bosluk.l,
      paddingVertical: t.duzen === 'web' ? t.bosluk.s : t.bosluk.m,
      // Web'de tarayıcının odak çerçevesi yerine kenarlık rengi değişir (bkz. `odakta`).
      outlineWidth: 0,
    },
    buyuk: {
      minHeight: t.dokunmaAlani.buyuk,
      fontSize: 20,
    },
    odakta: {
      borderColor: t.renkler.ana,
    },
    hatali: {
      borderColor: t.renkler.hata,
    },
    pasif: {
      backgroundColor: t.renkler.ayirici,
      color: t.renkler.metinIkincil,
    },
    hataMetni: {
      ...t.yazi.kucuk,
      color: t.renkler.hata,
    },
  });
}
