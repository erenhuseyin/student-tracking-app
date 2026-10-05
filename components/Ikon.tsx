// Uygulamanın tek ikon seti (Ionicons). Ekranlar ikon paketini doğrudan değil buradan kullanır.
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import { renkler } from '@/lib/tema';

export type IkonAdi = ComponentProps<typeof Ionicons>['name'];

export function Ikon({ ad, boyut = 22, renk = renkler.metinIkincil }: { ad: IkonAdi; boyut?: number; renk?: string }) {
  return <Ionicons name={ad} size={boyut} color={renk} />;
}
