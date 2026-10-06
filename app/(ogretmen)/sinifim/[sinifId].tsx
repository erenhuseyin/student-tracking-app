// Erişim: yalnızca ogretmen. Sınıfın öğrencileri: yoklamaya ve öğrencinin gelişim kayıtlarına geçiş.
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { Liste } from '@/components/Liste';
import { ListeSatiri } from '@/components/ListeSatiri';
import { ogrencileriGetir } from '@/lib/ogrenciler';
import { sinifGetir } from '@/lib/siniflar';
import { bosluk } from '@/lib/tema';
import type { Ogrenci, Sinif } from '@/lib/tipler';

export default function OgretmenSinifi() {
  const router = useRouter();
  const { sinifId } = useLocalSearchParams<{ sinifId: string }>();
  const [sinif, setSinif] = useState<Sinif | null>(null);
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);

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

      <Liste
        veri={ogrenciler}
        hata={hata}
        anahtar={(o) => o.id}
        bosIkon="people-outline"
        bosBaslik="Bu sınıfta öğrenci yok"
        satir={(o) => (
          <ListeSatiri
            baslik={o.ad_soyad}
            altBaslik="Gelişim kayıtları"
            sol={<Avatar ad={o.ad_soyad} />}
            onPress={() => router.push(`/ogrenci-gelisim/${o.id}`)}
          />
        )}
      />
    </Ekran>
  );
}

const styles = StyleSheet.create({
  butonlar: {
    flexDirection: 'row',
    gap: bosluk.m,
  },
  buton: {
    flex: 1,
  },
});
