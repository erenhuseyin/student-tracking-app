// Sayfalanan listelerin altındaki çubuk: "31–60 / 124" + önceki / sonraki. `sayfa` 0'dan başlar.
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { IkonButon } from '@/components/IkonButon';
import { type Tema, useTema } from '@/lib/tema';

type Props = {
  sayfa: number;
  sayfaBoyutu: number;
  toplam: number;
  onDegis: (sayfa: number) => void;
};

export function Sayfalama({ sayfa, sayfaBoyutu, toplam, onDegis }: Props) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const ilk = toplam === 0 ? 0 : sayfa * sayfaBoyutu + 1;
  const son = Math.min(toplam, (sayfa + 1) * sayfaBoyutu);
  const oncekiVar = sayfa > 0;
  const sonrakiVar = son < toplam;

  return (
    <View style={styles.satir}>
      <Text style={tema.yazi.kucuk}>
        {ilk}–{son} / {toplam}
      </Text>
      <View style={styles.dugmeler}>
        <View style={!oncekiVar && styles.soluk} pointerEvents={oncekiVar ? 'auto' : 'none'}>
          <IkonButon ikon="chevron-back" etiket="Önceki sayfa" onPress={() => onDegis(sayfa - 1)} />
        </View>
        <View style={!sonrakiVar && styles.soluk} pointerEvents={sonrakiVar ? 'auto' : 'none'}>
          <IkonButon ikon="chevron-forward" etiket="Sonraki sayfa" onPress={() => onDegis(sayfa + 1)} />
        </View>
      </View>
    </View>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    satir: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: t.bosluk.m,
    },
    dugmeler: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    soluk: {
      opacity: 0.3,
    },
  });
}
