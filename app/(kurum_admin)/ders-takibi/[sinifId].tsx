// Erişim: yalnızca kurum_admin (yönettiği kurumların sınıfları; RLS). Sınıfın işlediği konuları işaretler.
import { useLocalSearchParams } from 'expo-router';

import { DersTakibiEkrani } from '@/components/DersTakibiEkrani';

export default function DersTakibi() {
  const { sinifId } = useLocalSearchParams<{ sinifId: string }>();
  return <DersTakibiEkrani sinifId={sinifId} />;
}
