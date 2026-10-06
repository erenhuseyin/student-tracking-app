// Bir öğrencinin yoklama geçmişi (salt okunur): üstte bu haftanın katılım oranı ve durum
// sayıları, altında günler. Oran kuralları için bkz. lib/katilim.ts.
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DurumRozeti } from '@/components/DurumRozeti';
import { Kart } from '@/components/Kart';
import { SON_HAFTA_SAYISI } from '@/components/KatilimListesi';
import { Liste } from '@/components/Liste';
import { ListeSatiri } from '@/components/ListeSatiri';
import { araliktakiler, haftadakiler, katilimHesapla, katilimMetni, yuzdeMetni } from '@/lib/katilim';
import { bugununTarihi, gunEkle, haftaBaslangici, tarihiBicimle } from '@/lib/tarih';
import { bosluk, katilimRengi, renkler, yazi, yoklamaRenkleri } from '@/lib/tema';
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

  const pazartesi = haftaBaslangici(bugununTarihi());
  const hafta = katilimHesapla(haftadakiler(kayitlar ?? [], pazartesi));
  const sonHaftalar = katilimHesapla(
    araliktakiler(kayitlar ?? [], gunEkle(pazartesi, -7 * (SON_HAFTA_SAYISI - 1)), gunEkle(pazartesi, 6)),
  );

  return (
    <Liste
      veri={kayitlar}
      hata={hata}
      anahtar={(y) => y.id}
      bosIkon="calendar-outline"
      bosBaslik="Henüz yoklama kaydı yok"
      ust={
        <View style={styles.ust}>
          <Kart stil={styles.hafta}>
            <Text style={[styles.oran, { color: katilimRengi(hafta.oran).renk }]}>{yuzdeMetni(hafta.oran)}</Text>
            <View style={styles.haftaMetinleri}>
              <Text style={yazi.altBaslik}>Bu haftaki katılım</Text>
              <Text style={yazi.kucuk}>{katilimMetni(hafta) ?? 'Bu hafta henüz yoklama alınmadı'}</Text>
              <Text style={yazi.kucuk}>
                Son {SON_HAFTA_SAYISI} hafta: {yuzdeMetni(sonHaftalar.oran)}
              </Text>
            </View>
          </Kart>
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
          <Text style={[yazi.kucuk, styles.toplamNotu]}>Sayılar tüm kayıtların toplamıdır.</Text>
        </View>
      }
      satir={(y) => <ListeSatiri baslik={tarihiBicimle(y.tarih)} sag={<DurumRozeti durum={y.durum} />} />}
    />
  );
}

const styles = StyleSheet.create({
  ust: {
    gap: bosluk.m,
    marginBottom: bosluk.m,
  },
  hafta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: bosluk.l,
  },
  oran: {
    fontSize: 34,
    fontWeight: '700',
    minWidth: 84,
    textAlign: 'center',
  },
  haftaMetinleri: {
    flex: 1,
    gap: 2,
  },
  ozet: {
    flexDirection: 'row',
  },
  toplamNotu: {
    color: renkler.metinIkincil,
    textAlign: 'center',
  },
  ozetHucre: {
    flex: 1,
    alignItems: 'center',
    gap: bosluk.xs,
  },
});
