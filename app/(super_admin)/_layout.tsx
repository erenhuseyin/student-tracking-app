import { Stack } from 'expo-router';

import { useStackSecenekleri, WebKabuk } from '@/components/WebKabuk';

export default function Layout() {
  const secenekler = useStackSecenekleri();
  return (
    <WebKabuk>
      <Stack screenOptions={secenekler}>
        {/* Sekmelerin başlık çubuğu kendi içindedir (components/RolSekmeleri). */}
        <Stack.Screen name="(sekmeler)" options={{ headerShown: false }} />
      </Stack>
    </WebKabuk>
  );
}
