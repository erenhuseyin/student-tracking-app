// 4 kutulu PIN girdisi. Rakamlar görünmez bir TextInput'a yazılır, kutular yalnızca kaç hane
// girildiğini gösterir (PIN ekranda okunmaz).
import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { type Tema, useTema } from '@/lib/tema';

const HANE_SAYISI = 4;

type Props = {
  etiket: string;
  deger: string;
  onDegis: (deger: string) => void;
  pasif?: boolean;
  onTamamla?: () => void;
};

export function PinGirdisi({ etiket, deger, onDegis, pasif = false, onTamamla }: Props) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const [odakta, setOdakta] = useState(false);

  return (
    <View style={styles.kapsayici}>
      <Text style={styles.etiket}>{etiket}</Text>
      <View style={styles.kutular}>
        {Array.from({ length: HANE_SAYISI }, (_, i) => (
          <View key={i} style={[styles.kutu, odakta && i === Math.min(deger.length, HANE_SAYISI - 1) && styles.kutuOdakta]}>
            {i < deger.length ? <View style={styles.nokta} /> : null}
          </View>
        ))}
        <TextInput
          accessibilityLabel={etiket}
          style={styles.gizliGirdi}
          caretHidden
          keyboardType="number-pad"
          maxLength={HANE_SAYISI}
          value={deger}
          onChangeText={(m) => onDegis(m.replace(/\D/g, ''))}
          editable={!pasif}
          onFocus={() => setOdakta(true)}
          onBlur={() => setOdakta(false)}
          onSubmitEditing={onTamamla}
        />
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
    kutular: {
      flexDirection: 'row',
      gap: t.bosluk.m,
    },
    kutu: {
      flex: 1,
      height: t.dokunmaAlani.buyuk,
      backgroundColor: t.renkler.yuzey,
      borderWidth: 1,
      borderColor: t.renkler.kenarlik,
      borderRadius: t.yaricap.m,
      alignItems: 'center',
      justifyContent: 'center',
    },
    kutuOdakta: {
      borderColor: t.renkler.ana,
    },
    nokta: {
      width: 12,
      height: 12,
      borderRadius: t.yaricap.tam,
      backgroundColor: t.renkler.metin,
    },
    gizliGirdi: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      color: 'transparent',
      // Web'de tarayıcının kendi odak çerçevesi kutuların üstüne binmesin.
      opacity: 0.01,
    },
  });
}
