// Erişim: oturumu olmayan herkes. Personel, e-postasına gelen kodla şifresini belirler: hem
// daveti kabul etmek hem unutulan şifreyi yenilemek için. Kod doğrulama ve şifre yazma
// sunucudadır (supabase/functions/personel-yonet).
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { Girdi } from '@/components/Girdi';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { MarkaBasligi } from '@/components/MarkaBasligi';
import { EN_AZ_SIFRE_UZUNLUGU, kodIleSifreBelirle, kodIste } from '@/lib/personel';
import { supabase } from '@/lib/supabase';
import { yazi } from '@/lib/tema';

const mesajaCevir = (e: unknown) => (e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');

export default function KodIleGiris() {
  const router = useRouter();
  const [eposta, setEposta] = useState('');
  const [kod, setKod] = useState('');
  const [sifre, setSifre] = useState('');
  const [sifreTekrar, setSifreTekrar] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [kodIsteniyor, setKodIsteniyor] = useState(false);
  const [mesaj, setMesaj] = useState<{ tur: 'hata' | 'basari'; metin: string } | null>(null);
  const mesgul = gonderiliyor || kodIsteniyor;

  const sifreBelirle = async () => {
    if (sifre !== sifreTekrar) {
      setMesaj({ tur: 'hata', metin: 'Girdiğiniz şifreler eşleşmiyor.' });
      return;
    }
    setGonderiliyor(true);
    setMesaj(null);
    try {
      await kodIleSifreBelirle(eposta, kod, sifre);
      // Şifre belirlendi; doğrudan giriş yapılır (oturum açılınca yönlendirme kendiliğinden olur).
      const { error } = await supabase.auth.signInWithPassword({ email: eposta.trim().toLowerCase(), password: sifre });
      if (error) router.replace('/login');
    } catch (e) {
      setMesaj({ tur: 'hata', metin: mesajaCevir(e) });
    } finally {
      setGonderiliyor(false);
    }
  };

  const yeniKodIste = async () => {
    setKodIsteniyor(true);
    setMesaj(null);
    try {
      await kodIste(eposta);
      setMesaj({ tur: 'basari', metin: 'Bu e-posta kayıtlıysa yeni bir kod gönderildi. Gelen kutunuzu kontrol edin.' });
    } catch (e) {
      setMesaj({ tur: 'hata', metin: mesajaCevir(e) });
    } finally {
      setKodIsteniyor(false);
    }
  };

  return (
    <Ekran kaydirilabilir baslikCubugusuz ortala>
      <MarkaBasligi altBaslik="Şifre belirle" />

      <Kart>
        <Text style={yazi.kucuk}>E-postanıza gelen kodu girin ve şifrenizi belirleyin.</Text>
        <Girdi
          etiket="E-posta"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          value={eposta}
          onChangeText={setEposta}
          editable={!mesgul}
        />
        <Girdi
          etiket="E-postadaki kod"
          keyboardType="number-pad"
          maxLength={8}
          value={kod}
          onChangeText={setKod}
          editable={!mesgul}
          buyuk
        />
        <Girdi
          etiket={`Yeni şifre (en az ${EN_AZ_SIFRE_UZUNLUGU} karakter)`}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          value={sifre}
          onChangeText={setSifre}
          editable={!mesgul}
        />
        <Girdi
          etiket="Yeni şifre (tekrar)"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          value={sifreTekrar}
          onChangeText={setSifreTekrar}
          editable={!mesgul}
          onSubmitEditing={sifreBelirle}
        />
        <HataMesaji mesaj={mesaj?.metin} tur={mesaj?.tur} />
        <Buton baslik="Şifremi Belirle ve Giriş Yap" onPress={sifreBelirle} yukleniyor={gonderiliyor} pasif={kodIsteniyor} />
        <Buton tur="metin" baslik="Kodum yok ya da süresi doldu — yeni kod gönder" onPress={yeniKodIste} yukleniyor={kodIsteniyor} pasif={gonderiliyor} />
      </Kart>

      <Buton tur="metin" baslik="Giriş ekranına dön" onPress={() => router.replace('/login')} pasif={mesgul} />
    </Ekran>
  );
}
