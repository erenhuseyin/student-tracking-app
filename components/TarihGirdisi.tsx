// Gün / Ay / Yıl olarak üç alanlı tarih girdisi; dışarıya YYYY-AA-GG verir (eksikse olduğu
// kadarını, hepsi boşsa ''). Native tarih seçici bilerek kullanılmadı: yeni build gerektirir
// ve web'de çalışmaz. Başlangıç değeri yalnızca ilk çizimde okunur.
import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { type Tema, useTema } from '@/lib/tema';

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
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const [parcalar, setParcalar] = useState(() => parcala(deger));

  const guncelle = (alan: keyof Parcalar, metin: string) => {
    const yeni = { ...parcalar, [alan]: metin.replace(/\D/g, '') };
    setParcalar(yeni);
    onDegis(birlestir(yeni));
  };

  return (
    <View style={styles.kapsayici}>
      <Text style={styles.etiket}>{etiket}</Text>
      <View style={styles.satir}>
        <TextInput
          accessibilityLabel={`${etiket}, gün`}
          style={styles.girdi}
          placeholder="Gün"
          placeholderTextColor={tema.renkler.kenarlik}
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
          placeholderTextColor={tema.renkler.kenarlik}
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
          placeholderTextColor={tema.renkler.kenarlik}
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

function olustur(t: Tema) {
  return StyleSheet.create({
    kapsayici: {
      gap: t.bosluk.xs,
    },
    etiket: {
      ...t.yazi.etiket,
    },
    satir: {
      flexDirection: 'row',
      gap: t.bosluk.s,
    },
    girdi: {
      ...t.yazi.govde,
      flex: 1,
      // Web'de <input> kendi iç genişliğinin altına inmez ve üç alan kartın dışına taşar.
      minWidth: 0,
      minHeight: t.dokunmaAlani.normal,
      backgroundColor: t.renkler.yuzey,
      color: t.renkler.metin,
      borderWidth: 1,
      borderColor: t.renkler.kenarlik,
      borderRadius: t.yaricap.m,
      paddingHorizontal: t.bosluk.l,
      paddingVertical: t.bosluk.m,
      textAlign: 'center',
    },
    yil: {
      flex: 1.5,
    },
  });
}
