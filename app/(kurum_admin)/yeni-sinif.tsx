// Erişim: yalnızca kurum_admin
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { Girdi } from '@/components/Girdi';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
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
  const [ad, setAd] = useState('');
  const [donem, setDonem] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const kaydet = async () => {
    if (!hedefKurumId) {
      setHata('Kurum bilgisi bulunamadı.');
      return;
    }
    setGonderiliyor(true);
    setHata(null);
    try {
      await sinifEkle(hedefKurumId, ad, donem);
      toast('Sınıf eklendi');
      router.back();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');
    } finally {
      setGonderiliyor(false);
    }
  };

  return (
    <Ekran kaydirilabilir>
      <Stack.Screen options={{ title: 'Yeni Sınıf' }} />

      <Kart>
        <Girdi etiket="Sınıf adı" placeholder="örn. 3-A" value={ad} onChangeText={setAd} editable={!gonderiliyor} autoFocus />
        <Girdi
          etiket="Dönem"
          placeholder="örn. 2026-2027"
          value={donem}
          onChangeText={setDonem}
          editable={!gonderiliyor}
          onSubmitEditing={kaydet}
        />
        <HataMesaji mesaj={hata} />
        <Buton baslik="Kaydet" onPress={kaydet} yukleniyor={gonderiliyor} />
      </Kart>
    </Ekran>
  );
}
