// Erişim: yalnızca kurum_admin. Kendi kurumunun sınıflarını yönetir; kurumu kök (müşteri)
// ise ayrıca şubelerine geçebilir.
import { Stack, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Buton } from '@/components/Buton';
import { CikisYapButonu } from '@/components/CikisYapButonu';
import { Ekran } from '@/components/Ekran';
import { SinifListesi } from '@/components/SinifListesi';
import { TemaDugmesi } from '@/components/TemaDugmesi';
import { useOturum } from '@/lib/oturum';
import { type Tema, useTema } from '@/lib/tema';

export default function KurumAdminAnaSayfa() {
  const router = useRouter();
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const { kurum } = useOturum();
  const kokKurumMu = kurum !== null && kurum.ust_kurum_id === null;

  return (
    <Ekran>
      <Stack.Screen
        options={{
          title: 'Sınıflar',
          headerRight: () => (
            <View style={styles.baslikEylemleri}>
              <TemaDugmesi />
              <CikisYapButonu />
            </View>
          ),
        }}
      />

      {kurum ? <Text style={styles.kurumAdi}>{kurum.ad}</Text> : null}
      {kurum ? <SinifListesi kurumId={kurum.id} /> : null}

      <View style={styles.altButonlar}>
        <View style={styles.altButon}>
          <Buton tur="ikincil" ikon="people-outline" baslik="Personel" onPress={() => router.push('/personel')} />
        </View>
        {kokKurumMu ? (
          <View style={styles.altButon}>
            <Buton tur="ikincil" ikon="business-outline" baslik="Şubeler" onPress={() => router.push('/subeler')} />
          </View>
        ) : null}
        {kokKurumMu ? (
          <View style={styles.altButon}>
            <Buton
              tur="ikincil"
              ikon="pricetags-outline"
              baslik="Gelişim Kategorileri"
              onPress={() => router.push('/gelisim-kategorileri')}
            />
          </View>
        ) : null}
      </View>
    </Ekran>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    baslikEylemleri: {
      flexDirection: 'row',
    },
    kurumAdi: {
      ...t.yazi.bolum,
    },
    altButonlar: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: t.bosluk.m,
    },
    // İki sütun; tek kalan buton satırı doldurur.
    altButon: {
      flexGrow: 1,
      flexBasis: '40%',
    },
  });
}
