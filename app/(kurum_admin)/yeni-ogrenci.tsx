// Erişim: yalnızca kurum_admin
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { Girdi } from '@/components/Girdi';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { TarihGirdisi } from '@/components/TarihGirdisi';
import { useOturum } from '@/lib/oturum';
import { ogrenciEkle } from '@/lib/ogrenciler';
import { useToast } from '@/lib/toast';

export default function YeniOgrenci() {
  const router = useRouter();
  const toast = useToast();
  // kurumId: sınıfın kurumu (kök admin şube sınıfına öğrenci ekliyorsa şube).
  const { sinifId, kurumId } = useLocalSearchParams<{ sinifId: string; kurumId?: string }>();
  const { kullanici } = useOturum();
  const hedefKurumId = kurumId ?? kullanici?.kurum_id;
  const [adSoyad, setAdSoyad] = useState('');
  const [dogumTarihi, setDogumTarihi] = useState('');
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
      await ogrenciEkle(hedefKurumId, sinifId, adSoyad, dogumTarihi);
      toast('Öğrenci eklendi');
      router.back();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');
    } finally {
      setGonderiliyor(false);
    }
  };

  return (
    <Ekran kaydirilabilir>
      <Stack.Screen options={{ title: 'Yeni Öğrenci' }} />

      <Kart>
        <Girdi etiket="Ad soyad" value={adSoyad} onChangeText={setAdSoyad} editable={!gonderiliyor} autoFocus />
        <TarihGirdisi etiket="Doğum tarihi" deger={dogumTarihi} onDegis={setDogumTarihi} pasif={gonderiliyor} />
        <HataMesaji mesaj={hata} />
        <Buton baslik="Kaydet" onPress={kaydet} yukleniyor={gonderiliyor} />
      </Kart>
    </Ekran>
  );
}
