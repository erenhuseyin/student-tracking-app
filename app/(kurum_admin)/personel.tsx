// Erişim: yalnızca kurum_admin. Kendi kurumunun, kök admin ise `kurumId` ile verilen şubesinin
// personelini yönetir (RLS: şube admini başka kurumun personelini göremez).
import { Stack, useLocalSearchParams } from 'expo-router';

import { Ekran } from '@/components/Ekran';
import { PersonelListesi } from '@/components/PersonelListesi';
import { useOturum } from '@/lib/oturum';

export default function Personel() {
  const { kurumId } = useLocalSearchParams<{ kurumId?: string }>();
  const { kurum } = useOturum();
  const hedefKurumId = kurumId ?? kurum?.id;

  return (
    <Ekran>
      <Stack.Screen options={{ title: 'Personel' }} />
      {hedefKurumId ? <PersonelListesi kurumId={hedefKurumId} /> : null}
    </Ekran>
  );
}
