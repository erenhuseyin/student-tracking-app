// "Profilim" ekranının gövdesi (tüm roller): kimlik bilgileri, ad değiştirme ve — personelde —
// şifre değiştirme. Veli adını değiştirmez ve şifre yerine PIN kullanır (bkz. lib/profil.ts).
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { Girdi } from '@/components/Girdi';
import { HataMesaji } from '@/components/HataMesaji';
import { Ikon } from '@/components/Ikon';
import { Kart } from '@/components/Kart';
import { ListeSatiri } from '@/components/ListeSatiri';
import { rolEtiketi } from '@/lib/menu';
import { useOturum } from '@/lib/oturum';
import { EN_AZ_SIFRE_UZUNLUGU } from '@/lib/personel';
import { adimiGuncelle, sifremiDegistir } from '@/lib/profil';
import { useTema } from '@/lib/tema';

type Mesaj = { tur: 'hata' | 'basari'; metin: string } | null;

const mesajaCevir = (e: unknown) => (e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');

export function ProfilEkrani() {
  const router = useRouter();
  const tema = useTema();
  const { kullanici, kurum, kokKurum, gorev, session, kullaniciyiYenile } = useOturum();

  const [adSoyad, setAdSoyad] = useState(kullanici?.ad_soyad ?? '');
  const [adKaydediliyor, setAdKaydediliyor] = useState(false);
  const [adMesaji, setAdMesaji] = useState<Mesaj>(null);

  const [mevcutSifre, setMevcutSifre] = useState('');
  const [yeniSifre, setYeniSifre] = useState('');
  const [yeniSifreTekrar, setYeniSifreTekrar] = useState('');
  const [sifreKaydediliyor, setSifreKaydediliyor] = useState(false);
  const [sifreMesaji, setSifreMesaji] = useState<Mesaj>(null);

  if (!kullanici) return null;

  const veli = kullanici.rol === 'veli';
  const eposta = session?.user.email;
  const kurumAdi = kurum && kokKurum && kurum.id !== kokKurum.id ? `${kokKurum.ad} · ${kurum.ad}` : kurum?.ad;

  const adKaydet = async () => {
    setAdKaydediliyor(true);
    setAdMesaji(null);
    try {
      await adimiGuncelle(kullanici.id, adSoyad);
      await kullaniciyiYenile();
      setAdMesaji({ tur: 'basari', metin: 'Kaydedildi.' });
    } catch (e) {
      setAdMesaji({ tur: 'hata', metin: mesajaCevir(e) });
    } finally {
      setAdKaydediliyor(false);
    }
  };

  const sifreKaydet = async () => {
    if (!eposta) return;
    if (yeniSifre !== yeniSifreTekrar) {
      setSifreMesaji({ tur: 'hata', metin: 'Girdiğiniz yeni şifreler eşleşmiyor.' });
      return;
    }
    setSifreKaydediliyor(true);
    setSifreMesaji(null);
    try {
      await sifremiDegistir(eposta, mevcutSifre, yeniSifre);
      setMevcutSifre('');
      setYeniSifre('');
      setYeniSifreTekrar('');
      setSifreMesaji({ tur: 'basari', metin: 'Şifreniz değiştirildi.' });
    } catch (e) {
      setSifreMesaji({ tur: 'hata', metin: mesajaCevir(e) });
    } finally {
      setSifreKaydediliyor(false);
    }
  };

  return (
    <Ekran kaydirilabilir>
      <Stack.Screen options={{ title: 'Profilim' }} />

      <Kart>
        <Girdi
          etiket={veli ? 'Ad soyad (değiştirilemez)' : 'Ad soyad'}
          value={adSoyad}
          onChangeText={setAdSoyad}
          editable={!veli && !adKaydediliyor}
        />
        {kullanici.eposta ? <Girdi etiket="E-posta (değiştirilemez)" value={kullanici.eposta} editable={false} /> : null}
        {kullanici.kullanici_adi ? (
          <Girdi etiket="Kullanıcı adı (girişte e-posta yerine yazabilirsiniz)" value={kullanici.kullanici_adi} editable={false} />
        ) : null}
        <Girdi etiket="Rol" value={rolEtiketi(kullanici.rol, kurum, gorev?.ad)} editable={false} />
        {kurumAdi ? <Girdi etiket="Kurum" value={kurumAdi} editable={false} /> : null}
        <HataMesaji mesaj={adMesaji?.metin} tur={adMesaji?.tur} />
        {veli ? null : (
          <Buton
            baslik="Kaydet"
            onPress={adKaydet}
            yukleniyor={adKaydediliyor}
            pasif={adSoyad.trim() === kullanici.ad_soyad}
          />
        )}
      </Kart>

      {veli ? (
        <ListeSatiri
          buyuk
          baslik="PIN'imi Değiştir"
          sol={<Ikon ad="key-outline" boyut={24} renk={tema.renkler.anaParlak} />}
          onPress={() => router.push('/pin-degistir')}
        />
      ) : (
        <Kart>
          <Text style={tema.yazi.bolum}>Şifre</Text>
          <Girdi
            etiket="Mevcut şifre"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            value={mevcutSifre}
            onChangeText={setMevcutSifre}
            editable={!sifreKaydediliyor}
          />
          <Girdi
            etiket={`Yeni şifre (en az ${EN_AZ_SIFRE_UZUNLUGU} karakter)`}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            value={yeniSifre}
            onChangeText={setYeniSifre}
            editable={!sifreKaydediliyor}
          />
          <Girdi
            etiket="Yeni şifre (tekrar)"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            value={yeniSifreTekrar}
            onChangeText={setYeniSifreTekrar}
            editable={!sifreKaydediliyor}
            onSubmitEditing={sifreKaydet}
          />
          <HataMesaji mesaj={sifreMesaji?.metin} tur={sifreMesaji?.tur} />
          <Buton tur="ikincil" baslik="Şifremi Değiştir" onPress={sifreKaydet} yukleniyor={sifreKaydediliyor} />
        </Kart>
      )}
    </Ekran>
  );
}
