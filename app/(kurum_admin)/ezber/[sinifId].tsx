// Erişim: yalnızca kurum_admin (yönettiği kurumların sınıfları; RLS). Sınıfın öğrencileri, ezber özetiyle.
import { useLocalSearchParams } from 'expo-router';

import { SinifIcerikListesi } from '@/components/SinifIcerikListesi';

export default function SinifEzber() {
  const { sinifId } = useLocalSearchParams<{ sinifId: string }>();
  return <SinifIcerikListesi sinifId={sinifId} tur="ezber" />;
}
