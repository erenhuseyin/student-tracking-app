// Erişim: yalnızca ogretmen. Sınıfın öğrencileri: yoklamaya ve öğrencinin gelişim kayıtlarına geçiş
// (kurumun öğretmenler için kapattığı bölümün girişi gösterilmez).
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { Liste } from '@/components/Liste';
import { ListeSatiri } from '@/components/ListeSatiri';
import { useBolumAcik } from '@/lib/menu';
import { ogrencileriGetir } from '@/lib/ogrenciler';
import { sinifGetir } from '@/lib/siniflar';
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

      <Liste
        veri={ogrenciler}
        hata={hata}
        anahtar={(o) => o.id}
        bosIkon="people-outline"
        bosBaslik="Bu sınıfta öğrenci yok"
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
    butonlar: {
      flexDirection: 'row',
      gap: t.bosluk.m,
    },
    buton: {
      flex: 1,
    },
  });
}
