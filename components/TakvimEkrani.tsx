// Etkinlik takvimi: ay ızgarası (etkinliği olan günler işaretli) + seçilen günün etkinlikleri.
// Etkinlik = `tur = 'etkinlik'` olan duyuru; hangi etkinliklerin görüneceğini RLS belirler (birime
// yazılan etkinlik altındaki herkese, sınıfa yazılan o sınıfa). Aynı güne birden çok etkinlik olur.
// Erişim: dört rol de okur; yönetici ve öğretmen takvimden etkinlik ekler (yeni duyuru formu,
// tür ve tarih dolu açılır). Web'de ızgara solda, gün listesi sağda; telefonda alt alta.
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BosDurum } from '@/components/BosDurum';
import { Buton } from '@/components/Buton';
import { DuyuruKarti } from '@/components/DuyuruKarti';
import { Ekran } from '@/components/Ekran';
import { EylemCubugu } from '@/components/EylemCubugu';
import { HataMesaji } from '@/components/HataMesaji';
import { IkonButon } from '@/components/IkonButon';
import { Kart } from '@/components/Kart';
import { type DuyuruSatiri, etkinlikleriGetir, etkinlikZamaniniParcala } from '@/lib/duyurular';
import { useOturum } from '@/lib/oturum';
import {
  ayAnahtari,
  ayBasligi,
  ayEkle,
  ayIzgarasi,
  bugununTarihi,
  GUN_KISA_ADLARI,
  tarihGecerliMi,
  tarihiBicimle,
} from '@/lib/tarih';
import { type Tema, useTema } from '@/lib/tema';

export function TakvimEkrani() {
  const router = useRouter();
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const { kullanici } = useOturum();
  const { tarih: istenenTarih } = useLocalSearchParams<{ tarih?: string }>();
  const bugun = bugununTarihi();
  const baslangic = istenenTarih && tarihGecerliMi(istenenTarih) ? istenenTarih : bugun;
  const [secili, setSecili] = useState(baslangic);
  const [ay, setAy] = useState(ayAnahtari(baslangic));
  const [etkinlikler, setEtkinlikler] = useState<DuyuruSatiri[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const ekleyebilir = kullanici?.rol === 'kurum_admin' || kullanici?.rol === 'ogretmen';
  const web = tema.duzen === 'web';

  const gunler = useMemo(() => ayIzgarasi(ay), [ay]);

  useFocusEffect(
    useCallback(() => {
      let iptalEdildi = false;
      setHata(null);
      etkinlikleriGetir(gunler[0].tarih, gunler[gunler.length - 1].tarih)
        .then((veri) => {
          if (!iptalEdildi) setEtkinlikler(veri);
        })
        .catch((e: Error) => {
          if (!iptalEdildi) setHata(e.message);
        });
      return () => {
        iptalEdildi = true;
      };
    }, [gunler]),
  );

  // Gün -> o günün etkinlikleri (cihazın saatine göre).
  const gunlereGore = useMemo(() => {
    const harita = new Map<string, DuyuruSatiri[]>();
    for (const e of etkinlikler ?? []) {
      if (!e.etkinlik_zamani) continue;
      const gun = etkinlikZamaniniParcala(e.etkinlik_zamani).tarih;
      harita.set(gun, [...(harita.get(gun) ?? []), e]);
    }
    return harita;
  }, [etkinlikler]);

  const ayDegistir = (fark: number) => {
    const yeni = ayEkle(ay, fark);
    setAy(yeni);
    // Seçili gün yeni ayda değilse ayın ilk günü (bu aysa bugün) seçilir.
    setSecili(ayAnahtari(bugun) === yeni ? bugun : `${yeni}-01`);
  };

  const gunSec = (tarih: string) => {
    setSecili(tarih);
    if (ayAnahtari(tarih) !== ay) setAy(ayAnahtari(tarih));
  };

  const etkinlikEkle = () => router.push({ pathname: '/yeni-duyuru', params: { tur: 'etkinlik', tarih: secili } });
  const seciliGunEtkinlikleri = gunlereGore.get(secili) ?? [];

  const izgara = (
    <Kart>
      <View style={styles.ayBasi}>
        <IkonButon ikon="chevron-back" etiket="Önceki ay" onPress={() => ayDegistir(-1)} />
        <Text style={[tema.yazi.bolum, styles.ayAdi]}>{ayBasligi(ay)}</Text>
        <IkonButon ikon="chevron-forward" etiket="Sonraki ay" onPress={() => ayDegistir(1)} />
      </View>
      <View style={styles.hafta}>
        {GUN_KISA_ADLARI.map((g) => (
          <Text key={g} style={[tema.yazi.kucuk, styles.gunAdi]}>
            {g}
          </Text>
        ))}
      </View>
      <View style={styles.gunler}>
        {gunler.map((g) => {
          const sayi = gunlereGore.get(g.tarih)?.length ?? 0;
          const seciliMi = g.tarih === secili;
          return (
            <Pressable
              key={g.tarih}
              accessibilityRole="button"
              accessibilityLabel={`${tarihiBicimle(g.tarih)}${sayi ? `, ${sayi} etkinlik` : ''}`}
              accessibilityState={{ selected: seciliMi }}
              onPress={() => gunSec(g.tarih)}
              style={({ pressed }) => [
                styles.gun,
                g.tarih === bugun && styles.bugun,
                seciliMi && styles.seciliGun,
                pressed && styles.basili,
              ]}
            >
              <Text
                style={[
                  tema.yazi.govde,
                  !g.buAy && styles.digerAy,
                  seciliMi && styles.seciliMetin,
                ]}
              >
                {Number(g.tarih.slice(8))}
              </Text>
              <View style={[styles.isaret, sayi > 0 && { backgroundColor: seciliMi ? tema.renkler.anaUzeriMetin : tema.renkler.vurgu }]} />
            </Pressable>
          );
        })}
      </View>
    </Kart>
  );

  const gunListesi = (
    <View style={styles.gunListesi}>
      <Text style={tema.yazi.bolum}>{tarihiBicimle(secili)}</Text>
      {etkinlikler === null && !hata ? <Text style={tema.yazi.kucuk}>Yükleniyor…</Text> : null}
      {etkinlikler && seciliGunEtkinlikleri.length === 0 ? (
        <BosDurum
          ikon="calendar-outline"
          baslik="Bu gün etkinlik yok"
          aciklama={ekleyebilir ? 'Etkinlik eklemek için "Etkinlik Ekle"ye dokunun.' : undefined}
        />
      ) : null}
      {seciliGunEtkinlikleri.map((e) => (
        <DuyuruKarti
          key={e.id}
          duyuru={e}
          eylemler={
            e.giren_kullanici_id === kullanici?.id ? (
              <IkonButon
                ikon="create-outline"
                etiket="Düzenle"
                onPress={() => router.push({ pathname: '/duyuru-duzenle/[id]', params: { id: e.id } })}
              />
            ) : undefined
          }
        />
      ))}
    </View>
  );

  return (
    <Ekran genis={web}>
      <Stack.Screen options={{ title: 'Takvim' }} />
      {ekleyebilir ? (
        <EylemCubugu>
          <Buton ikon="add" baslik="Etkinlik Ekle" onPress={etkinlikEkle} />
          {secili !== bugun ? <Buton tur="ikincil" baslik="Bugün" onPress={() => gunSec(bugun)} /> : null}
        </EylemCubugu>
      ) : null}
      <HataMesaji mesaj={hata} />
      <ScrollView style={styles.kaydirma} contentContainerStyle={web ? styles.yanYana : styles.altAlta}>
        <View style={web ? styles.izgaraSutunu : undefined}>{izgara}</View>
        {gunListesi}
      </ScrollView>
    </Ekran>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    kaydirma: {
      flex: 1,
    },
    yanYana: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: t.bosluk.l,
      paddingBottom: t.bosluk.l,
    },
    altAlta: {
      gap: t.bosluk.m,
      paddingBottom: t.bosluk.l,
    },
    izgaraSutunu: {
      width: 380,
      flexShrink: 0,
    },
    ayBasi: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    ayAdi: {
      textTransform: 'capitalize',
    },
    hafta: {
      flexDirection: 'row',
    },
    gunAdi: {
      flex: 1,
      textAlign: 'center',
    },
    gunler: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    gun: {
      width: `${100 / 7}%`,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      borderRadius: t.yaricap.m,
    },
    bugun: {
      borderWidth: 1,
      borderColor: t.renkler.ana,
    },
    seciliGun: {
      backgroundColor: t.renkler.ana,
    },
    seciliMetin: {
      color: t.renkler.anaUzeriMetin,
    },
    digerAy: {
      color: t.renkler.metinIkincil,
      opacity: 0.6,
    },
    isaret: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    basili: {
      opacity: 0.7,
    },
    gunListesi: {
      flex: 1,
      minWidth: 0,
      gap: t.bosluk.m,
    },
  });
}
