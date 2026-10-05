// 4 kutulu PIN girdisi. Rakamlar görünmez bir TextInput'a yazılır, kutular yalnızca kaç hane
// girildiğini gösterir (PIN ekranda okunmaz).
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { bosluk, dokunmaAlani, renkler, yaricap, yazi } from '@/lib/tema';

const HANE_SAYISI = 4;

type Props = {
  etiket: string;
  deger: string;
  onDegis: (deger: string) => void;
  pasif?: boolean;
  onTamamla?: () => void;
};

export function PinGirdisi({ etiket, deger, onDegis, pasif = false, onTamamla }: Props) {
  const [odakta, setOdakta] = useState(false);

  return (
    <View style={styles.kapsayici}>
      <Text style={yazi.etiket}>{etiket}</Text>
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

const styles = StyleSheet.create({
  kapsayici: {
    gap: bosluk.xs,
  },
  kutular: {
    flexDirection: 'row',
    gap: bosluk.m,
  },
  kutu: {
    flex: 1,
    height: dokunmaAlani.buyuk,
    backgroundColor: renkler.yuzey,
    borderWidth: 1,
    borderColor: renkler.kenarlik,
    borderRadius: yaricap.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kutuOdakta: {
    borderColor: renkler.ana,
  },
  nokta: {
    width: 12,
    height: 12,
    borderRadius: yaricap.tam,
    backgroundColor: renkler.metin,
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
