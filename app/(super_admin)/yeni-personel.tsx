// Erişim: yalnızca super_admin. Bir kuruma yönetici davet eder (süper admin öğretmen davet
// edemez; onu kurumun kendi yöneticisi yapar).
import { Stack, useLocalSearchParams } from 'expo-router';

import { Ekran } from '@/components/Ekran';
import { PersonelDavetFormu } from '@/components/PersonelDavetFormu';

export default function YeniYonetici() {
  const { kurumId } = useLocalSearchParams<{ kurumId: string }>();

  return (
    <Ekran kaydirilabilir>
      <Stack.Screen options={{ title: 'Yönetici Ekle' }} />
      <PersonelDavetFormu kurumId={kurumId} roller={['kurum_admin']} />
    </Ekran>
  );
}
