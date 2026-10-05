import { StyleSheet, Text, View } from 'react-native';

import { Ikon } from '@/components/Ikon';
import { bosluk, renkler, yaricap } from '@/lib/tema';

type Props = {
  mesaj: string | null | undefined;
  // Başarı bildirimi için aynı kutu yeşil gösterilir.
  tur?: 'hata' | 'basari';
};

export function HataMesaji({ mesaj, tur = 'hata' }: Props) {
  if (!mesaj) return null;
  const basari = tur === 'basari';
  const renk = basari ? renkler.basari : renkler.hata;

  return (
    <View
      accessibilityRole="alert"
      style={[styles.kutu, { backgroundColor: basari ? renkler.basariSoluk : renkler.hataSoluk }]}
    >
      <Ikon ad={basari ? 'checkmark-circle' : 'alert-circle'} boyut={20} renk={renk} />
      <Text style={[styles.metin, { color: renk }]}>{mesaj}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kutu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: bosluk.s,
    padding: bosluk.m,
    borderRadius: yaricap.m,
  },
  metin: {
    flex: 1,
    fontSize: 14,
  },
});
