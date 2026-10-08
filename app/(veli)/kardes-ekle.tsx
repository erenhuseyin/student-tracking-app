// Erişim: yalnızca veli. Başka bir çocuğunu (kardeşi) bu hesaba bağlar: kardeşin TC kimlik
// numarası ve o çocuğun PIN'i istenir (sunucu doğrular; bkz. supabase/functions/veli-kardes-ekle).
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { Girdi } from '@/components/Girdi';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { PinGirdisi } from '@/components/PinGirdisi';
import { useTema } from '@/lib/tema';
import { useToast } from '@/lib/toast';
import { kardesEkle } from '@/lib/veli';

export default function KardesEkle() {
  const router = useRouter();
  const tema = useTema();
  const toast = useToast();
  const [tckn, setTckn] = useState('');
  const [pin, setPin] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const ekle = async () => {
    setGonderiliyor(true);
    setHata(null);
    try {
      const adSoyad = await kardesEkle(tckn, pin);
      toast(`${adSoyad} hesabınıza eklendi`);
      router.back();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Çocuk eklenemedi, lütfen tekrar deneyin.');
      setGonderiliyor(false);
    }
  };

  return (
    <Ekran kaydirilabilir>
      <Stack.Screen options={{ title: 'Kardeş Ekle' }} />

      <Kart>
        <Text style={tema.yazi.govde}>
          Bu kurumda başka bir çocuğunuz varsa onu da bu hesapta görebilirsiniz. Eklemek istediğiniz çocuğun TC kimlik
          numarasını ve onun PIN&apos;ini girin.
        </Text>
        <Girdi
          etiket="Diğer çocuğunuzun TC kimlik numarası"
          keyboardType="number-pad"
          maxLength={11}
          value={tckn}
          onChangeText={setTckn}
          editable={!gonderiliyor}
          buyuk
        />
        <PinGirdisi etiket="O çocuğun PIN'i (4 hane)" deger={pin} onDegis={setPin} pasif={gonderiliyor} />
        <HataMesaji mesaj={hata} />
        <Buton baslik="Hesabıma Ekle" onPress={ekle} yukleniyor={gonderiliyor} buyuk />
        <Text style={tema.yazi.kucuk}>
          PIN&apos;i bilmiyorsanız kurumunuzdan sıfırlamasını isteyin. Çocuğun kendi girişi (TC kimlik numarası + PIN) de
          çalışmaya devam eder.
        </Text>
      </Kart>
    </Ekran>
  );
}
