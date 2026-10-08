// Erişim: yalnızca veli (kendi PIN'ini değiştirir). Hesap başlangıç PIN'iyle açıldıysa ya da PIN
// sıfırlandıysa (`pin_degistirilmeli`) bu ekran zorunludur: `(veli)/_layout.tsx` yeni PIN
// belirlenene kadar diğer ekranları kapatır ve mevcut PIN sorulmaz.
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { PinGirdisi } from '@/components/PinGirdisi';
import { useOturum } from '@/lib/oturum';
import { useTema } from '@/lib/tema';
import { veliPinDegistir } from '@/lib/veli';

export default function PinDegistir() {
  const router = useRouter();
  const tema = useTema();
  const { kullanici, kullaniciyiYenile, cikisYap } = useOturum();
  const zorunlu = kullanici?.pin_degistirilmeli === true;
  const [mevcutPin, setMevcutPin] = useState('');
  const [yeniPin, setYeniPin] = useState('');
  const [yeniPinTekrar, setYeniPinTekrar] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const kaydet = async () => {
    if (!zorunlu && mevcutPin.length !== 4) {
      setHata("Mevcut PIN'inizi girin.");
      return;
    }
    if (yeniPin.length !== 4) {
      setHata('PIN 4 haneli olmalı.');
      return;
    }
    if (yeniPin !== yeniPinTekrar) {
      setHata("Girdiğiniz PIN'ler eşleşmiyor.");
      return;
    }
    setGonderiliyor(true);
    setHata(null);
    try {
      await veliPinDegistir(yeniPin, zorunlu ? undefined : mevcutPin);
      // Zorunlu akışta bayrak düşünce diğer ekranlar açılır; ana ekrana geçilir.
      await kullaniciyiYenile();
      if (zorunlu) router.replace('/');
      else router.back();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'PIN değiştirilemedi, lütfen tekrar deneyin.');
      setGonderiliyor(false);
    }
  };

  return (
    <Ekran kaydirilabilir>
      <Stack.Screen options={{ title: zorunlu ? 'Yeni PIN Belirleyin' : "PIN'imi Değiştir", headerBackVisible: !zorunlu }} />

      <Kart>
        {zorunlu ? (
          <Text style={tema.yazi.govde}>
            Hesabınız başlangıç PIN&apos;iyle açıldı. Devam etmek için yalnızca sizin bileceğiniz 4 haneli yeni bir PIN
            belirleyin.
          </Text>
        ) : (
          <PinGirdisi etiket="Mevcut PIN" deger={mevcutPin} onDegis={setMevcutPin} pasif={gonderiliyor} />
        )}
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

      {zorunlu ? <Buton tur="metin" baslik="Çıkış Yap" onPress={cikisYap} pasif={gonderiliyor} /> : null}
    </Ekran>
  );
}
