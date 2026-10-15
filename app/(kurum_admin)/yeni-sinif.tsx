// Erişim: yalnızca kurum_admin
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { Ekran } from '@/components/Ekran';
import { YeniSinifFormu } from '@/components/YeniSinifFormu';
import { useOturum } from '@/lib/oturum';
import { sinifEkle } from '@/lib/siniflar';
import { useToast } from '@/lib/toast';

export default function YeniSinif() {
  const router = useRouter();
  const toast = useToast();
  // kurumId: kök admin bir şube için sınıf açıyorsa o şube; verilmezse kullanıcının kendi kurumu.
  const { kurumId } = useLocalSearchParams<{ kurumId?: string }>();
  const { kullanici } = useOturum();
  const hedefKurumId = kurumId ?? kullanici?.kurum_id;

  const kaydet = async (ad: string, donem: string, kademeId: string | null) => {
    if (!hedefKurumId) throw new Error('Kurum bilgisi bulunamadı.');
    await sinifEkle(hedefKurumId, ad, donem, kademeId);
    toast('Sınıf eklendi');
    router.back();
  };

  return (
    <Ekran kaydirilabilir>
      <Stack.Screen options={{ title: 'Yeni Sınıf' }} />
      <YeniSinifFormu onKaydet={kaydet} />
    </Ekran>
  );
}
