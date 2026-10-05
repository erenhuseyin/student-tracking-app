// Erişim: yalnızca ogretmen
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Ekran } from '@/components/Ekran';
import { Kart } from '@/components/Kart';
import { Liste } from '@/components/Liste';
import { useOturum } from '@/lib/oturum';
import { bugununTarihi, tarihiBicimle } from '@/lib/tarih';
import { bosluk, dokunmaAlani, renkler, yaricap, yazi, yoklamaRenkleri } from '@/lib/tema';
import { YOKLAMA_DURUMLARI, type YoklamaDurumu } from '@/lib/tipler';
import {
  bugununYoklamasiniGetir,
  type OgrenciYoklamaSatiri,
  YOKLAMA_ETIKETLERI,
  yoklamaKaydet,
} from '@/lib/yoklama';

function ozetMetni(ogrenciler: OgrenciYoklamaSatiri[]): string {
  const parcalar = YOKLAMA_DURUMLARI.map((durum) => {
    const adet = ogrenciler.filter((o) => o.yoklama_durumu === durum).length;
    return `${adet} ${YOKLAMA_ETIKETLERI[durum].toLocaleLowerCase('tr-TR')}`;
  });
  const isaretlenmemis = ogrenciler.filter((o) => o.yoklama_durumu === null).length;
  if (isaretlenmemis > 0) parcalar.push(`${isaretlenmemis} işaretlenmedi`);
  return parcalar.join(' · ');
}

export default function OgretmenYoklama() {
  const { sinifId } = useLocalSearchParams<{ sinifId: string }>();
  const { kullanici } = useOturum();
  const [ogrenciler, setOgrenciler] = useState<OgrenciYoklamaSatiri[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [kaydedenId, setKaydedenId] = useState<string | null>(null);

  const yenile = useCallback(async () => {
    setHata(null);
    try {
      setOgrenciler(await bugununYoklamasiniGetir(sinifId));
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
    }
  }, [sinifId]);

  useFocusEffect(
    useCallback(() => {
      yenile();
    }, [yenile]),
  );

  const isaretle = async (ogrenciId: string, durum: YoklamaDurumu) => {
    if (!kullanici?.kurum_id) {
      setHata('Kurum bilgisi bulunamadı.');
      return;
    }
    setKaydedenId(ogrenciId);
    setHata(null);
    try {
      await yoklamaKaydet(kullanici.kurum_id, ogrenciId, kullanici.id, durum);
      setOgrenciler((mevcut) =>
        (mevcut ?? []).map((o) => (o.id === ogrenciId ? { ...o, yoklama_durumu: durum } : o)),
      );
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
    } finally {
      setKaydedenId(null);
    }
  };

  return (
    <Ekran>
      <Stack.Screen options={{ title: 'Yoklama' }} />

      <Liste
        veri={ogrenciler}
        hata={hata}
        anahtar={(o) => o.id}
        bosIkon="people-outline"
        bosBaslik="Bu sınıfta öğrenci yok"
        ust={
          <View style={styles.ust}>
            <Text style={yazi.altBaslik}>{tarihiBicimle(bugununTarihi())}</Text>
            <Text style={yazi.kucuk}>{ozetMetni(ogrenciler ?? [])}</Text>
          </View>
        }
        satir={(o) => (
          <Kart>
            <View style={styles.adSatiri}>
              <Text style={[yazi.govde, styles.ad]}>{o.ad_soyad}</Text>
              {kaydedenId === o.id ? <ActivityIndicator size="small" color={renkler.ana} /> : null}
            </View>
            <View style={styles.secici}>
              {YOKLAMA_DURUMLARI.map((durum) => {
                const secili = o.yoklama_durumu === durum;
                return (
                  <Pressable
                    key={durum}
                    accessibilityRole="button"
                    accessibilityState={{ selected: secili }}
                    accessibilityLabel={`${o.ad_soyad}: ${YOKLAMA_ETIKETLERI[durum]}`}
                    disabled={kaydedenId === o.id}
                    onPress={() => isaretle(o.id, durum)}
                    style={[
                      styles.secenek,
                      secili && { backgroundColor: yoklamaRenkleri[durum].renk, borderColor: yoklamaRenkleri[durum].renk },
                    ]}
                  >
                    <Text style={[styles.secenekMetni, secili && styles.secenekMetniSecili]}>
                      {YOKLAMA_ETIKETLERI[durum]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Kart>
        )}
      />
    </Ekran>
  );
}

const styles = StyleSheet.create({
  ust: {
    gap: bosluk.xs,
    marginBottom: bosluk.m,
  },
  adSatiri: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: bosluk.s,
  },
  ad: {
    flex: 1,
    fontWeight: '600',
  },
  secici: {
    flexDirection: 'row',
    gap: bosluk.s,
  },
  secenek: {
    flex: 1,
    minHeight: dokunmaAlani.normal,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: renkler.kenarlik,
    borderRadius: yaricap.m,
    backgroundColor: renkler.yuzey,
  },
  secenekMetni: {
    ...yazi.govde,
    fontWeight: '600',
    color: renkler.metinIkincil,
  },
  secenekMetniSecili: {
    color: renkler.anaUstu,
  },
});
