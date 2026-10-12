// Yoklama durumlarının dağılımı: tek yatay yığılmış çubuk + ikonlu lejant (geldi / geç / gelmedi /
// mazeretli). Durum renkleri tema.yoklamaRenkleri'nden gelir; lejantta her durum ikon ve adla
// birlikte yazılır (yalnız renge dayanmaz), sayılar metin rengindedir.
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Ikon, type IkonAdi } from '@/components/Ikon';
import { type Tema, useTema } from '@/lib/tema';
import type { YoklamaDurumu } from '@/lib/tipler';
import { YOKLAMA_ETIKETLERI } from '@/lib/yoklama';

const SIRA: YoklamaDurumu[] = ['geldi', 'gec', 'gelmedi', 'mazeretli'];
const IKONLAR: Record<YoklamaDurumu, IkonAdi> = {
  geldi: 'checkmark-circle',
  gec: 'time',
  gelmedi: 'close-circle',
  mazeretli: 'remove-circle',
};

export function KatilimDagilimi({ sayilar }: { sayilar: Record<YoklamaDurumu, number> }) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const toplam = SIRA.reduce((t, d) => t + sayilar[d], 0);

  return (
    <View style={styles.kapsayici}>
      <View
        style={styles.cubuk}
        accessibilityRole="image"
        accessibilityLabel={SIRA.map((d) => `${YOKLAMA_ETIKETLERI[d]} ${sayilar[d]}`).join(', ')}
      >
        {toplam === 0 ? (
          <View style={styles.bos} />
        ) : (
          SIRA.filter((d) => sayilar[d] > 0).map((d) => (
            <View key={d} style={[styles.dilim, { flex: sayilar[d], backgroundColor: tema.yoklamaRenkleri[d].renk }]} />
          ))
        )}
      </View>
      <View style={styles.lejant}>
        {SIRA.map((d) => (
          <View key={d} style={styles.lejantOgesi}>
            <Ikon ad={IKONLAR[d]} boyut={16} renk={tema.yoklamaRenkleri[d].renk} />
            <Text style={tema.yazi.kucuk}>
              {YOKLAMA_ETIKETLERI[d]} <Text style={styles.sayi}>{sayilar[d]}</Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    kapsayici: {
      gap: t.bosluk.s,
    },
    cubuk: {
      flexDirection: 'row',
      height: 14,
      // Dilimler arasında yüzey renginde 2 px boşluk.
      gap: 2,
    },
    dilim: {
      borderRadius: 4,
      minWidth: 4,
    },
    bos: {
      flex: 1,
      borderRadius: 4,
      backgroundColor: t.renkler.ayirici,
    },
    lejant: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      columnGap: t.bosluk.l,
      rowGap: t.bosluk.xs,
    },
    lejantOgesi: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.xs,
    },
    sayi: {
      color: t.renkler.metin,
      fontFamily: t.yaziTipi.yariKalin,
    },
  });
}
