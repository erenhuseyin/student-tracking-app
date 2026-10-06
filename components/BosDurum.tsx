// Boş liste ve durum ekranları (hesap bulunamadı vb.) için ortalanmış ikon + açıklama.
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Ikon, type IkonAdi } from '@/components/Ikon';
import { type Tema, useTema } from '@/lib/tema';

type Props = {
  ikon: IkonAdi;
  baslik: string;
  aciklama?: string;
  children?: ReactNode;
};

export function BosDurum({ ikon, baslik, aciklama, children }: Props) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  return (
    <View style={styles.kapsayici}>
      <View style={styles.ikonZemini}>
        <Ikon ad={ikon} boyut={32} renk={tema.renkler.anaParlak} />
      </View>
      <Text style={[styles.baslik, styles.ortali]}>{baslik}</Text>
      {aciklama ? <Text style={[styles.aciklama, styles.ortali]}>{aciklama}</Text> : null}
      {children}
    </View>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    kapsayici: {
      alignItems: 'center',
      gap: t.bosluk.m,
      paddingVertical: t.bosluk.xxl,
      paddingHorizontal: t.bosluk.l,
    },
    ikonZemini: {
      width: 72,
      height: 72,
      borderRadius: t.yaricap.tam,
      backgroundColor: t.renkler.anaSoluk,
      alignItems: 'center',
      justifyContent: 'center',
    },
    baslik: {
      ...t.yazi.bolum,
    },
    aciklama: {
      ...t.yazi.kucuk,
    },
    ortali: {
      textAlign: 'center',
    },
  });
}
