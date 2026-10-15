// Erişim: yalnızca ogretmen (sınıfının öğrencisi, ogretmen_kayit bayrağı açıksa). Bilgiler, veli
// girişini açma, pasife alma / geri açma; silme ve PIN sıfırlama yöneticidedir (form gizler).
import { Stack, useLocalSearchParams } from 'expo-router';

import { Ekran } from '@/components/Ekran';
import { OgrenciFormu } from '@/components/OgrenciFormu';

export default function OgrenciDuzenle() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Ekran kaydirilabilir>
      <Stack.Screen options={{ title: 'Öğrenci Bilgileri' }} />
      <OgrenciFormu id={id} />
    </Ekran>
  );
}
