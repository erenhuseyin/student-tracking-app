// Erişim: yalnızca super_admin
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { Girdi } from '@/components/Girdi';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { kurumEkle } from '@/lib/kurumlar';
import { useTema } from '@/lib/tema';

export default function YeniKurum() {
  const router = useRouter();
  const tema = useTema();
  const [ad, setAd] = useState('');
  const [markaKodu, setMarkaKodu] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const kaydet = async () => {
    setGonderiliyor(true);
    setHata(null);
    try {
      await kurumEkle(ad, markaKodu);
      router.back();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');
    } finally {
      setGonderiliyor(false);
    }
  };

  return (
    <Ekran kaydirilabilir>
      <Stack.Screen options={{ title: 'Yeni Kurum' }} />

      <Kart>
        <Girdi etiket="Kurum adı" value={ad} onChangeText={setAd} editable={!gonderiliyor} autoFocus />
        <Girdi
          etiket="Marka kodu"
          placeholder="örn. ugur"
          autoCapitalize="none"
          autoCorrect={false}
          value={markaKodu}
          onChangeText={setMarkaKodu}
          editable={!gonderiliyor}
          onSubmitEditing={kaydet}
        />
        <Text style={tema.yazi.kucuk}>
          Marka kodu müşterinin uygulamasıyla eşleşir ve sonradan değiştirilemez. Şubeleri kurumun kendi yöneticisi
          ekler.
        </Text>
        <HataMesaji mesaj={hata} />
        <Buton baslik="Kaydet" onPress={kaydet} yukleniyor={gonderiliyor} />
      </Kart>
    </Ekran>
  );
}
