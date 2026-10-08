// Erişim: yalnızca kurum_admin (yönettiği kurumların sınıfları). Sınıfın haftalık ders programını düzenler.
import { useLocalSearchParams } from 'expo-router';

import { SinifProgramiEkrani } from '@/components/SinifProgramiEkrani';

export default function DersProgrami() {
  const { sinifId } = useLocalSearchParams<{ sinifId: string }>();
  return <SinifProgramiEkrani sinifId={sinifId} />;
}
