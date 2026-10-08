// Erişim: yalnızca ogretmen. Yalnızca atandığı sınıfa duyuru yazar; yalnızca kendi yazdığını düzenler.
import { useLocalSearchParams } from 'expo-router';

import { DuyuruDuzenleEkrani } from '@/components/DuyuruDuzenleEkrani';

export default function DuyuruDuzenle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DuyuruDuzenleEkrani id={id} />;
}
