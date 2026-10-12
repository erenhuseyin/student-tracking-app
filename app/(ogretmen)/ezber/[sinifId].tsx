// Erişim: yalnızca ogretmen (atandığı sınıf; RLS). Sınıfın öğrencileri, ezber özetiyle.
import { useLocalSearchParams } from 'expo-router';

import { SinifEzberi } from '@/components/SinifEzberi';

export default function SinifEzber() {
  const { sinifId } = useLocalSearchParams<{ sinifId: string }>();
  return <SinifEzberi sinifId={sinifId} />;
}
