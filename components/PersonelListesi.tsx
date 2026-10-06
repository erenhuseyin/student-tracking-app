// Bir kurumun personel listesi (yöneticiler + öğretmenler) ve "Personel Ekle" butonu.
// Kurum admini ve süper admin ekranları paylaşır; ikisinde de rotalar aynıdır
// (`/personel/[id]`, `/yeni-personel`).
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Buton } from '@/components/Buton';
import { Liste } from '@/components/Liste';
import { ListeSatiri } from '@/components/ListeSatiri';
import { PersonelDurumRozeti } from '@/components/PersonelDurumRozeti';
import { PERSONEL_ROL_ETIKETLERI, type PersonelRolu, personelleriGetir } from '@/lib/personel';
import { type Tema, useTema } from '@/lib/tema';
import type { Kullanici } from '@/lib/tipler';

export function PersonelListesi({ kurumId }: { kurumId: string }) {
  const router = useRouter();
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const [personel, setPersonel] = useState<Kullanici[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let iptalEdildi = false;
      setHata(null);
      personelleriGetir(kurumId)
        .then((veri) => {
          if (!iptalEdildi) setPersonel(veri);
        })
        .catch((e: Error) => {
          if (!iptalEdildi) setHata(e.message);
        });
      return () => {
        iptalEdildi = true;
      };
    }, [kurumId]),
  );

  return (
    <View style={styles.kapsayici}>
      <Liste
        veri={personel}
        hata={hata}
        anahtar={(k) => k.id}
        bosIkon="people-outline"
        bosBaslik="Henüz personel yok"
        bosAciklama="Aşağıdaki butonla öğretmen ya da yönetici ekleyin."
        satir={(k) => (
          <ListeSatiri
            baslik={k.ad_soyad}
            altBaslik={[PERSONEL_ROL_ETIKETLERI[k.rol as PersonelRolu], k.eposta].filter(Boolean).join(' · ')}
            sol={<Avatar ad={k.ad_soyad} />}
            sag={<PersonelDurumRozeti personel={k} />}
            onPress={() => router.push(`/personel/${k.id}`)}
          />
        )}
      />

      <Buton
        ikon="person-add-outline"
        baslik="Personel Ekle"
        onPress={() => router.push({ pathname: '/yeni-personel', params: { kurumId } })}
      />
    </View>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    kapsayici: {
      flex: 1,
      gap: t.bosluk.m,
    },
  });
}
