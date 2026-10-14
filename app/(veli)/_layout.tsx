import { Stack } from 'expo-router';

import { useStackSecenekleri, WebKabuk } from '@/components/WebKabuk';
import { useBolumAcik } from '@/lib/menu';
import { useOturum } from '@/lib/oturum';

export default function Layout() {
  const secenekler = useStackSecenekleri();
  const { kullanici } = useOturum();
  // Başlangıç PIN'iyle açılmış ya da PIN'i sıfırlanmış hesap: yeni PIN belirlenene kadar yalnızca
  // PIN değiştirme ekranı açıktır (bkz. supabase/functions/veli-giris, veli-pin-degistir).
  const pinZorunlu = kullanici?.pin_degistirilmeli === true;
  const duyurularAcik = useBolumAcik('duyurular');
  return (
    <WebKabuk kenarsiz={pinZorunlu}>
      <Stack screenOptions={secenekler}>
        <Stack.Protected guard={!pinZorunlu}>
          {/* Sekmelerin başlık çubuğu kendi içindedir (components/RolSekmeleri). */}
          <Stack.Screen name="(sekmeler)" options={{ headerShown: false }} />
          <Stack.Screen name="cocuk/[ogrenciId]" />
          <Stack.Screen name="profil" />
          <Stack.Screen name="kardes-ekle" />
          <Stack.Screen name="bildirimler" />
          <Stack.Screen name="devamsizlik-bildir" />
          <Stack.Screen name="oneri" />
        </Stack.Protected>
        <Stack.Protected guard={!pinZorunlu && duyurularAcik}>
          <Stack.Screen name="takvim" />
        </Stack.Protected>
        <Stack.Screen name="pin-degistir" />
      </Stack>
    </WebKabuk>
  );
}
