// Erişim: oturumu olmayan herkes. Veli, çocuğunun kullanıcı adı (ad.soyad) + 4 haneli PIN ile girer.
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { Girdi } from '@/components/Girdi';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { MarkaBasligi } from '@/components/MarkaBasligi';
import { PinGirdisi } from '@/components/PinGirdisi';
import { useBasvuruAcik } from '@/lib/basvuruAcik';
import { veliGirisYap } from '@/lib/veli';

export default function VeliGiris() {
  const router = useRouter();
  const [kullaniciAdi, setKullaniciAdi] = useState('');
  const [pin, setPin] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const basvuruAcik = useBasvuruAcik();

  const girisYap = async () => {
    setGonderiliyor(true);
    setHata(null);
    try {
      // Giriş sunucudan geçer (deneme sınırı); başarılıysa oturum açılır ve ekran değişir.
      await veliGirisYap(kullaniciAdi, pin);
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Giriş yapılamadı, lütfen tekrar deneyin.');
      setGonderiliyor(false);
    }
  };

  return (
    <Ekran kaydirilabilir baslikCubugusuz ortala>
      <MarkaBasligi altBaslik="Veli girişi" />

      <Kart>
        <Girdi
          etiket="Kullanıcı adı (örn. ali.yilmaz)"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          maxLength={60}
          value={kullaniciAdi}
          onChangeText={setKullaniciAdi}
          editable={!gonderiliyor}
          buyuk
        />
        <PinGirdisi etiket="PIN (4 hane)" deger={pin} onDegis={setPin} pasif={gonderiliyor} onTamamla={girisYap} />
        <HataMesaji mesaj={hata} />
        <Buton baslik="Giriş Yap" onPress={girisYap} yukleniyor={gonderiliyor} buyuk />
      </Kart>

      {basvuruAcik ? (
        <Buton
          tur="ikincil"
          ikon="create-outline"
          baslik="Çocuğum için ön kayıt başvurusu"
          onPress={() => router.replace('/ogrenci-basvuru')}
          pasif={gonderiliyor}
          buyuk
        />
      ) : null}

      <Buton
        tur="metin"
        baslik="Personel misiniz? E-posta ile giriş"
        onPress={() => router.replace('/login')}
        pasif={gonderiliyor}
      />
    </Ekran>
  );
}
