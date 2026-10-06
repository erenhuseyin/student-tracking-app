// Erişim: yalnızca super_admin
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Buton } from '@/components/Buton';
import { CikisYapButonu } from '@/components/CikisYapButonu';
import { Ekran } from '@/components/Ekran';
import { Ikon } from '@/components/Ikon';
import { Liste } from '@/components/Liste';
import { ListeSatiri } from '@/components/ListeSatiri';
import { TemaDugmesi } from '@/components/TemaDugmesi';
import { kurumlariGetir } from '@/lib/kurumlar';
import { type Tema, useTema } from '@/lib/tema';
import type { Kurum } from '@/lib/tipler';

// Kök kurumlar ada göre, her kökün şubeleri hemen altında.
function agacSirasinaDiz(kurumlar: Kurum[]): Kurum[] {
  return kurumlar
    .filter((k) => !k.ust_kurum_id)
    .flatMap((kok) => [kok, ...kurumlar.filter((k) => k.ust_kurum_id === kok.id)]);
}

export default function SuperAdminAnaSayfa() {
  const router = useRouter();
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const [kurumlar, setKurumlar] = useState<Kurum[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let iptalEdildi = false;
      setHata(null);
      kurumlariGetir()
        .then((veri) => {
          if (!iptalEdildi) setKurumlar(agacSirasinaDiz(veri));
        })
        .catch((e: Error) => {
          if (!iptalEdildi) setHata(e.message);
        });
      return () => {
        iptalEdildi = true;
      };
    }, []),
  );

  return (
    <Ekran>
      <Stack.Screen
        options={{
          title: 'Kurumlar',
          headerRight: () => (
            <View style={styles.baslikEylemleri}>
              <TemaDugmesi />
              <CikisYapButonu />
            </View>
          ),
        }}
      />

      <Liste
        veri={kurumlar}
        hata={hata}
        anahtar={(k) => k.id}
        bosIkon="business-outline"
        bosBaslik="Henüz kurum yok"
        satir={(k) =>
          k.ust_kurum_id ? (
            <View style={styles.sube}>
              <ListeSatiri
                baslik={k.ad}
                altBaslik="Şube"
                sol={<Ikon ad="git-branch-outline" renk={tema.renkler.metinIkincil} />}
              />
            </View>
          ) : (
            <ListeSatiri
              baslik={k.ad}
              altBaslik={k.marka_kodu ? `Marka kodu: ${k.marka_kodu}` : 'Marka kodu yok'}
              sol={<Ikon ad="business-outline" boyut={26} renk={tema.renkler.anaParlak} />}
              onPress={() => router.push(`/kurum/${k.id}`)}
            />
          )
        }
      />

      <Buton ikon="add" baslik="Yeni Kurum Ekle" onPress={() => router.push('/yeni-kurum')} />
    </Ekran>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    baslikEylemleri: {
      flexDirection: 'row',
    },
    sube: {
      marginLeft: t.bosluk.xl,
    },
  });
}
