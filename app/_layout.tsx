import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { OturumSaglayici, useOturum } from '@/lib/oturum';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Zaten gizlenmişse hata görmezden gelinir.
});

function Yonlendirici() {
  const { durum } = useOturum();

  useEffect(() => {
    if (durum !== 'yukleniyor') {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [durum]);

  return (
    <Stack>
      <Stack.Protected guard={durum === 'oturum_yok'}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={durum === 'hazir' || durum === 'profil_yok'}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <OturumSaglayici>
      <Yonlendirici />
    </OturumSaglayici>
  );
}
