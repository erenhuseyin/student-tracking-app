// Erişim: yalnızca ogretmen. Sınıfın öğrencileri: yoklamaya ve öğrencinin gelişim kayıtlarına geçiş
// (kurumun öğretmenler için kapattığı bölümün girişi gösterilmez). Müşteride ogretmen_kayit açıksa
// (varsayılan) öğretmen sınıfı düzenler, öğrenci ekler, öğrencinin bilgilerini düzenler ve ayrılan
// (pasif) öğrencileri görüp geri açar.
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { EylemCubugu } from '@/components/EylemCubugu';
import { IkonButon } from '@/components/IkonButon';
import { Liste } from '@/components/Liste';
import { ListeSatiri } from '@/components/ListeSatiri';
import { ICERIK_OZELLIGI } from '@/lib/icerik';
import { useBolumAcik } from '@/lib/menu';
import { ogrencileriGetir } from '@/lib/ogrenciler';
import { OGRETMEN_KAYIT_OZELLIGI, useOzellik } from '@/lib/ozellikler';
import { sinifGetir } from '@/lib/siniflar';
import { tarihiBicimle } from '@/lib/tarih';
import { type Tema, useTema } from '@/lib/tema';
import type { Ogrenci, Sinif } from '@/lib/tipler';

export default function OgretmenSinifi() {
  const router = useRouter();
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const { sinifId } = useLocalSearchParams<{ sinifId: string }>();
  const [sinif, setSinif] = useState<Sinif | null>(null);
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[] | null>(null);
  const [pasifler, setPasifler] = useState<Ogrenci[]>([]);
  const [ayrilanlar, setAyrilanlar] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const yoklamaAcik = useBolumAcik('yoklama');
  const gelisimAcik = useBolumAcik('gelisim');
  const programAcik = useBolumAcik('program');
  // Kurumda içerik takibi açıksa ve öğretmenler için kapatılmadıysa.
  const icerikBolumu = useBolumAcik('icerik');
  const icerikAcik = useOzellik(ICERIK_OZELLIGI) && icerikBolumu;
  const kayitAcik = useOzellik(OGRETMEN_KAYIT_OZELLIGI, true);

  useFocusEffect(
    useCallback(() => {
      setHata(null);
      // RLS (sinif_ogretmen_oku, ogrenci_ogretmen_oku) yalnızca atandığı sınıfı ve öğrencilerini döndürür.
      Promise.all([sinifGetir(sinifId), ogrencileriGetir(sinifId), kayitAcik ? ogrencileriGetir(sinifId, false) : []])
        .then(([s, o, p]) => {
          setSinif(s);
          setOgrenciler(o);
          setPasifler(p);
          if (p.length === 0) setAyrilanlar(false);
        })
        .catch((e: Error) => setHata(e.message));
    }, [sinifId, kayitAcik]),
  );

  const duzenle = (o: Ogrenci) => router.push(`/ogrenci-duzenle/${o.id}`);
  // Ayrılanlar görünümünde ve gelişim kapalıyken satır öğrencinin bilgilerine gider.
  const satiraBasinca =
    ayrilanlar && kayitAcik
      ? duzenle
      : gelisimAcik
        ? (o: Ogrenci) => router.push(`/ogrenci-gelisim/${o.id}`)
        : kayitAcik
          ? duzenle
          : undefined;
  // Satır gelişime gidiyorsa bilgiler sağdaki düğmeyle açılır.
  const duzenleDugmesi = kayitAcik && satiraBasinca !== duzenle;

  return (
    <Ekran>
      <Stack.Screen options={{ title: sinif ? `${sinif.ad} · ${sinif.donem}` : 'Sınıf' }} />

      <EylemCubugu>
        {yoklamaAcik ? (
        <View style={styles.butonlar}>
          <View style={styles.buton}>
            <Buton ikon="checkbox-outline" baslik="Yoklama Al" onPress={() => router.push(`/yoklama/${sinifId}`)} />
          </View>
          <View style={styles.buton}>
            <Buton
              tur="ikincil"
              ikon="grid-outline"
              baslik="Haftalık"
              onPress={() => router.push(`/haftalik-yoklama/${sinifId}`)}
            />
          </View>
        </View>
        ) : null}

        {programAcik ? (
          <Buton
            tur="ikincil"
            ikon="calendar-outline"
            baslik="Ders Programı"
            onPress={() => router.push(`/ders-programi/${sinifId}`)}
          />
        ) : null}

        {kayitAcik ? (
          <View style={styles.butonlar}>
            <View style={styles.buton}>
              <Buton
                tur="ikincil"
                ikon="person-add-outline"
                baslik="Yeni Öğrenci"
                onPress={() => router.push({ pathname: '/yeni-ogrenci', params: { sinifId } })}
              />
            </View>
            <View style={styles.buton}>
              <Buton tur="ikincil" ikon="create-outline" baslik="Sınıfı Düzenle" onPress={() => router.push(`/sinif-duzenle/${sinifId}`)} />
            </View>
          </View>
        ) : null}

        {kayitAcik && (pasifler.length > 0 || ayrilanlar) ? (
          <Buton
            tur="ikincil"
            ikon={ayrilanlar ? 'arrow-back' : 'archive-outline'}
            baslik={ayrilanlar ? 'Sınıf listesine dön' : `Ayrılanlar (${pasifler.length})`}
            onPress={() => setAyrilanlar((a) => !a)}
          />
        ) : null}

        {icerikAcik ? (
          <View style={styles.butonlar}>
            <View style={styles.buton}>
              <Buton tur="ikincil" baslik="Dersler" onPress={() => router.push(`/ders-takibi/${sinifId}`)} />
            </View>
            <View style={styles.buton}>
              <Buton tur="ikincil" baslik="Ezber" onPress={() => router.push(`/ezber/${sinifId}`)} />
            </View>
            <View style={styles.buton}>
              <Buton tur="ikincil" baslik="Kitap" onPress={() => router.push(`/kitap/${sinifId}`)} />
            </View>
          </View>
        ) : null}
      </EylemCubugu>

      <Liste
        veri={ayrilanlar ? pasifler : ogrenciler}
        hata={hata}
        anahtar={(o) => o.id}
        bosIkon="people-outline"
        bosBaslik={ayrilanlar ? 'Ayrılan öğrenci yok' : 'Bu sınıfta öğrenci yok'}
        bosAciklama={!ayrilanlar && kayitAcik ? 'Yukarıdaki "Yeni Öğrenci" düğmesiyle ekleyebilirsiniz.' : undefined}
        sutunlar={[
          { anahtar: 'ad', baslik: ayrilanlar ? 'Ayrılan öğrenci' : 'Öğrenci', icerik: (o) => o.ad_soyad },
          { anahtar: 'dogum', baslik: 'Doğum tarihi', icerik: (o) => tarihiBicimle(o.dogum_tarihi) },
          ...(duzenleDugmesi
            ? [
                {
                  anahtar: 'bilgiler',
                  baslik: '',
                  genislik: 56,
                  hizalama: 'sag' as const,
                  icerik: (o: Ogrenci) => <IkonButon ikon="create-outline" etiket="Bilgileri düzenle" onPress={() => duzenle(o)} />,
                },
              ]
            : []),
        ]}
        onSatirPress={satiraBasinca}
        satir={(o) => (
          <ListeSatiri
            baslik={o.ad_soyad}
            altBaslik={ayrilanlar ? 'Ayrıldı · geri açmak için dokunun' : gelisimAcik ? 'Gelişim kayıtları' : kayitAcik ? 'Bilgiler' : null}
            sol={<Avatar ad={o.ad_soyad} />}
            sag={duzenleDugmesi ? <IkonButon ikon="create-outline" etiket="Bilgileri düzenle" onPress={() => duzenle(o)} /> : undefined}
            onPress={satiraBasinca ? () => satiraBasinca(o) : undefined}
          />
        )}
      />
    </Ekran>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    // 'web' düzeninde düğmeler içeriği kadar geniştir (araç çubuğu); telefonda satırı paylaşır.
    butonlar: {
      flexDirection: 'row',
      gap: t.duzen === 'web' ? t.bosluk.s : t.bosluk.m,
    },
    buton: t.duzen === 'web' ? {} : { flex: 1 },
  });
}
