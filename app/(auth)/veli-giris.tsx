// Erişim: oturumu olmayan herkes. Veli, çocuğunun TCKN'si + 4 haneli PIN ile girer.
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { Girdi } from '@/components/Girdi';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { MarkaBasligi } from '@/components/MarkaBasligi';
import { PinGirdisi } from '@/components/PinGirdisi';
import { veliEpostasi } from '@/lib/marka';
import { pinAuthSifresi } from '@/lib/ogrenciler';
import { supabase } from '@/lib/supabase';

export default function VeliGiris() {
  const router = useRouter();
  const [tckn, setTckn] = useState('');
  const [pin, setPin] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const girisYap = async () => {
    if (tckn.trim().length !== 11 || pin.length !== 4) {
      setHata('TCKN 11, PIN 4 haneli olmalı.');
      return;
    }
    setGonderiliyor(true);
    setHata(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: veliEpostasi(tckn.trim()),
      password: pinAuthSifresi(pin),
    });
    setGonderiliyor(false);
    if (error) setHata('TCKN veya PIN hatalı.');
  };

  return (
    <Ekran kaydirilabilir baslikCubugusuz ortala>
      <MarkaBasligi altBaslik="Veli girişi" />

      <Kart>
        <Girdi
          etiket="Çocuğunuzun TC kimlik numarası"
          keyboardType="number-pad"
          maxLength={11}
          value={tckn}
          onChangeText={setTckn}
          editable={!gonderiliyor}
          buyuk
        />
        <PinGirdisi etiket="PIN (4 hane)" deger={pin} onDegis={setPin} pasif={gonderiliyor} onTamamla={girisYap} />
        <HataMesaji mesaj={hata} />
        <Buton baslik="Giriş Yap" onPress={girisYap} yukleniyor={gonderiliyor} buyuk />
      </Kart>

      <Buton
        tur="metin"
        baslik="Personel misiniz? E-posta ile giriş"
        onPress={() => router.replace('/login')}
        pasif={gonderiliyor}
      />
    </Ekran>
  );
}
