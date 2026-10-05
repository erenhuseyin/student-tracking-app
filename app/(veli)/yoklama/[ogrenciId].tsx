// Erişim: yalnızca veli
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DurumRozeti } from '@/components/DurumRozeti';
import { Ekran } from '@/components/Ekran';
import { Kart } from '@/components/Kart';
import { Liste } from '@/components/Liste';
import { ListeSatiri } from '@/components/ListeSatiri';
import { ogrenciGetir } from '@/lib/ogrenciler';
import { bosluk, yazi, yoklamaRenkleri } from '@/lib/tema';
import { type Ogrenci, type Yoklama, YOKLAMA_DURUMLARI } from '@/lib/tipler';
import { tarihiBicimle, veliYoklamalariGetir, YOKLAMA_ETIKETLERI } from '@/lib/yoklama';

export default function VeliYoklamaGecmisi() {
  const { ogrenciId } = useLocalSearchParams<{ ogrenciId: string }>();
  const [ogrenci, setOgrenci] = useState<Ogrenci | null>(null);
  const [kayitlar, setKayitlar] = useState<Yoklama[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setHata(null);
      Promise.all([ogrenciGetir(ogrenciId), veliYoklamalariGetir(ogrenciId)])
        .then(([o, y]) => {
          setOgrenci(o);
          setKayitlar(y);
        })
        .catch((e: Error) => setHata(e.message));
    }, [ogrenciId]),
  );

  return (
    <Ekran>
      <Stack.Screen options={{ title: ogrenci ? ogrenci.ad_soyad : 'Yoklama Geçmişi' }} />

      <Liste
        veri={kayitlar}
        hata={hata}
        anahtar={(y) => y.id}
        bosIkon="calendar-outline"
        bosBaslik="Henüz yoklama kaydı yok"
        ust={
          <Kart stil={styles.ozet}>
            {YOKLAMA_DURUMLARI.map((durum) => (
              <View key={durum} style={styles.ozetHucre}>
                <Text style={[yazi.baslik, { color: yoklamaRenkleri[durum].renk }]}>
                  {(kayitlar ?? []).filter((k) => k.durum === durum).length}
                </Text>
                <Text style={yazi.kucuk}>{YOKLAMA_ETIKETLERI[durum]}</Text>
              </View>
            ))}
          </Kart>
        }
        satir={(y) => <ListeSatiri baslik={tarihiBicimle(y.tarih)} sag={<DurumRozeti durum={y.durum} />} />}
      />
    </Ekran>
  );
}

const styles = StyleSheet.create({
  ozet: {
    flexDirection: 'row',
    marginBottom: bosluk.m,
  },
  ozetHucre: {
    flex: 1,
    alignItems: 'center',
    gap: bosluk.xs,
  },
});
