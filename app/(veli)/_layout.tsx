import { Stack } from 'expo-router';

import { useOturum } from '@/lib/oturum';
import { useTema } from '@/lib/tema';

export default function Layout() {
  const tema = useTema();
  const { kullanici } = useOturum();
  // Başlangıç PIN'iyle açılmış ya da PIN'i sıfırlanmış hesap: yeni PIN belirlenene kadar yalnızca
  // PIN değiştirme ekranı açıktır (bkz. supabase/functions/veli-giris, veli-pin-degistir).
  const pinZorunlu = kullanici?.pin_degistirilmeli === true;
  return (
    <Stack screenOptions={tema.baslikCubuguSecenekleri}>
      <Stack.Protected guard={!pinZorunlu}>
        {/* Sekmelerin başlık çubuğu kendi içindedir (components/RolSekmeleri). */}
        <Stack.Screen name="(sekmeler)" options={{ headerShown: false }} />
        <Stack.Screen name="cocuk/[ogrenciId]" />
        <Stack.Screen name="profil" />
        <Stack.Screen name="kardes-ekle" />
        <Stack.Screen name="bildirimler" />
      </Stack.Protected>
      <Stack.Screen name="pin-degistir" />
    </Stack>
  );
}
