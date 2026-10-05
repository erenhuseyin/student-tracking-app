// Erişim: yalnızca veli (kendi PIN'ini değiştirir)
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';

import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { PinGirdisi } from '@/components/PinGirdisi';
import { pinAuthSifresi } from '@/lib/ogrenciler';
import { supabase } from '@/lib/supabase';

export default function PinDegistir() {
  const router = useRouter();
  const [yeniPin, setYeniPin] = useState('');
  const [yeniPinTekrar, setYeniPinTekrar] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const kaydet = async () => {
    if (yeniPin.length !== 4) {
      setHata('PIN 4 haneli olmalı.');
      return;
    }
    if (yeniPin !== yeniPinTekrar) {
      setHata('Girdiğiniz PIN\'ler eşleşmiyor.');
      return;
    }
    setGonderiliyor(true);
    setHata(null);
    const { error } = await supabase.auth.updateUser({ password: pinAuthSifresi(yeniPin) });
    setGonderiliyor(false);
    if (error) {
      setHata('PIN değiştirilemedi, lütfen tekrar deneyin.');
      return;
    }
    router.back();
  };

  return (
    <Ekran kaydirilabilir>
      <Stack.Screen options={{ title: 'PIN\'imi Değiştir' }} />

      <Kart>
        <PinGirdisi etiket="Yeni PIN" deger={yeniPin} onDegis={setYeniPin} pasif={gonderiliyor} />
        <PinGirdisi
          etiket="Yeni PIN (tekrar)"
          deger={yeniPinTekrar}
          onDegis={setYeniPinTekrar}
          pasif={gonderiliyor}
          onTamamla={kaydet}
        />
        <HataMesaji mesaj={hata} />
        <Buton baslik="Kaydet" onPress={kaydet} yukleniyor={gonderiliyor} buyuk />
      </Kart>
    </Ekran>
  );
}
