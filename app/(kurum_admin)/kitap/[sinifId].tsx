// Erişim: yalnızca kurum_admin (yönettiği kurumların sınıfları; RLS). Sınıfın öğrencileri, kitap özetiyle.
import { useLocalSearchParams } from 'expo-router';

import { SinifIcerikListesi } from '@/components/SinifIcerikListesi';

export default function SinifKitap() {
  const { sinifId } = useLocalSearchParams<{ sinifId: string }>();
  return <SinifIcerikListesi sinifId={sinifId} tur="kitap" />;
}
