// Erişim: yalnızca kurum_admin. Öğretmen ya da yönetici davet eder; hedef kendi kurumu ya da
// (kök admin için) bir şubesidir — sunucu doğrular (supabase/functions/personel-yonet).
import { Stack, useLocalSearchParams } from 'expo-router';

import { Ekran } from '@/components/Ekran';
import { PersonelDavetFormu } from '@/components/PersonelDavetFormu';
import { useOturum } from '@/lib/oturum';

export default function YeniPersonel() {
  const { kurumId } = useLocalSearchParams<{ kurumId?: string }>();
  const { kurum } = useOturum();
  const hedefKurumId = kurumId ?? kurum?.id;

  return (
    <Ekran kaydirilabilir>
      <Stack.Screen options={{ title: 'Personel Ekle' }} />
      {hedefKurumId ? <PersonelDavetFormu kurumId={hedefKurumId} roller={['ogretmen', 'kurum_admin']} /> : null}
    </Ekran>
  );
}
