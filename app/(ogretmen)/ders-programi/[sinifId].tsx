// Erişim: yalnızca ogretmen (atandığı sınıf; RLS başka sınıf için yazmayı reddeder). Sınıfın haftalık ders programını düzenler.
import { useLocalSearchParams } from 'expo-router';

import { SinifProgramiEkrani } from '@/components/SinifProgramiEkrani';

export default function DersProgrami() {
  const { sinifId } = useLocalSearchParams<{ sinifId: string }>();
  return <SinifProgramiEkrani sinifId={sinifId} />;
}
