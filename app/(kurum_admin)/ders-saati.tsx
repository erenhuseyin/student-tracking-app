// Erişim: yalnızca kurum_admin (yönettiği kurumların sınıfları). Programa ders ekler ya da (`id` ile) dersi düzenler.
import { useLocalSearchParams } from 'expo-router';

import { DersSaatiEkrani } from '@/components/DersSaatiEkrani';

export default function DersSaatiSayfasi() {
  const { sinifId, id } = useLocalSearchParams<{ sinifId: string; id?: string }>();
  return <DersSaatiEkrani sinifId={sinifId} id={id} />;
}
