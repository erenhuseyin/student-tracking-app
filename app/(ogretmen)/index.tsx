// Erişim: yalnızca ogretmen
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CikisYapButonu } from '@/components/CikisYapButonu';
import { Ekran } from '@/components/Ekran';
import { Ikon } from '@/components/Ikon';
import { Liste } from '@/components/Liste';
import { ListeSatiri } from '@/components/ListeSatiri';
import { TemaDugmesi } from '@/components/TemaDugmesi';
import { siniflariGetir } from '@/lib/siniflar';
import { useTema } from '@/lib/tema';
import type { Sinif } from '@/lib/tipler';

export default function OgretmenAnaSayfa() {
  const router = useRouter();
  const tema = useTema();
  const [siniflar, setSiniflar] = useState<Sinif[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setHata(null);
      // RLS (sinif_ogretmen_oku politikası) yalnızca öğretmenin atandığı sınıfları döndürür.
      siniflariGetir()
        .then(setSiniflar)
        .catch((e: Error) => setHata(e.message));
    }, []),
  );

  return (
    <Ekran>
      <Stack.Screen
        options={{
          title: 'Sınıflarım',
          headerRight: () => (
            <View style={styles.baslikEylemleri}>
              <TemaDugmesi />
              <CikisYapButonu />
            </View>
          ),
        }}
      />

      <Liste
        veri={siniflar}
        hata={hata}
        anahtar={(s) => s.id}
        bosIkon="school-outline"
        bosBaslik="Henüz size atanmış sınıf yok"
        satir={(s) => (
          <ListeSatiri
            baslik={s.ad}
            altBaslik={`${s.donem} · Yoklama ve gelişim`}
            sol={<Ikon ad="school-outline" boyut={26} renk={tema.renkler.anaParlak} />}
            onPress={() => router.push(`/sinifim/${s.id}`)}
          />
        )}
      />
    </Ekran>
  );
}

const styles = StyleSheet.create({
  baslikEylemleri: {
    flexDirection: 'row',
  },
});
