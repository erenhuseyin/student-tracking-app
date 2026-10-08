import { Stack } from 'expo-router';

import { useBolumAcik } from '@/lib/menu';
import { useTema } from '@/lib/tema';

export default function Layout() {
  const tema = useTema();
  // Kurumun öğretmenler için kapattığı bölümün ekranları adresle de açılamaz (bkz. kapali_bolum).
  const yoklamaAcik = useBolumAcik('yoklama');
  const gelisimAcik = useBolumAcik('gelisim');
  return (
    <Stack screenOptions={tema.baslikCubuguSecenekleri}>
      {/* Sekmelerin başlık çubuğu kendi içindedir (components/RolSekmeleri). */}
      <Stack.Screen name="(sekmeler)" options={{ headerShown: false }} />
      <Stack.Protected guard={yoklamaAcik}>
        <Stack.Screen name="yoklama/[sinifId]" />
        <Stack.Screen name="haftalik-yoklama/[sinifId]" />
        <Stack.Screen name="ders-gunleri/[sinifId]" />
      </Stack.Protected>
      <Stack.Protected guard={gelisimAcik}>
        <Stack.Screen name="ogrenci-gelisim/[ogrenciId]" />
        <Stack.Screen name="yeni-gelisim-kaydi" />
        <Stack.Screen name="gelisim-kaydi-duzenle/[id]" />
      </Stack.Protected>
    </Stack>
  );
}
