// Uygulamanın tek ikon seti (Ionicons). Ekranlar ikon paketini doğrudan değil buradan kullanır.
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import { useTema } from '@/lib/tema';

export type IkonAdi = ComponentProps<typeof Ionicons>['name'];

export function Ikon({ ad, boyut = 22, renk }: { ad: IkonAdi; boyut?: number; renk?: string }) {
  const tema = useTema();
  return <Ionicons name={ad} size={boyut} color={renk ?? tema.renkler.metinIkincil} />;
}
