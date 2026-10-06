// Bir öğrencinin yoklama geçmişi (salt okunur): üstte bu haftanın katılım oranı ve durum
// sayıları, altında günler. Oran kuralları için bkz. lib/katilim.ts.
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DurumRozeti } from '@/components/DurumRozeti';
import { Kart } from '@/components/Kart';
import { SON_HAFTA_SAYISI } from '@/components/KatilimListesi';
import { Liste } from '@/components/Liste';
import { ListeSatiri } from '@/components/ListeSatiri';
import { araliktakiler, haftadakiler, katilimHesapla, katilimMetni, yuzdeMetni } from '@/lib/katilim';
import { bugununTarihi, gunEkle, haftaBaslangici, tarihiBicimle } from '@/lib/tarih';
import { type Tema, useTema } from '@/lib/tema';
import { type Yoklama, YOKLAMA_DURUMLARI } from '@/lib/tipler';
import { veliYoklamalariGetir, YOKLAMA_ETIKETLERI } from '@/lib/yoklama';

export function YoklamaGecmisi({ ogrenciId }: { ogrenciId: string }) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
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
            <Text style={[styles.oran, { color: tema.katilimRengi(hafta.oran).renk }]}>{yuzdeMetni(hafta.oran)}</Text>
            <View style={styles.haftaMetinleri}>
              <Text style={styles.haftaBaslik}>Bu haftaki katılım</Text>
              <Text style={styles.kucuk}>{katilimMetni(hafta) ?? 'Bu hafta henüz yoklama alınmadı'}</Text>
              <Text style={styles.kucuk}>
                Son {SON_HAFTA_SAYISI} hafta: {yuzdeMetni(sonHaftalar.oran)}
              </Text>
            </View>
          </Kart>
          <Kart stil={styles.ozet}>
            {YOKLAMA_DURUMLARI.map((durum) => (
              <View key={durum} style={styles.ozetHucre}>
                <Text style={[styles.ozetSayi, { color: tema.yoklamaRenkleri[durum].renk }]}>
                  {(kayitlar ?? []).filter((k) => k.durum === durum).length}
                </Text>
                <Text style={styles.kucuk}>{YOKLAMA_ETIKETLERI[durum]}</Text>
              </View>
            ))}
          </Kart>
          <Text style={[styles.kucuk, styles.toplamNotu]}>Sayılar tüm kayıtların toplamıdır.</Text>
        </View>
      }
      satir={(y) => <ListeSatiri baslik={tarihiBicimle(y.tarih)} sag={<DurumRozeti durum={y.durum} />} />}
    />
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    ust: {
      gap: t.bosluk.m,
      marginBottom: t.bosluk.m,
    },
    hafta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.l,
    },
    oran: {
      fontFamily: t.yaziTipi.kalin,
      fontSize: 34,
      minWidth: 84,
      textAlign: 'center',
    },
    haftaMetinleri: {
      flex: 1,
      gap: 2,
    },
    haftaBaslik: {
      ...t.yazi.bolum,
    },
    kucuk: {
      ...t.yazi.kucuk,
    },
    ozet: {
      flexDirection: 'row',
    },
    ozetSayi: {
      ...t.yazi.baslik,
    },
    toplamNotu: {
      textAlign: 'center',
    },
    ozetHucre: {
      flex: 1,
      alignItems: 'center',
      gap: t.bosluk.xs,
    },
  });
}
