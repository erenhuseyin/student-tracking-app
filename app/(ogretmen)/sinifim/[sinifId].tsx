// Erişim: yalnızca ogretmen. Sınıfın öğrencileri: yoklamaya ve öğrencinin gelişim kayıtlarına geçiş
// (kurumun öğretmenler için kapattığı bölümün girişi gösterilmez).
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { EylemCubugu } from '@/components/EylemCubugu';
import { Liste } from '@/components/Liste';
import { ListeSatiri } from '@/components/ListeSatiri';
import { ICERIK_OZELLIGI } from '@/lib/icerik';
import { useBolumAcik } from '@/lib/menu';
import { ogrencileriGetir } from '@/lib/ogrenciler';
import { useOzellik } from '@/lib/ozellikler';
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
  const [hata, setHata] = useState<string | null>(null);
  const yoklamaAcik = useBolumAcik('yoklama');
  const gelisimAcik = useBolumAcik('gelisim');
  const programAcik = useBolumAcik('program');
  // Kurumda içerik takibi açıksa ve öğretmenler için kapatılmadıysa.
  const icerikBolumu = useBolumAcik('icerik');
  const icerikAcik = useOzellik(ICERIK_OZELLIGI) && icerikBolumu;

  useFocusEffect(
    useCallback(() => {
      setHata(null);
      // RLS (sinif_ogretmen_oku, ogrenci_ogretmen_oku) yalnızca atandığı sınıfı ve öğrencilerini döndürür.
      Promise.all([sinifGetir(sinifId), ogrencileriGetir(sinifId)])
        .then(([s, o]) => {
          setSinif(s);
          setOgrenciler(o);
        })
        .catch((e: Error) => setHata(e.message));
    }, [sinifId]),
  );

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
        veri={ogrenciler}
        hata={hata}
        anahtar={(o) => o.id}
        bosIkon="people-outline"
        bosBaslik="Bu sınıfta öğrenci yok"
        sutunlar={[
          { anahtar: 'ad', baslik: 'Öğrenci', icerik: (o) => o.ad_soyad },
          { anahtar: 'dogum', baslik: 'Doğum tarihi', icerik: (o) => tarihiBicimle(o.dogum_tarihi) },
        ]}
        onSatirPress={gelisimAcik ? (o) => router.push(`/ogrenci-gelisim/${o.id}`) : undefined}
        satir={(o) => (
          <ListeSatiri
            baslik={o.ad_soyad}
            altBaslik={gelisimAcik ? 'Gelişim kayıtları' : null}
            sol={<Avatar ad={o.ad_soyad} />}
            onPress={gelisimAcik ? () => router.push(`/ogrenci-gelisim/${o.id}`) : undefined}
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
