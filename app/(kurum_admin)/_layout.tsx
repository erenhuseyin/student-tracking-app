import { Stack } from 'expo-router';

import { useBolumAcik } from '@/lib/menu';
import { useTema } from '@/lib/tema';

export default function Layout() {
  const tema = useTema();
  // Kişinin görevinde kapatılan menünün ekranları adresle de açılamaz (bkz. gorev.kapali_ogeler,
  // "Menü Yetkileri"). Bu yalnızca görünürlüktür; veriyi RLS korur.
  const ogrencilerAcik = useBolumAcik('ogrenciler');
  const altBirimlerAcik = useBolumAcik('subeler');
  const basvurularAcik = useBolumAcik('basvurular');
  const onerilerAcik = useBolumAcik('oneriler');
  const programAcik = useBolumAcik('kurum-programi');
  const kademelerAcik = useBolumAcik('kademeler');
  const raporlarAcik = useBolumAcik('raporlar');
  const rollerAcik = useBolumAcik('roller');
  const menuYetkileriAcik = useBolumAcik('menu-yetkileri');
  const kategorilerAcik = useBolumAcik('gelisim-kategorileri');
  return (
    <Stack screenOptions={tema.baslikCubuguSecenekleri}>
      {/* Sekmelerin başlık çubuğu kendi içindedir (components/RolSekmeleri). */}
      <Stack.Screen name="(sekmeler)" options={{ headerShown: false }} />
      <Stack.Protected guard={ogrencilerAcik}>
        <Stack.Screen name="ogrenciler" />
      </Stack.Protected>
      <Stack.Protected guard={altBirimlerAcik}>
        <Stack.Screen name="subeler" />
        <Stack.Screen name="sube/[id]" />
        <Stack.Screen name="yeni-sube" />
        <Stack.Screen name="sube-duzenle/[id]" />
        <Stack.Screen name="sube-personel/[id]" />
      </Stack.Protected>
      <Stack.Protected guard={basvurularAcik}>
        <Stack.Screen name="basvurular" />
        <Stack.Screen name="basvuru/[id]" />
      </Stack.Protected>
      <Stack.Protected guard={onerilerAcik}>
        <Stack.Screen name="oneriler" />
      </Stack.Protected>
      <Stack.Protected guard={programAcik}>
        <Stack.Screen name="kurum-programi" />
      </Stack.Protected>
      <Stack.Protected guard={kademelerAcik}>
        <Stack.Screen name="kademeler" />
        <Stack.Screen name="kademe/[id]" />
      </Stack.Protected>
      <Stack.Protected guard={raporlarAcik}>
        <Stack.Screen name="raporlar" />
      </Stack.Protected>
      <Stack.Protected guard={rollerAcik}>
        <Stack.Screen name="roller" />
      </Stack.Protected>
      <Stack.Protected guard={menuYetkileriAcik}>
        <Stack.Screen name="menu-yetkileri" />
      </Stack.Protected>
      <Stack.Protected guard={kategorilerAcik}>
        <Stack.Screen name="gelisim-kategorileri" />
      </Stack.Protected>
    </Stack>
  );
}
