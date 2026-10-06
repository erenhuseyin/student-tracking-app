// Bento grid metrik kartı: büyük sayı + etiket + isteğe bağlı ikon. Yönetici özet
// ekranlarında kullanılır (ör. sınıf/öğrenci/personel sayıları).
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Ikon, type IkonAdi } from '@/components/Ikon';
import { type Tema, useTema } from '@/lib/tema';

type Props = {
  deger: string | number;
  etiket: string;
  ikon?: IkonAdi;
  // Verilmezse anaParlak kullanılır (büyük vurgu kuralı — bkz. lib/tema.ts).
  renk?: string;
};

export function MetrikKarti({ deger, etiket, ikon, renk }: Props) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const ikonRengi = renk ?? tema.renkler.anaParlak;

  return (
    <View style={styles.kart}>
      {ikon ? (
        <View style={[styles.ikonZemini, { backgroundColor: tema.renkler.anaSoluk }]}>
          <Ikon ad={ikon} boyut={18} renk={ikonRengi} />
        </View>
      ) : null}
      <Text style={styles.deger} numberOfLines={1}>
        {deger}
      </Text>
      <Text style={styles.etiket} numberOfLines={2}>
        {etiket}
      </Text>
    </View>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    kart: {
      flex: 1,
      minWidth: 140,
      gap: t.bosluk.xs,
      padding: t.bosluk.l,
      borderRadius: t.yaricap.l,
      borderWidth: 1,
      borderColor: t.renkler.ayirici,
      backgroundColor: t.renkler.yuzey,
    },
    ikonZemini: {
      width: 36,
      height: 36,
      borderRadius: t.yaricap.m,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: t.bosluk.xs,
    },
    deger: t.yazi.metrik,
    etiket: t.yazi.etiket,
  });
}
