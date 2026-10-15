// Erişim: oturumu olmayan herkes. Personel (süper admin, kurum admini, öğretmen) e-posta ya da
// kullanıcı adı (ali.yilmaz; süper adminde yok) + şifre ile girer. `@` içeren yazı e-posta sayılır
// ve doğrudan Auth'a gider; içermeyen sunucudan (lib/personelGiris.ts) geçer.
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { Girdi } from '@/components/Girdi';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { MarkaBasligi } from '@/components/MarkaBasligi';
import { useBasvuruAcik } from '@/lib/basvuruAcik';
import { kullaniciAdiylaGirisYap } from '@/lib/personelGiris';
import { supabase } from '@/lib/supabase';

function hataMesajinaCevir(mesaj: string): string {
  if (/invalid login credentials/i.test(mesaj)) return 'E-posta veya şifre hatalı.';
  if (/email not confirmed/i.test(mesaj)) return 'E-posta adresiniz henüz onaylanmamış.';
  if (/network|fetch/i.test(mesaj)) return 'Bağlantı sorunu, lütfen tekrar deneyin.';
  return 'Giriş yapılamadı, lütfen tekrar deneyin.';
}

export default function Login() {
  const router = useRouter();
  const [giris, setGiris] = useState('');
  const [sifre, setSifre] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const basvuruAcik = useBasvuruAcik();

  const girisYap = async () => {
    const yazilan = giris.trim();
    if (!yazilan || !sifre) {
      setHata('E-posta ya da kullanıcı adı ve şifre gerekli.');
      return;
    }
    setGonderiliyor(true);
    setHata(null);
    if (yazilan.includes('@')) {
      const { error } = await supabase.auth.signInWithPassword({ email: yazilan, password: sifre });
      if (error) setHata(hataMesajinaCevir(error.message));
    } else {
      try {
        await kullaniciAdiylaGirisYap(yazilan, sifre);
      } catch (e) {
        setHata(e instanceof Error ? e.message : 'Giriş yapılamadı, lütfen tekrar deneyin.');
      }
    }
    setGonderiliyor(false);
  };

  return (
    <Ekran kaydirilabilir baslikCubugusuz ortala>
      <MarkaBasligi altBaslik="Personel girişi" />

      <Kart>
        <Girdi
          etiket="E-posta ya da kullanıcı adı"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          keyboardType="email-address"
          value={giris}
          onChangeText={setGiris}
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
        <Buton
          tur="metin"
          baslik="Davet kodum var / Şifremi unuttum"
          onPress={() => router.replace('/kod-ile-giris')}
          pasif={gonderiliyor}
        />
        {basvuruAcik ? (
          <Buton
            tur="metin"
            baslik="Öğretmen olarak başvur"
            onPress={() => router.replace('/personel-basvuru')}
            pasif={gonderiliyor}
          />
        ) : null}
      </Kart>

      <Buton
        tur="ikincil"
        ikon="people-outline"
        baslik="Veliyim — kullanıcı adıyla giriş"
        onPress={() => router.replace('/veli-giris')}
        pasif={gonderiliyor}
        buyuk
      />
    </Ekran>
  );
}
