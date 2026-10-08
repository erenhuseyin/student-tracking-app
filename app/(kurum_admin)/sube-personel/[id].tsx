// Erişim: yalnızca kök kurumun kurum_admin'i (RLS: şube admini başka kurumun personelini göremez).
// Bir şubenin yöneticisini ve öğretmenlerini yönetir.
import { Stack, useLocalSearchParams } from 'expo-router';

import { Ekran } from '@/components/Ekran';
import { PersonelListesi } from '@/components/PersonelListesi';

export default function SubePersoneli() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Ekran>
      <Stack.Screen options={{ title: 'Şube Personeli' }} />
      <PersonelListesi kurumId={id} />
    </Ekran>
  );
}
