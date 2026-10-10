// Erişim: yalnızca kurum_admin
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { Girdi } from '@/components/Girdi';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { OnayButonu } from '@/components/OnayButonu';
import { TarihGirdisi } from '@/components/TarihGirdisi';
import { Yukleniyor } from '@/components/Yukleniyor';
import { ogrenciAktifliginiAyarla, ogrenciGetir, ogrenciGuncelle, ogrenciSil, tcknAta, veliPininiSifirla } from '@/lib/ogrenciler';
import { useToast } from '@/lib/toast';
import { useTema } from '@/lib/tema';

export default function OgrenciDuzenle() {
  const router = useRouter();
  const tema = useTema();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [adSoyad, setAdSoyad] = useState('');
  const [dogumTarihi, setDogumTarihi] = useState('');
  const [tckn, setTckn] = useState<string | null>(null);
  const [aktif, setAktif] = useState(true);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const [tcknGirdisi, setTcknGirdisi] = useState('');
  const [tcknGonderiliyor, setTcknGonderiliyor] = useState(false);
  const [tcknHata, setTcknHata] = useState<string | null>(null);

  const [pinHata, setPinHata] = useState<string | null>(null);
  const [pinBasarili, setPinBasarili] = useState(false);
  const [silmeHatasi, setSilmeHatasi] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    let iptalEdildi = false;
    ogrenciGetir(id)
      .then((o) => {
        if (iptalEdildi) return;
        setAdSoyad(o.ad_soyad);
        setDogumTarihi(o.dogum_tarihi);
        setTckn(o.tckn);
        setAktif(o.aktif);
      })
      .catch((e: Error) => {
        if (!iptalEdildi) setHata(e.message);
      })
      .finally(() => {
        if (!iptalEdildi) setYukleniyor(false);
      });
    return () => {
      iptalEdildi = true;
    };
  }, [id]);

  const kaydet = async () => {
    setGonderiliyor(true);
    setHata(null);
    try {
      await ogrenciGuncelle(id, adSoyad, dogumTarihi);
      toast('Öğrenci kaydedildi');
      router.back();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');
    } finally {
      setGonderiliyor(false);
    }
  };

  const aktifligiDegistir = async (yeni: boolean) => {
    setSilmeHatasi(null);
    try {
      await ogrenciAktifliginiAyarla(id, yeni);
      setAktif(yeni);
      toast(yeni ? 'Öğrenci yeniden aktif' : 'Öğrenci pasife alındı');
    } catch (e) {
      setSilmeHatasi(e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');
    }
  };

  const sil = async () => {
    setSilmeHatasi(null);
    try {
      await ogrenciSil(id);
      toast('Öğrenci silindi');
      router.back();
    } catch (e) {
      setSilmeHatasi(e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');
    }
  };

  const tcknAtaTikla = async () => {
    setTcknGonderiliyor(true);
    setTcknHata(null);
    try {
      await tcknAta(id, tcknGirdisi.trim());
      setTckn(tcknGirdisi.trim());
    } catch (e) {
      setTcknHata(e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');
    } finally {
      setTcknGonderiliyor(false);
    }
  };

  const pinSifirla = async () => {
    setPinHata(null);
    setPinBasarili(false);
    try {
      await veliPininiSifirla(id);
      setPinBasarili(true);
    } catch (e) {
      setPinHata(e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');
    }
  };

  return (
    <Ekran kaydirilabilir>
      <Stack.Screen options={{ title: 'Öğrenciyi Düzenle' }} />

      {yukleniyor ? (
        <Yukleniyor />
      ) : (
        <>
          <Kart>
            <Text style={tema.yazi.bolum}>Bilgiler</Text>
            <Girdi etiket="Ad soyad" value={adSoyad} onChangeText={setAdSoyad} editable={!gonderiliyor} />
            <TarihGirdisi etiket="Doğum tarihi" deger={dogumTarihi} onDegis={setDogumTarihi} pasif={gonderiliyor} />
            <HataMesaji mesaj={hata} />
            <Buton baslik="Kaydet" onPress={kaydet} yukleniyor={gonderiliyor} />
          </Kart>

          <Kart>
            <Text style={tema.yazi.bolum}>Veli girişi</Text>
            {tckn ? (
              <>
                <Girdi etiket="TCKN (değiştirilemez)" value={tckn} editable={false} />
                <Text style={tema.yazi.kucuk}>
                  Veli bu TCKN ve PIN ile giriş yapar. PIN unutulursa ya da hesap kilitlenirse sıfırlayın; PIN &quot;1234&quot; olur ve veli ilk girişte yenisini belirler.
                </Text>
                <HataMesaji mesaj={pinBasarili ? 'PIN "1234" olarak sıfırlandı.' : null} tur="basari" />
                <HataMesaji mesaj={pinHata} />
                <OnayButonu
                  etiket="Veli PIN'ini Sıfırla"
                  soru={'Emin misiniz? PIN "1234" olacak.'}
                  onayEtiketi="Evet, sıfırla"
                  onOnay={pinSifirla}
                />
              </>
            ) : (
              <>
                <Text style={tema.yazi.kucuk}>
                  TCKN atanınca veli hesabı açılır ve PIN &quot;1234&quot; olur; veli ilk girişte yenisini belirler. TCKN sonradan değiştirilemez.
                </Text>
                <Girdi
                  etiket="Öğrencinin TC kimlik numarası"
                  value={tcknGirdisi}
                  onChangeText={setTcknGirdisi}
                  keyboardType="number-pad"
                  maxLength={11}
                  editable={!tcknGonderiliyor}
                />
                <HataMesaji mesaj={tcknHata} />
                <Buton tur="ikincil" baslik="TCKN Ata" onPress={tcknAtaTikla} yukleniyor={tcknGonderiliyor} />
              </>
            )}
          </Kart>

          <Kart>
            <Text style={tema.yazi.bolum}>Kayıt durumu</Text>
            {aktif ? (
              <>
                <Text style={tema.yazi.kucuk}>
                  Öğrenci ayrıldıysa pasife alın: sınıf listelerinde ve yoklamada görünmez, geçmiş kayıtları korunur.
                  İsterseniz sonradan yeniden aktifleştirebilirsiniz.
                </Text>
                <OnayButonu
                  etiket="Pasife Al"
                  soru="Öğrenci pasife alınsın mı?"
                  onayEtiketi="Evet, pasife al"
                  onOnay={() => aktifligiDegistir(false)}
                />
              </>
            ) : (
              <>
                <Text style={tema.yazi.kucuk}>Bu öğrenci pasif: sınıf listelerinde ve yoklamada görünmüyor.</Text>
                <Buton tur="ikincil" baslik="Yeniden Aktifleştir" onPress={() => aktifligiDegistir(true)} />
              </>
            )}
            <Text style={tema.yazi.kucuk}>
              Yanlışlıkla açılmış bir kaydı tümüyle silebilirsiniz; yoklama kaydı olan öğrenci silinemez, gelişim, ezber ve
              kitap kayıtları öğrenciyle birlikte silinir.
            </Text>
            <HataMesaji mesaj={silmeHatasi} />
            <OnayButonu etiket="Öğrenciyi Sil" onOnay={sil} />
          </Kart>
        </>
      )}
    </Ekran>
  );
}
