// Oturumsuz başvuru formu: `tur` öğrenci ön kaydı (veli doldurur) ya da personel başvurusu.
// Kurum başvuru kabul etmiyorsa bilgi mesajı gösterilir. Gönderilince başvuran yalnızca
// "alındı" mesajını görür; sonucu kurum bildirir (uygulamada başvuru takibi yoktur).
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BosDurum } from '@/components/BosDurum';
import { Buton } from '@/components/Buton';
import { Chip } from '@/components/Chip';
import { Ekran } from '@/components/Ekran';
import { Girdi } from '@/components/Girdi';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { MarkaBasligi } from '@/components/MarkaBasligi';
import { OnayKutusu } from '@/components/OnayKutusu';
import { TarihGirdisi } from '@/components/TarihGirdisi';
import { Yukleniyor } from '@/components/Yukleniyor';
import { type BasvuruDurumBilgisi, basvuruDurumunuGetir, ogrenciBasvurusuGonder, personelBasvurusuGonder } from '@/lib/basvurular';
import { marka } from '@/lib/marka';
import { type Tema, useTema } from '@/lib/tema';
import type { BasvuruTuru } from '@/lib/tipler';

export function BasvuruFormuEkrani({ tur }: { tur: BasvuruTuru }) {
  const router = useRouter();
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const ogrenci = tur === 'ogrenci';
  const geriRota = ogrenci ? '/veli-giris' : '/login';

  const [bilgi, setBilgi] = useState<BasvuruDurumBilgisi | null>(null);
  const [kurumId, setKurumId] = useState<string | null>(null);
  const [adSoyad, setAdSoyad] = useState('');
  const [dogumTarihi, setDogumTarihi] = useState('');
  const [veliAdSoyad, setVeliAdSoyad] = useState('');
  const [veliTelefon, setVeliTelefon] = useState('');
  const [eposta, setEposta] = useState('');
  const [notMetni, setNotMetni] = useState('');
  const [riza, setRiza] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [gonderildi, setGonderildi] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    basvuruDurumunuGetir().then((b) => {
      setBilgi(b);
      if (b.kurumlar.length === 1) setKurumId(b.kurumlar[0].id);
    });
  }, []);

  const gonder = async () => {
    setGonderiliyor(true);
    setHata(null);
    try {
      const ortak = { kurumId, adSoyad, notMetni, riza };
      if (ogrenci) await ogrenciBasvurusuGonder({ ...ortak, dogumTarihi, veliAdSoyad, veliTelefon });
      else await personelBasvurusuGonder({ ...ortak, eposta });
      setGonderildi(true);
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Başvuru gönderilemedi, lütfen tekrar deneyin.');
    } finally {
      setGonderiliyor(false);
    }
  };

  const geriButonu = <Buton tur="metin" baslik="Giriş ekranına dön" onPress={() => router.replace(geriRota)} pasif={gonderiliyor} />;

  if (!bilgi) {
    return (
      <Ekran baslikCubugusuz ortala>
        <Yukleniyor />
      </Ekran>
    );
  }

  if (!bilgi.acik || gonderildi) {
    return (
      <Ekran baslikCubugusuz ortala>
        <BosDurum
          ikon={gonderildi ? 'checkmark-circle-outline' : 'information-circle-outline'}
          baslik={gonderildi ? 'Başvurunuz alındı' : 'Başvuru kapalı'}
          aciklama={
            gonderildi
              ? ogrenci
                ? 'Kurum başvurunuzu inceleyip sizinle iletişime geçecek. Onaylanırsa size bildirilecek kullanıcı adı ve PIN ile giriş yapabilirsiniz.'
                : 'Kurum başvurunuzu inceleyecek. Onaylanırsa e-posta adresinize bir giriş kodu gönderilir.'
              : `${marka.ad} uygulamadan başvuru kabul etmiyor. Lütfen kurumla doğrudan iletişime geçin.`
          }
        >
          {geriButonu}
        </BosDurum>
      </Ekran>
    );
  }

  return (
    <Ekran kaydirilabilir baslikCubugusuz ortala>
      <MarkaBasligi altBaslik={ogrenci ? 'Öğrenci ön kayıt başvurusu' : 'Personel başvurusu'} />

      <Kart>
        {bilgi.kurumlar.length > 1 ? (
          <View style={styles.alan}>
            <Text style={tema.yazi.etiket}>Başvurulacak kurum</Text>
            <View style={styles.cipler}>
              {bilgi.kurumlar.map((k) => (
                <Chip key={k.id} etiket={k.ad} secili={kurumId === k.id} onPress={() => setKurumId(k.id)} pasif={gonderiliyor} />
              ))}
            </View>
          </View>
        ) : null}

        <Girdi
          etiket={ogrenci ? 'Öğrencinin adı soyadı' : 'Adınız soyadınız'}
          value={adSoyad}
          onChangeText={setAdSoyad}
          editable={!gonderiliyor}
          maxLength={120}
          buyuk={ogrenci}
        />
        {ogrenci ? (
          <>
            <TarihGirdisi etiket="Öğrencinin doğum tarihi" deger={dogumTarihi} onDegis={setDogumTarihi} pasif={gonderiliyor} />
            <Girdi etiket="Velinin adı soyadı" value={veliAdSoyad} onChangeText={setVeliAdSoyad} editable={!gonderiliyor} maxLength={120} buyuk />
            <Girdi
              etiket="Velinin telefonu"
              keyboardType="phone-pad"
              maxLength={20}
              value={veliTelefon}
              onChangeText={setVeliTelefon}
              editable={!gonderiliyor}
              buyuk
            />
          </>
        ) : (
          <Girdi
            etiket="E-posta"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={eposta}
            onChangeText={setEposta}
            editable={!gonderiliyor}
          />
        )}
        <Girdi
          etiket="Eklemek istedikleriniz (isteğe bağlı)"
          value={notMetni}
          onChangeText={setNotMetni}
          editable={!gonderiliyor}
          multiline
          maxLength={1000}
          textAlignVertical="top"
          style={styles.not}
        />
        <OnayKutusu
          etiket={`Bu bilgilerin başvurumun değerlendirilmesi için ${marka.ad} yönetimine iletilmesini kabul ediyorum.`}
          secili={riza}
          onDegis={setRiza}
          pasif={gonderiliyor}
        />
        <HataMesaji mesaj={hata} />
        <Buton baslik="Başvuruyu Gönder" onPress={gonder} yukleniyor={gonderiliyor} buyuk={ogrenci} />
      </Kart>

      {geriButonu}
    </Ekran>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    alan: {
      gap: t.bosluk.xs,
    },
    cipler: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: t.bosluk.s,
    },
    not: {
      minHeight: 90,
    },
  });
}
