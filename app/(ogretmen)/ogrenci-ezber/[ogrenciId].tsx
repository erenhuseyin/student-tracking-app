// Erişim: yalnızca ogretmen (atandığı sınıf; RLS). Öğrencinin ezber takibi.
import { useLocalSearchParams } from 'expo-router';

import { OgrenciIcerikEkrani } from '@/components/OgrenciIcerikEkrani';

export default function OgrenciEzber() {
  const { ogrenciId } = useLocalSearchParams<{ ogrenciId: string }>();
  return <OgrenciIcerikEkrani ogrenciId={ogrenciId} tur="ezber" />;
}
