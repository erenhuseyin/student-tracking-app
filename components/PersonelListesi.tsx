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
import { gorevleriGetir } from '@/lib/gorevler';
import { rolEtiketi } from '@/lib/menu';
import { personelleriGetir } from '@/lib/personel';
import { type Tema, useTema } from '@/lib/tema';
import type { Gorev, Kullanici } from '@/lib/tipler';
import { useKurum } from '@/lib/useKurum';

// `detayRotasi`: satıra dokununca açılan ekran (kurum yöneticisinde salt okunur detay, süper adminde
// düzenleme ekranı).
export function PersonelListesi({
  kurumId,
  detayRotasi = '/personel',
}: {
  kurumId: string;
  detayRotasi?: '/personel' | '/personel-detay';
}) {
  const router = useRouter();
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const [personel, setPersonel] = useState<Kullanici[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [gorevler, setGorevler] = useState<Gorev[]>([]);
  const { kurum } = useKurum(kurumId);
  // Tanımlı rolü olan kişi o rolün adıyla görünür; roller okunamazsa sistem rolü yazılır.
  const rolu = (k: Kullanici) => rolEtiketi(k.rol, kurum, gorevler.find((g) => g.id === k.gorev_id)?.ad);

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
      gorevleriGetir()
        .then((veri) => {
          if (!iptalEdildi) setGorevler(veri);
        })
        .catch(() => {});
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
          { anahtar: 'rol', baslik: 'Rol', icerik: rolu },
          { anahtar: 'eposta', baslik: 'E-posta', icerik: (k) => k.eposta ?? '' },
          { anahtar: 'durum', baslik: 'Durum', genislik: 160, icerik: (k) => <PersonelDurumRozeti personel={k} /> },
        ]}
        onSatirPress={(k) => router.push(`${detayRotasi}/${k.id}`)}
        satir={(k) => (
          <ListeSatiri
            baslik={k.ad_soyad}
            altBaslik={[rolu(k), k.eposta].filter(Boolean).join(' · ')}
            sol={<Avatar ad={k.ad_soyad} />}
            sag={<PersonelDurumRozeti personel={k} />}
            onPress={() => router.push(`${detayRotasi}/${k.id}`)}
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
