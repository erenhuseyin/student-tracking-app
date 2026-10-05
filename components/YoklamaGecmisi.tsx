// Bir öğrencinin yoklama geçmişi (salt okunur): üstte durum sayıları, altında günler.
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DurumRozeti } from '@/components/DurumRozeti';
import { Kart } from '@/components/Kart';
import { Liste } from '@/components/Liste';
import { ListeSatiri } from '@/components/ListeSatiri';
import { tarihiBicimle } from '@/lib/tarih';
import { bosluk, yazi, yoklamaRenkleri } from '@/lib/tema';
import { type Yoklama, YOKLAMA_DURUMLARI } from '@/lib/tipler';
import { veliYoklamalariGetir, YOKLAMA_ETIKETLERI } from '@/lib/yoklama';

export function YoklamaGecmisi({ ogrenciId }: { ogrenciId: string }) {
  const [kayitlar, setKayitlar] = useState<Yoklama[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setHata(null);
      veliYoklamalariGetir(ogrenciId)
        .then(setKayitlar)
        .catch((e: Error) => setHata(e.message));
    }, [ogrenciId]),
  );

  return (
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
