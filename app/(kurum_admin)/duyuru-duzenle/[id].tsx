// Erişim: yalnızca kurum_admin. Yönettiği kurumlara kurum geneli ya da sınıfa özel duyuru yazar.
import { useLocalSearchParams } from 'expo-router';

import { DuyuruDuzenleEkrani } from '@/components/DuyuruDuzenleEkrani';

export default function DuyuruDuzenle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DuyuruDuzenleEkrani id={id} />;
}
