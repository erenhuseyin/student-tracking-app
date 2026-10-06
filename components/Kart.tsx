import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { type Tema, useTema } from '@/lib/tema';

export function Kart({ children, stil }: { children: ReactNode; stil?: ViewStyle }) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  return <View style={[styles.kart, stil]}>{children}</View>;
}

function olustur(t: Tema) {
  return StyleSheet.create({
    kart: {
      backgroundColor: t.renkler.yuzey,
      borderRadius: t.yaricap.l,
      padding: t.bosluk.l,
      gap: t.bosluk.m,
      borderWidth: 1,
      borderColor: t.renkler.ayirici,
    },
  });
}
