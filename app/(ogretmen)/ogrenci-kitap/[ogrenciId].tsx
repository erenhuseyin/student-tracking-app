// Erişim: yalnızca ogretmen (atandığı sınıf; RLS). Öğrencinin kitap takibi.
import { useLocalSearchParams } from 'expo-router';

import { OgrenciIcerikEkrani } from '@/components/OgrenciIcerikEkrani';

export default function OgrenciKitap() {
  const { ogrenciId } = useLocalSearchParams<{ ogrenciId: string }>();
  return <OgrenciIcerikEkrani ogrenciId={ogrenciId} tur="kitap" />;
}
