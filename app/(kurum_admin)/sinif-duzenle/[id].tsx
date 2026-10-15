// Erişim: yalnızca kurum_admin
import { Stack, useLocalSearchParams } from 'expo-router';

import { Ekran } from '@/components/Ekran';
import { SinifFormu } from '@/components/SinifFormu';

export default function SinifDuzenle() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Ekran kaydirilabilir>
      <Stack.Screen options={{ title: 'Sınıfı Düzenle' }} />
      <SinifFormu id={id} silinebilir />
    </Ekran>
  );
}
