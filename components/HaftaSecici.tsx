// Hafta gezgini: ‹ önceki | "5 – 11 Ekim" | sonraki ›. İçinde bulunulan haftadan ileri gidilmez.
import { StyleSheet, Text, View } from 'react-native';

import { IkonButon } from '@/components/IkonButon';
import { bugununTarihi, gunEkle, haftaAraligiBicimle, haftaBaslangici } from '@/lib/tarih';
import { dokunmaAlani, yazi } from '@/lib/tema';

type Props = {
  pazartesi: string;
  onDegis: (pazartesi: string) => void;
};

export function HaftaSecici({ pazartesi, onDegis }: Props) {
  const buHafta = haftaBaslangici(bugununTarihi());

  return (
    <View style={styles.satir}>
      <IkonButon ikon="chevron-back" etiket="Önceki hafta" onPress={() => onDegis(gunEkle(pazartesi, -7))} />
      <View style={styles.orta}>
        <Text style={yazi.altBaslik}>{haftaAraligiBicimle(pazartesi)}</Text>
        {pazartesi === buHafta ? <Text style={yazi.kucuk}>Bu hafta</Text> : null}
      </View>
      {pazartesi < buHafta ? (
        <IkonButon ikon="chevron-forward" etiket="Sonraki hafta" onPress={() => onDegis(gunEkle(pazartesi, 7))} />
      ) : (
        <View style={styles.bosluk} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orta: {
    flex: 1,
    alignItems: 'center',
  },
  bosluk: {
    width: dokunmaAlani.normal,
    height: dokunmaAlani.normal,
  },
});
