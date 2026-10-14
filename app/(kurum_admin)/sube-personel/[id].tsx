// Erişim: kurum_admin, yalnızca kendi altındaki birimler için (RLS: başka daldaki birimin personeli
// okunamaz). Bir alt birimin yöneticilerini ve öğretmenlerini yönetir.
import { Stack, useLocalSearchParams } from 'expo-router';

import { Ekran } from '@/components/Ekran';
import { PersonelListesi } from '@/components/PersonelListesi';
import { useKurum } from '@/lib/useKurum';

export default function BirimPersoneli() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { kurum } = useKurum(id);

  return (
    <Ekran>
      <Stack.Screen options={{ title: kurum ? `${kurum.ad} · Personel` : 'Personel' }} />
      <PersonelListesi kurumId={id} detayRotasi="/personel-detay" />
    </Ekran>
  );
}
