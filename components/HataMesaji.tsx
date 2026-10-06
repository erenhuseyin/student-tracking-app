import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Ikon } from '@/components/Ikon';
import { type Tema, useTema } from '@/lib/tema';

type Props = {
  mesaj: string | null | undefined;
  // Başarı bildirimi için aynı kutu yeşil gösterilir.
  tur?: 'hata' | 'basari';
};

export function HataMesaji({ mesaj, tur = 'hata' }: Props) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  if (!mesaj) return null;
  const basari = tur === 'basari';
  const renk = basari ? tema.renkler.basari : tema.renkler.hata;

  return (
    <View
      accessibilityRole="alert"
      style={[styles.kutu, { backgroundColor: basari ? tema.renkler.basariSoluk : tema.renkler.hataSoluk }]}
    >
      <Ikon ad={basari ? 'checkmark-circle' : 'alert-circle'} boyut={20} renk={renk} />
      <Text style={[styles.metin, { color: renk }]}>{mesaj}</Text>
    </View>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    kutu: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.s,
      padding: t.bosluk.m,
      borderRadius: t.yaricap.m,
    },
    metin: {
      ...t.yazi.govde,
      flex: 1,
    },
  });
}
