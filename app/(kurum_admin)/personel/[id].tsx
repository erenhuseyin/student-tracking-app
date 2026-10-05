// Erişim: yalnızca kurum_admin (yönettiği kurumların personeli).
import { Stack, useLocalSearchParams } from 'expo-router';

import { Ekran } from '@/components/Ekran';
import { PersonelDetay } from '@/components/PersonelDetay';

export default function PersonelDuzenle() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Ekran kaydirilabilir>
      <Stack.Screen options={{ title: 'Personel' }} />
      <PersonelDetay id={id} />
    </Ekran>
  );
}
