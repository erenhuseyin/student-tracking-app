import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { bosluk, golge, renkler, yaricap } from '@/lib/tema';

export function Kart({ children, stil }: { children: ReactNode; stil?: ViewStyle }) {
  return <View style={[styles.kart, stil]}>{children}</View>;
}

const styles = StyleSheet.create({
  kart: {
    backgroundColor: renkler.yuzey,
    borderRadius: yaricap.l,
    padding: bosluk.l,
    gap: bosluk.m,
    ...golge,
  },
});
