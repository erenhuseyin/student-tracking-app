// Erişim: yalnızca kurum_admin
import { Stack, useLocalSearchParams } from 'expo-router';

import { Ekran } from '@/components/Ekran';
import { OgrenciFormu } from '@/components/OgrenciFormu';

export default function OgrenciDuzenle() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Ekran kaydirilabilir>
      <Stack.Screen options={{ title: 'Öğrenciyi Düzenle' }} />
      <OgrenciFormu id={id} />
    </Ekran>
  );
}
