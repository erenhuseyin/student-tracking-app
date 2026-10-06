// Hafta gezgini: ‹ önceki | "5 – 11 Ekim" | sonraki ›. İçinde bulunulan haftadan ileri gidilmez.
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { IkonButon } from '@/components/IkonButon';
import { bugununTarihi, gunEkle, haftaAraligiBicimle, haftaBaslangici } from '@/lib/tarih';
import { type Tema, useTema } from '@/lib/tema';

type Props = {
  pazartesi: string;
  onDegis: (pazartesi: string) => void;
};

export function HaftaSecici({ pazartesi, onDegis }: Props) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const buHafta = haftaBaslangici(bugununTarihi());

  return (
    <View style={styles.satir}>
      <IkonButon ikon="chevron-back" etiket="Önceki hafta" onPress={() => onDegis(gunEkle(pazartesi, -7))} />
      <View style={styles.orta}>
        <Text style={styles.baslik}>{haftaAraligiBicimle(pazartesi)}</Text>
        {pazartesi === buHafta ? <Text style={styles.kucuk}>Bu hafta</Text> : null}
      </View>
      {pazartesi < buHafta ? (
        <IkonButon ikon="chevron-forward" etiket="Sonraki hafta" onPress={() => onDegis(gunEkle(pazartesi, 7))} />
      ) : (
        <View style={styles.bosluk} />
      )}
    </View>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    satir: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    orta: {
      flex: 1,
      alignItems: 'center',
    },
    baslik: {
      ...t.yazi.bolum,
    },
    kucuk: {
      ...t.yazi.kucuk,
    },
    bosluk: {
      width: t.dokunmaAlani.normal,
      height: t.dokunmaAlani.normal,
    },
  });
}
