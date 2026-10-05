// Erişim: yalnızca kurum_admin. Kendi kurumunun sınıflarını yönetir; kurumu kök (müşteri)
// ise ayrıca şubelerine geçebilir.
import { Stack, useRouter } from 'expo-router';
import { Text } from 'react-native';

import { Buton } from '@/components/Buton';
import { CikisYapButonu } from '@/components/CikisYapButonu';
import { Ekran } from '@/components/Ekran';
import { SinifListesi } from '@/components/SinifListesi';
import { useOturum } from '@/lib/oturum';
import { yazi } from '@/lib/tema';

export default function KurumAdminAnaSayfa() {
  const router = useRouter();
  const { kurum } = useOturum();
  const kokKurumMu = kurum !== null && kurum.ust_kurum_id === null;

  return (
    <Ekran>
      <Stack.Screen options={{ title: 'Sınıflar', headerRight: () => <CikisYapButonu /> }} />

      {kurum ? <Text style={yazi.altBaslik}>{kurum.ad}</Text> : null}
      {kurum ? <SinifListesi kurumId={kurum.id} /> : null}

      {kokKurumMu ? (
        <Buton tur="ikincil" ikon="business-outline" baslik="Şubeler" onPress={() => router.push('/subeler')} />
      ) : null}
    </Ekran>
  );
}
