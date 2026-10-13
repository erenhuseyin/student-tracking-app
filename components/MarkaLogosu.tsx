// Markanın logosu (markalar/<kod>/logo.png; karanlık temada varsa logo-koyu.png). Logo yoksa hiçbir
// şey çizmez — çağıran yer marka adını ya da kendi işaretini gösterir.
import { Image } from 'react-native';

import { marka } from '@/lib/marka';
import { useTema } from '@/lib/tema';

export const markaLogosuVar = marka.logo !== undefined;

export function MarkaLogosu({ yukseklik }: { yukseklik: number }) {
  const tema = useTema();
  const logo = marka.logo;
  if (!logo) return null;
  return (
    <Image
      accessibilityLabel={marka.ad}
      source={{ uri: tema.mod === 'karanlik' ? (logo.koyuUri ?? logo.uri) : logo.uri }}
      style={{ height: yukseklik, width: (yukseklik * logo.en) / logo.boy }}
      resizeMode="contain"
    />
  );
}
