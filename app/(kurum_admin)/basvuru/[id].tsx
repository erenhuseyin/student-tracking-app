// Erişim: yalnızca kurum_admin (yönettiği kurumlara gelen başvurular; RLS). Başvuruyu onaylar
// (öğrenci: sınıf seçilir, öğrenci + veli hesabı açılır; personel: öğretmen hesabı açılır ve
// giriş kodu e-postayla gider) ya da reddeder. Sonuçlanmış başvuru silinebilir.
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Buton } from '@/components/Buton';
import { Chip } from '@/components/Chip';
import { Ekran } from '@/components/Ekran';
import { Girdi } from '@/components/Girdi';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { OnayButonu } from '@/components/OnayButonu';
import { Yukleniyor } from '@/components/Yukleniyor';
import {
  BASVURU_DURUMU_ETIKETLERI,
  BASVURU_TURU_ETIKETLERI,
  basvuruGetir,
  basvuruSil,
  basvuruyuOnayla,
  basvuruyuReddet,
} from '@/lib/basvurular';
import { etkinlikZamaniniParcala } from '@/lib/duyurular';
import { kurumGetir } from '@/lib/kurumlar';
import { siniflariGetir } from '@/lib/siniflar';
import { tarihiBicimle } from '@/lib/tarih';
import { type Tema, useTema } from '@/lib/tema';
import type { Basvuru, Sinif } from '@/lib/tipler';

const mesajaCevir = (e: unknown) => (e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');

export default function BasvuruDetay() {
  const router = useRouter();
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [basvuru, setBasvuru] = useState<Basvuru | null>(null);
  const [kurumAdi, setKurumAdi] = useState('');
  const [siniflar, setSiniflar] = useState<Sinif[]>([]);
  const [sinifId, setSinifId] = useState<string | null>(null);
  const [kararNotu, setKararNotu] = useState('');
  const [calisan, setCalisan] = useState<'onay' | 'ret' | null>(null);
  const [mesaj, setMesaj] = useState<{ tur: 'hata' | 'basari'; metin: string } | null>(null);
  const [yuklemeHatasi, setYuklemeHatasi] = useState<string | null>(null);

  useEffect(() => {
    let iptalEdildi = false;
    basvuruGetir(id)
      .then(async (b) => {
        // Sınıf yalnızca başvurulan kurumdan seçilir (öğrenci o kurumda kaydedilir).
        const [kurum, sinifListesi] = await Promise.all([kurumGetir(b.kurum_id), b.tur === 'ogrenci' ? siniflariGetir(b.kurum_id) : []]);
        if (iptalEdildi) return;
        setBasvuru(b);
        setKurumAdi(kurum.ad);
        setSiniflar(sinifListesi);
      })
      .catch((e) => {
        if (!iptalEdildi) setYuklemeHatasi(mesajaCevir(e));
      });
    return () => {
      iptalEdildi = true;
    };
  }, [id]);

  if (yuklemeHatasi) {
    return (
      <Ekran>
        <Stack.Screen options={{ title: 'Başvuru' }} />
        <HataMesaji mesaj={yuklemeHatasi} />
      </Ekran>
    );
  }
  if (!basvuru) {
    return (
      <Ekran>
        <Stack.Screen options={{ title: 'Başvuru' }} />
        <Yukleniyor />
      </Ekran>
    );
  }

  const ogrenci = basvuru.tur === 'ogrenci';
  const bekliyor = basvuru.durum === 'bekliyor';
  const mesgul = calisan !== null;

  const onayla = async () => {
    if (ogrenci && !sinifId) {
      setMesaj({ tur: 'hata', metin: 'Öğrencinin sınıfını seçin.' });
      return;
    }
    setCalisan('onay');
    setMesaj(null);
    try {
      const sonuc = await basvuruyuOnayla(basvuru.id, sinifId ?? undefined);
      setBasvuru(await basvuruGetir(basvuru.id));
      setMesaj({
        tur: 'basari',
        metin: ogrenci
          ? `Öğrenci kaydedildi ve veli hesabı açıldı. Veli, "${sonuc.kullanici_adi ?? '(öğrencinin ekranında yazar)'}" kullanıcı adı ve "1234" PIN'i ile giriş yapar; ilk girişte yeni PIN belirler. Lütfen veliye bildirin.`
          : sonuc.eposta_gonderildi
            ? 'Öğretmen hesabı açıldı ve giriş kodu e-postayla gönderildi. Sınıf atamasını Personel ekranından yapın.'
            : 'Öğretmen hesabı açıldı ama e-posta gönderilemedi. Personel ekranından giriş kodunu yeniden gönderin.',
      });
    } catch (e) {
      setMesaj({ tur: 'hata', metin: mesajaCevir(e) });
    } finally {
      setCalisan(null);
    }
  };

  const reddet = async () => {
    setCalisan('ret');
    setMesaj(null);
    try {
      await basvuruyuReddet(basvuru.id, kararNotu);
      setBasvuru(await basvuruGetir(basvuru.id));
    } catch (e) {
      setMesaj({ tur: 'hata', metin: mesajaCevir(e) });
    } finally {
      setCalisan(null);
    }
  };

  const satir = (etiket: string, deger: string | null) =>
    deger ? (
      <View style={styles.satir}>
        <Text style={tema.yazi.etiket}>{etiket}</Text>
        <Text style={tema.yazi.govde}>{deger}</Text>
      </View>
    ) : null;

  return (
    <Ekran kaydirilabilir>
      <Stack.Screen options={{ title: BASVURU_TURU_ETIKETLERI[basvuru.tur] }} />

      <Kart>
        {satir('Durum', BASVURU_DURUMU_ETIKETLERI[basvuru.durum])}
        {satir('Kurum', kurumAdi)}
        {satir('Başvuru tarihi', tarihiBicimle(etkinlikZamaniniParcala(basvuru.olusturma_tarihi).tarih))}
        {satir(ogrenci ? 'Öğrenci' : 'Ad soyad', basvuru.ad_soyad)}
        {satir('Doğum tarihi', basvuru.dogum_tarihi ? tarihiBicimle(basvuru.dogum_tarihi) : null)}
        {satir('Veli', basvuru.veli_ad_soyad)}
        {satir('Veli telefonu', basvuru.veli_telefon)}
        {satir('E-posta', basvuru.eposta)}
        {satir('Başvuranın notu', basvuru.not_metni)}
        {satir('Karar notu', basvuru.karar_notu)}
      </Kart>

      <HataMesaji mesaj={mesaj?.metin} tur={mesaj?.tur} />

      {bekliyor ? (
        <>
          <Kart>
            <Text style={tema.yazi.bolum}>Onayla</Text>
            {ogrenci ? (
              siniflar.length === 0 ? (
                <Text style={tema.yazi.kucuk}>Bu kurumda henüz sınıf yok; önce sınıf ekleyin.</Text>
              ) : (
                <View style={styles.satir}>
                  <Text style={tema.yazi.etiket}>Öğrencinin sınıfı</Text>
                  <View style={styles.cipler}>
                    {siniflar.map((s) => (
                      <Chip key={s.id} etiket={s.ad} secili={sinifId === s.id} onPress={() => setSinifId(s.id)} pasif={mesgul} />
                    ))}
                  </View>
                </View>
              )
            ) : (
              <Text style={tema.yazi.kucuk}>
                Onaylarsanız bu kişi öğretmen olarak eklenir ve e-posta adresine giriş kodu gönderilir.
              </Text>
            )}
            <Buton baslik="Onayla" ikon="checkmark" onPress={onayla} yukleniyor={calisan === 'onay'} pasif={mesgul} />
          </Kart>

          <Kart>
            <Text style={tema.yazi.bolum}>Reddet</Text>
            <Girdi
              etiket="Not (isteğe bağlı; yalnızca yöneticiler görür)"
              value={kararNotu}
              onChangeText={setKararNotu}
              editable={!mesgul}
              maxLength={500}
            />
            <Text style={tema.yazi.kucuk}>Başvurana uygulamadan bildirim gitmez; sonucu kendisine siz iletin.</Text>
            <Buton tur="tehlike" baslik="Reddet" onPress={reddet} yukleniyor={calisan === 'ret'} pasif={mesgul} />
          </Kart>
        </>
      ) : (
        <Kart>
          <Text style={tema.yazi.kucuk}>
            Başvuru sonuçlandı. Kişisel verileri saklamamak için başvuru kaydını silebilirsiniz; açılan öğrenci ya da
            personel kaydı bundan etkilenmez.
          </Text>
          <OnayButonu
            etiket="Başvuru Kaydını Sil"
            onOnay={async () => {
              try {
                await basvuruSil(basvuru.id);
                router.back();
              } catch (e) {
                setMesaj({ tur: 'hata', metin: mesajaCevir(e) });
              }
            }}
          />
        </Kart>
      )}
    </Ekran>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    satir: {
      gap: t.bosluk.xs,
    },
    cipler: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: t.bosluk.s,
    },
  });
}
