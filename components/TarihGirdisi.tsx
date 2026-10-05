// Gün / Ay / Yıl olarak üç alanlı tarih girdisi; dışarıya YYYY-AA-GG verir (eksikse olduğu
// kadarını, hepsi boşsa ''). Native tarih seçici bilerek kullanılmadı: yeni build gerektirir
// ve web'de çalışmaz. Başlangıç değeri yalnızca ilk çizimde okunur.
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { bosluk, dokunmaAlani, renkler, yaricap, yazi } from '@/lib/tema';

type Props = {
  etiket: string;
  deger: string;
  onDegis: (deger: string) => void;
  pasif?: boolean;
};

type Parcalar = { gun: string; ay: string; yil: string };

function parcala(deger: string): Parcalar {
  const [yil = '', ay = '', gun = ''] = deger.split('-');
  return { gun, ay, yil };
}

function birlestir({ gun, ay, yil }: Parcalar): string {
  if (!gun && !ay && !yil) return '';
  return `${yil}-${ay.padStart(2, '0')}-${gun.padStart(2, '0')}`;
}

export function TarihGirdisi({ etiket, deger, onDegis, pasif = false }: Props) {
  const [parcalar, setParcalar] = useState(() => parcala(deger));

  const guncelle = (alan: keyof Parcalar, metin: string) => {
    const yeni = { ...parcalar, [alan]: metin.replace(/\D/g, '') };
    setParcalar(yeni);
    onDegis(birlestir(yeni));
  };

  return (
    <View style={styles.kapsayici}>
      <Text style={yazi.etiket}>{etiket}</Text>
      <View style={styles.satir}>
        <TextInput
          accessibilityLabel={`${etiket}, gün`}
          style={styles.girdi}
          placeholder="Gün"
          placeholderTextColor={renkler.kenarlik}
          keyboardType="number-pad"
          maxLength={2}
          value={parcalar.gun}
          onChangeText={(m) => guncelle('gun', m)}
          editable={!pasif}
        />
        <TextInput
          accessibilityLabel={`${etiket}, ay`}
          style={styles.girdi}
          placeholder="Ay"
          placeholderTextColor={renkler.kenarlik}
          keyboardType="number-pad"
          maxLength={2}
          value={parcalar.ay}
          onChangeText={(m) => guncelle('ay', m)}
          editable={!pasif}
        />
        <TextInput
          accessibilityLabel={`${etiket}, yıl`}
          style={[styles.girdi, styles.yil]}
          placeholder="Yıl"
          placeholderTextColor={renkler.kenarlik}
          keyboardType="number-pad"
          maxLength={4}
          value={parcalar.yil}
          onChangeText={(m) => guncelle('yil', m)}
          editable={!pasif}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kapsayici: {
    gap: bosluk.xs,
  },
  satir: {
    flexDirection: 'row',
    gap: bosluk.s,
  },
  girdi: {
    ...yazi.govde,
    flex: 1,
    // Web'de <input> kendi iç genişliğinin altına inmez ve üç alan kartın dışına taşar.
    minWidth: 0,
    minHeight: dokunmaAlani.normal,
    backgroundColor: renkler.yuzey,
    borderWidth: 1,
    borderColor: renkler.kenarlik,
    borderRadius: yaricap.m,
    paddingHorizontal: bosluk.l,
    paddingVertical: bosluk.m,
    textAlign: 'center',
  },
  yil: {
    flex: 1.5,
  },
});
