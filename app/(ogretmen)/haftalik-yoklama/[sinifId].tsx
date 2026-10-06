// Erişim: yalnızca ogretmen. Sınıfın haftalık yoklama tablosu ve katılım oranları; gün başlığından
// o günün yoklaması alınır/düzeltilir, başlık çubuğundan ders günleri belirlenir.
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { Ekran } from '@/components/Ekran';
import { IkonButon } from '@/components/IkonButon';
import { SinifKatilimi } from '@/components/SinifKatilimi';

export default function OgretmenHaftalikYoklama() {
  const router = useRouter();
  const { sinifId } = useLocalSearchParams<{ sinifId: string }>();
  const dersGunleriniAc = () => router.push(`/ders-gunleri/${sinifId}`);

  return (
    <Ekran>
      <Stack.Screen
        options={{
          title: 'Haftalık Yoklama',
          headerRight: () => <IkonButon ikon="calendar-outline" etiket="Ders günleri" onPress={dersGunleriniAc} />,
        }}
      />

      <SinifKatilimi
        sinifId={sinifId}
        onGunSec={(tarih) => router.push({ pathname: '/yoklama/[sinifId]', params: { sinifId, tarih } })}
        onDersGunleri={dersGunleriniAc}
      />
    </Ekran>
  );
}
