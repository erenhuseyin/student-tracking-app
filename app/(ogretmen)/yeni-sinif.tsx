// Erişim: yalnızca ogretmen (ogretmen_kayit bayrağı açıksa). Sınıf öğretmenin kendi birimine açılır
// ve öğretmen sınıfa atanır (sunucuda tek işlem; bkz. ogretmen_sinif_ac).
import { Stack, useRouter } from 'expo-router';
import { Text } from 'react-native';

import { Ekran } from '@/components/Ekran';
import { YeniSinifFormu } from '@/components/YeniSinifFormu';
import { ogretmenSinifAc } from '@/lib/siniflar';
import { useTema } from '@/lib/tema';
import { useToast } from '@/lib/toast';

export default function YeniSinif() {
  const router = useRouter();
  const toast = useToast();
  const tema = useTema();

  const kaydet = async (ad: string, donem: string, kademeId: string | null) => {
    const id = await ogretmenSinifAc(ad, donem, kademeId);
    toast('Sınıf açıldı');
    router.replace(`/sinifim/${id}`);
  };

  return (
    <Ekran kaydirilabilir>
      <Stack.Screen options={{ title: 'Yeni Sınıf' }} />
      <Text style={tema.yazi.kucuk}>Sınıf bağlı olduğunuz birime açılır ve size atanır; ardından öğrencilerini ekleyebilirsiniz.</Text>
      <YeniSinifFormu onKaydet={kaydet} />
    </Ekran>
  );
}
