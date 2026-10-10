// Erişim: yalnızca ogretmen (atandığı sınıf; RLS). Sınıfın işlediği konuları işaretler.
import { useLocalSearchParams } from 'expo-router';

import { DersTakibiEkrani } from '@/components/DersTakibiEkrani';

export default function DersTakibi() {
  const { sinifId } = useLocalSearchParams<{ sinifId: string }>();
  return <DersTakibiEkrani sinifId={sinifId} />;
}
