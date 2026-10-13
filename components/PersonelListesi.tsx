// Bir kurumun personel listesi (yöneticiler + öğretmenler); personel ekleme başlık çubuğundaki "+".
// Kurum admini ve süper admin ekranları paylaşır; ikisinde de rotalar aynıdır
// (`/personel/[id]`, `/yeni-personel`).
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { BaslikEkleButonu } from '@/components/BaslikEkleButonu';
import { Liste } from '@/components/Liste';
import { ListeSatiri } from '@/components/ListeSatiri';
import { PersonelDurumRozeti } from '@/components/PersonelDurumRozeti';
import { rolEtiketi } from '@/lib/menu';
import { personelleriGetir } from '@/lib/personel';
import { type Tema, useTema } from '@/lib/tema';
import type { Kullanici } from '@/lib/tipler';
import { useKurum } from '@/lib/useKurum';

export function PersonelListesi({ kurumId }: { kurumId: string }) {
  const router = useRouter();
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const [personel, setPersonel] = useState<Kullanici[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const { kurum } = useKurum(kurumId);

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
      <BaslikEkleButonu
        etiket="Personel ekle"
        onPress={() => router.push({ pathname: '/yeni-personel', params: { kurumId } })}
      />
      <Liste
        veri={personel}
        hata={hata}
        anahtar={(k) => k.id}
        bosIkon="people-outline"
        bosBaslik="Henüz personel yok"
        bosAciklama="Sağ üstteki + ile öğretmen ya da yönetici ekleyin."
        sutunlar={[
          { anahtar: 'ad', baslik: 'Ad Soyad', icerik: (k) => k.ad_soyad },
          { anahtar: 'rol', baslik: 'Rol', icerik: (k) => rolEtiketi(k.rol, kurum) },
          { anahtar: 'eposta', baslik: 'E-posta', icerik: (k) => k.eposta ?? '' },
          { anahtar: 'durum', baslik: 'Durum', genislik: 160, icerik: (k) => <PersonelDurumRozeti personel={k} /> },
        ]}
        onSatirPress={(k) => router.push(`/personel/${k.id}`)}
        satir={(k) => (
          <ListeSatiri
            baslik={k.ad_soyad}
            altBaslik={[rolEtiketi(k.rol, kurum), k.eposta].filter(Boolean).join(' · ')}
            sol={<Avatar ad={k.ad_soyad} />}
            sag={<PersonelDurumRozeti personel={k} />}
            onPress={() => router.push(`/personel/${k.id}`)}
          />
        )}
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
