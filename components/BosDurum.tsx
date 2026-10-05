// Boş liste ve durum ekranları (hesap bulunamadı vb.) için ortalanmış ikon + açıklama.
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Ikon, type IkonAdi } from '@/components/Ikon';
import { bosluk, renkler, yaricap, yazi } from '@/lib/tema';

type Props = {
  ikon: IkonAdi;
  baslik: string;
  aciklama?: string;
  children?: ReactNode;
};

export function BosDurum({ ikon, baslik, aciklama, children }: Props) {
  return (
    <View style={styles.kapsayici}>
      <View style={styles.ikonZemini}>
        <Ikon ad={ikon} boyut={32} renk={renkler.ana} />
      </View>
      <Text style={[yazi.altBaslik, styles.ortali]}>{baslik}</Text>
      {aciklama ? <Text style={[yazi.kucuk, styles.ortali]}>{aciklama}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  kapsayici: {
    alignItems: 'center',
    gap: bosluk.m,
    paddingVertical: bosluk.xxl,
    paddingHorizontal: bosluk.l,
  },
  ikonZemini: {
    width: 72,
    height: 72,
    borderRadius: yaricap.tam,
    backgroundColor: renkler.anaSoluk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ortali: {
    textAlign: 'center',
  },
});
