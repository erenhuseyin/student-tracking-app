// Erişim: oturumu olmayan herkes. Personel (süper admin, kurum admini, öğretmen) e-posta + şifre ile girer.
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { Girdi } from '@/components/Girdi';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { MarkaBasligi } from '@/components/MarkaBasligi';
import { supabase } from '@/lib/supabase';

function hataMesajinaCevir(mesaj: string): string {
  if (/invalid login credentials/i.test(mesaj)) return 'E-posta veya şifre hatalı.';
  if (/email not confirmed/i.test(mesaj)) return 'E-posta adresiniz henüz onaylanmamış.';
  if (/network|fetch/i.test(mesaj)) return 'Bağlantı sorunu, lütfen tekrar deneyin.';
  return 'Giriş yapılamadı, lütfen tekrar deneyin.';
}

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sifre, setSifre] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const girisYap = async () => {
    if (!email.trim() || !sifre) {
      setHata('E-posta ve şifre gerekli.');
      return;
    }
    setGonderiliyor(true);
    setHata(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: sifre });
    setGonderiliyor(false);
    if (error) setHata(hataMesajinaCevir(error.message));
  };

  return (
    <Ekran kaydirilabilir baslikCubugusuz ortala>
      <MarkaBasligi altBaslik="Personel girişi" />

      <Kart>
        <Girdi
          etiket="E-posta"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          editable={!gonderiliyor}
        />
        <Girdi
          etiket="Şifre"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password"
          value={sifre}
          onChangeText={setSifre}
          editable={!gonderiliyor}
          onSubmitEditing={girisYap}
        />
        <HataMesaji mesaj={hata} />
        <Buton baslik="Giriş Yap" onPress={girisYap} yukleniyor={gonderiliyor} />
      </Kart>

      <Buton
        tur="ikincil"
        ikon="people-outline"
        baslik="Veliyim — TCKN ile giriş"
        onPress={() => router.replace('/veli-giris')}
        pasif={gonderiliyor}
        buyuk
      />
    </Ekran>
  );
}
