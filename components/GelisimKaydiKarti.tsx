// Tek bir gelişim kaydı: kategori, tarih, not ve (varsa) puan. `eylemler` verilirse sağ üstte
// gösterilir (öğretmenin kendi kaydındaki düzenle/sil).
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Kart } from '@/components/Kart';
import { OlcekGostergesi } from '@/components/OlcekGostergesi';
import { Rozet } from '@/components/Rozet';
import type { GelisimKaydiSatiri } from '@/lib/gelisim';
import { tarihiBicimle } from '@/lib/tarih';
import { type Tema, useTema } from '@/lib/tema';

type Props = {
  kayit: GelisimKaydiSatiri;
  eylemler?: ReactNode;
  altNot?: string;
};

export function GelisimKaydiKarti({ kayit, eylemler, altNot }: Props) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  return (
    <Kart>
      <View style={styles.ust}>
        <View style={styles.kunye}>
          <Rozet metin={kayit.kategori_adi} renk={tema.renkler.ana} zemin={tema.renkler.anaSoluk} />
          <Text style={styles.tarih}>{tarihiBicimle(kayit.tarih)}</Text>
        </View>
        {eylemler ? <View style={styles.eylemler}>{eylemler}</View> : null}
      </View>
      <Text style={styles.not}>{kayit.not_metni}</Text>
      {kayit.olcek_degeri !== null ? <OlcekGostergesi deger={kayit.olcek_degeri} /> : null}
      {altNot ? <Text style={styles.tarih}>{altNot}</Text> : null}
    </Kart>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    ust: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: t.bosluk.s,
    },
    kunye: {
      flex: 1,
      gap: t.bosluk.s,
    },
    eylemler: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'flex-end',
      minHeight: t.dokunmaAlani.normal,
    },
    tarih: {
      ...t.yazi.kucuk,
    },
    not: {
      ...t.yazi.govde,
    },
  });
}
