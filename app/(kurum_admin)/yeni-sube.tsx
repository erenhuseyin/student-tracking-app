// Erişim: yalnızca kök kurumun kurum_admin'i (RLS: kurum_admin_sube_ekle; şube admini
// denerse 2 seviye sınırı reddeder).
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';

import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { Girdi } from '@/components/Girdi';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { subeEkle } from '@/lib/kurumlar';
import { useOturum } from '@/lib/oturum';

export default function YeniSube() {
  const router = useRouter();
  const { kurum } = useOturum();
  const [ad, setAd] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const kaydet = async () => {
    if (!kurum) {
      setHata('Kurum bilgisi bulunamadı.');
      return;
    }
    setGonderiliyor(true);
    setHata(null);
    try {
      await subeEkle(kurum.id, ad);
      router.back();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');
    } finally {
      setGonderiliyor(false);
    }
  };

  return (
    <Ekran kaydirilabilir>
      <Stack.Screen options={{ title: 'Yeni Şube' }} />

      <Kart>
        <Girdi
          etiket="Şube adı"
          placeholder="örn. Bakırköy"
          value={ad}
          onChangeText={setAd}
          editable={!gonderiliyor}
          onSubmitEditing={kaydet}
          autoFocus
        />
        <HataMesaji mesaj={hata} />
        <Buton baslik="Kaydet" onPress={kaydet} yukleniyor={gonderiliyor} />
      </Kart>
    </Ekran>
  );
}
