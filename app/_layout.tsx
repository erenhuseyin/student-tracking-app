import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  useFonts,
} from '@expo-google-fonts/manrope';
import * as SplashScreen from 'expo-splash-screen';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useBildirimYonlendirme, usePushBildirimKaydi } from '@/lib/bildirimler';
import { rolYolu } from '@/lib/menu';
import { OturumSaglayici, useOturum } from '@/lib/oturum';
import { TemaTercihiSaglayici } from '@/lib/temaTercihi';
import { ToastSaglayici } from '@/lib/toast';
import { useTema } from '@/lib/tema';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Zaten gizlenmişse hata görmezden gelinir.
});

function Yonlendirici() {
  usePushBildirimKaydi();
  useBildirimYonlendirme();
  const tema = useTema();
  const { durum, kullanici } = useOturum();
  const rol = durum === 'hazir' ? kullanici?.rol : undefined;
  // lib/tema.ts > yaziTipi bu dört ağırlığa fontFamily ile referans verir; yüklenene kadar
  // splash ekranı açık kalır (aşağıdaki efekt `durum` yerine bunu da bekler).
  const [fontlarHazir] = useFonts({ Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold });

  useEffect(() => {
    if (durum !== 'yukleniyor' && fontlarHazir) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [durum, fontlarHazir]);

  // Web'de sayfa doğrudan bir adresle açılınca (ya da yenilenince) o adres, rol belli olduktan sonra
  // kullanıcının kendi rol grubunda yeniden açılır: aynı adres birden çok rol grubunda bulunduğu için
  // Router ilk yüklemede başka rolün ekranına çözüp ana ekrana dönebiliyor (bkz. lib/menu.ts > rolYolu).
  const router = useRouter();
  const ilkYol = useRef(
    Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.pathname + window.location.search : null,
  );
  useEffect(() => {
    if (durum === 'yukleniyor' || !fontlarHazir) return;
    const yol = ilkYol.current;
    ilkYol.current = null;
    // Oturum yokken açılan adres (giriş ekranı vb.) girişten sonra yeniden açılmaz.
    if (!rol || !yol || yol === '/') return;
    // Router'ın kendi ilk yönlendirmesi bittikten sonra.
    const zamanlayici = setTimeout(() => router.replace(rolYolu(rol, yol)), 0);
    return () => clearTimeout(zamanlayici);
  }, [durum, rol, fontlarHazir, router]);

  if (!fontlarHazir) return null;

  return (
    <>
      <StatusBar style={tema.mod === 'karanlik' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{ contentStyle: { backgroundColor: tema.renkler.zemin } }}
      >
        <Stack.Protected guard={durum === 'oturum_yok'}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={durum === 'profil_yok'}>
          <Stack.Screen name="profil-yok" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={durum === 'yanlis_uygulama'}>
          <Stack.Screen name="yanlis-uygulama" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={rol === 'super_admin'}>
          <Stack.Screen name="(super_admin)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={rol === 'kurum_admin'}>
          <Stack.Screen name="(kurum_admin)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={rol === 'ogretmen'}>
          <Stack.Screen name="(ogretmen)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={rol === 'veli'}>
          <Stack.Screen name="(veli)" options={{ headerShown: false }} />
        </Stack.Protected>
        {/* `durum !== 'yukleniyor'` şart: guard'sız (ya da `__DEV__` gibi durumdan bağımsız sabit
            doğru) bir ekran, `durum` henüz çözülmeden (tüm guard'lar geçici olarak yanlışken)
            Router'ın ilk derin bağlantı çözümlemesini kaçırıp buraya düşürüyor — herhangi bir
            route'a (ör. /login) gidilince bunun yerine bu ekran açılıyordu. Yalnızca oturum
            durumu netleşince (hangi durum olursa olsun) kullanılabilir olması bunu engeller. */}
        <Stack.Protected guard={__DEV__ && durum !== 'yukleniyor'}>
          <Stack.Screen name="bilesen-vitrini" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <TemaTercihiSaglayici>
      <OturumSaglayici>
        <ToastSaglayici>
          <Yonlendirici />
        </ToastSaglayici>
      </OturumSaglayici>
    </TemaTercihiSaglayici>
  );
}
