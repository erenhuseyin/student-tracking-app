// Erişim: yalnızca ogretmen (atandığı sınıf, ogretmen_kayit bayrağı açıksa). Ad, dönem ve kademe
// değişir; sınıfı yalnızca yönetici silebilir.
import { Stack, useLocalSearchParams } from 'expo-router';

import { Ekran } from '@/components/Ekran';
import { SinifFormu } from '@/components/SinifFormu';

export default function SinifDuzenle() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Ekran kaydirilabilir>
      <Stack.Screen options={{ title: 'Sınıfı Düzenle' }} />
      <SinifFormu id={id} silinebilir={false} />
    </Ekran>
  );
}
