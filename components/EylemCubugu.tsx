// Bir detay ekranının eylem düğmeleri. 'web' düzeninde yan yana bir araç çubuğu (düğmeler içeriği
// kadar geniş), 'mobil' düzende alt alta, satırı dolduran düğmeler.
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTema } from '@/lib/tema';

export function EylemCubugu({ children }: { children: ReactNode }) {
  const tema = useTema();
  return (
    <View
      style={
        tema.duzen === 'web'
          ? { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: tema.bosluk.s }
          : { gap: tema.bosluk.m }
      }
    >
      {children}
    </View>
  );
}
