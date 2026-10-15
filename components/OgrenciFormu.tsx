// Öğrenci düzenleme formu: bilgiler, veli girişi (kullanıcı adı / PIN), pasife alma ve silme.
// Erişim: kurum_admin (yönettiği kurumların öğrencileri; RLS) ve öğretmen (sınıfının öğrencileri,
// ogretmen_kayit bayrağı açıksa). Öğretmen silemez ve PIN sıfırlayamaz; bu düğmeler ona gösterilmez.
// Hem `/ogrenci-duzenle/[id]` ekranında hem Öğrenciler tablosunun yan panelinde kullanılır.
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { Buton } from '@/components/Buton';
import { Girdi } from '@/components/Girdi';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { OnayButonu } from '@/components/OnayButonu';
import { Secenekler } from '@/components/Secenekler';
import { TarihGirdisi } from '@/components/TarihGirdisi';
import { Yukleniyor } from '@/components/Yukleniyor';
import { CINSIYET_SECENEKLERI, cinsiyetGirdisi } from '@/lib/cinsiyet';
import { ogrenciAktifliginiAyarla, ogrenciGetir, ogrenciGuncelle, ogrenciSil, veliGirisiniAc, veliPininiSifirla } from '@/lib/ogrenciler';
import { useOturum } from '@/lib/oturum';
import { useToast } from '@/lib/toast';
import { useTema } from '@/lib/tema';

type Props = {
  id: string;
  // Tablo + panel ekranlarında (bkz. VeriEkrani): kayıt değişince liste tazelenir, silinince panel
  // kapanır. Verilmezse kaydetme ve silmeden sonra önceki ekrana dönülür.
  onDegisti?: () => void;
  onSilindi?: () => void;
};

export function OgrenciFormu({ id, onDegisti, onSilindi }: Props) {
  const router = useRouter();
  const tema = useTema();
  const yonetici = useOturum().kullanici?.rol !== 'ogretmen';
  const [adSoyad, setAdSoyad] = useState('');
  const [dogumTarihi, setDogumTarihi] = useState('');
  const [cinsiyet, setCinsiyet] = useState<'' | 'kadin' | 'erkek'>('');
  // Velinin giriş adı; null ise veli girişi açılmamış (eklenirken açılamamış ya da eski kayıt).
  const [kullaniciAdi, setKullaniciAdi] = useState<string | null>(null);
  const [aktif, setAktif] = useState(true);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const [girisAciliyor, setGirisAciliyor] = useState(false);
  const [girisHatasi, setGirisHatasi] = useState<string | null>(null);

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
        setCinsiyet(o.cinsiyet ?? '');
        setKullaniciAdi(o.kullanici_adi);
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
      await ogrenciGuncelle(id, adSoyad, dogumTarihi, cinsiyetGirdisi(cinsiyet));
      toast('Öğrenci kaydedildi');
      if (onDegisti) onDegisti();
      else router.back();
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
      onDegisti?.();
    } catch (e) {
      setSilmeHatasi(e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');
    }
  };

  const sil = async () => {
    setSilmeHatasi(null);
    try {
      await ogrenciSil(id);
      toast('Öğrenci silindi');
      if (onSilindi) onSilindi();
      else router.back();
    } catch (e) {
      setSilmeHatasi(e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');
    }
  };

  const girisiAc = async () => {
    setGirisAciliyor(true);
    setGirisHatasi(null);
    try {
      setKullaniciAdi(await veliGirisiniAc(id));
      onDegisti?.();
    } catch (e) {
      setGirisHatasi(e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');
    } finally {
      setGirisAciliyor(false);
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

  if (yukleniyor) return <Yukleniyor />;

  return (
    <>
      <Kart>
        <Text style={tema.yazi.bolum}>Bilgiler</Text>
        <Girdi etiket="Ad soyad" value={adSoyad} onChangeText={setAdSoyad} editable={!gonderiliyor} />
        <TarihGirdisi etiket="Doğum tarihi" deger={dogumTarihi} onDegis={setDogumTarihi} pasif={gonderiliyor} />
        <Secenekler etiket="Cinsiyet" secenekler={CINSIYET_SECENEKLERI} secili={cinsiyet} onSec={setCinsiyet} pasif={gonderiliyor} />
        <HataMesaji mesaj={hata} />
        <Buton baslik="Kaydet" onPress={kaydet} yukleniyor={gonderiliyor} />
      </Kart>

      <Kart>
        <Text style={tema.yazi.bolum}>Veli girişi</Text>
        {kullaniciAdi ? (
          <>
            <Girdi etiket="Kullanıcı adı (değişmez)" value={kullaniciAdi} editable={false} />
            {yonetici ? (
              <>
                <Text style={tema.yazi.kucuk}>
                  Veli bu kullanıcı adı ve PIN ile giriş yapar. İlk PIN &quot;1234&quot;tür; veli ilk girişte yenisini belirler. PIN
                  unutulursa ya da hesap kilitlenirse sıfırlayın: PIN yeniden &quot;1234&quot; olur.
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
              <Text style={tema.yazi.kucuk}>
                Veli bu kullanıcı adı ve PIN ile giriş yapar. İlk PIN &quot;1234&quot;tür; veli ilk girişte yenisini belirler. PIN
                unutulursa ya da hesap kilitlenirse yöneticiniz sıfırlar.
              </Text>
            )}
          </>
        ) : (
          <>
            <Text style={tema.yazi.kucuk}>
              Bu öğrenci için veli girişi açılmamış. Açınca öğrencinin adından bir kullanıcı adı üretilir (örn.
              ali.yilmaz) ve PIN &quot;1234&quot; olur; veli ilk girişte yenisini belirler.
            </Text>
            <HataMesaji mesaj={girisHatasi} />
            <Buton tur="ikincil" baslik="Veli Girişini Aç" onPress={girisiAc} yukleniyor={girisAciliyor} />
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
        {yonetici ? (
          <Text style={tema.yazi.kucuk}>
            Yanlışlıkla açılmış bir kaydı tümüyle silebilirsiniz; yoklama kaydı olan öğrenci silinemez, gelişim, ezber ve
            kitap kayıtları öğrenciyle birlikte silinir.
          </Text>
        ) : null}
        <HataMesaji mesaj={silmeHatasi} />
        {yonetici ? <OnayButonu etiket="Öğrenciyi Sil" onOnay={sil} /> : null}
      </Kart>
    </>
  );
}
