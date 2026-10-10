// Erişim: yalnızca kurum_admin
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { IkonButon } from '@/components/IkonButon';
import { Liste } from '@/components/Liste';
import { ListeSatiri } from '@/components/ListeSatiri';
import { ICERIK_OZELLIGI } from '@/lib/icerik';
import { ogrencileriGetir } from '@/lib/ogrenciler';
import { useOzellik } from '@/lib/ozellikler';
import { sinifGetir } from '@/lib/siniflar';
import { useTema } from '@/lib/tema';
import type { Ogrenci, Sinif } from '@/lib/tipler';
import { tarihiBicimle } from '@/lib/tarih';

export default function SinifDetay() {
  const router = useRouter();
  const tema = useTema();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [sinif, setSinif] = useState<Sinif | null>(null);
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const icerikAcik = useOzellik(ICERIK_OZELLIGI);

  const yenile = useCallback(async () => {
    setHata(null);
    try {
      const [sinifVerisi, ogrenciVerisi] = await Promise.all([sinifGetir(id), ogrencileriGetir(id)]);
      setSinif(sinifVerisi);
      setOgrenciler(ogrenciVerisi);
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      yenile();
    }, [yenile]),
  );

  return (
    <Ekran>
      <Stack.Screen options={{ title: sinif ? `${sinif.ad} · ${sinif.donem}` : 'Sınıf' }} />

      <Liste
        veri={ogrenciler}
        hata={hata}
        onYenile={yenile}
        anahtar={(o) => o.id}
        bosIkon="people-outline"
        bosBaslik="Bu sınıfta henüz öğrenci yok"
        satir={(o) => (
          <ListeSatiri
            baslik={o.ad_soyad}
            altBaslik={tarihiBicimle(o.dogum_tarihi)}
            sol={<Avatar ad={o.ad_soyad} />}
            sag={<IkonButon ikon="create-outline" etiket="Düzenle" onPress={() => router.push(`/ogrenci-duzenle/${o.id}`)} />}
          />
        )}
      />

      {icerikAcik ? (
        <View style={{ flexDirection: 'row', gap: tema.bosluk.m }}>
          <View style={{ flex: 1 }}>
            <Buton tur="ikincil" baslik="Dersler" onPress={() => router.push(`/ders-takibi/${id}`)} />
          </View>
          <View style={{ flex: 1 }}>
            <Buton tur="ikincil" baslik="Ezber" onPress={() => router.push(`/ezber/${id}`)} />
          </View>
          <View style={{ flex: 1 }}>
            <Buton tur="ikincil" baslik="Kitap" onPress={() => router.push(`/kitap/${id}`)} />
          </View>
        </View>
      ) : null}
      <Buton tur="ikincil" ikon="calendar-outline" baslik="Ders Programı" onPress={() => router.push(`/ders-programi/${id}`)} />
      <Buton tur="ikincil" ikon="grid-outline" baslik="Haftalık Yoklama ve Katılım" onPress={() => router.push(`/sinif-katilim/${id}`)} />
      <Buton
        tur="ikincil"
        ikon="list-outline"
        baslik="Listeden Toplu Ekle"
        onPress={() =>
          router.push({
            pathname: '/toplu-ogrenci',
            params: sinif ? { sinifId: id, kurumId: sinif.kurum_id } : { sinifId: id },
          })
        }
      />
      <Buton
        ikon="add"
        baslik="Yeni Öğrenci Ekle"
        onPress={() =>
          router.push({
            pathname: '/yeni-ogrenci',
            params: sinif ? { sinifId: id, kurumId: sinif.kurum_id } : { sinifId: id },
          })
        }
      />
    </Ekran>
  );
}
