// Tek bir gelişim kaydı: kategori, tarih, not ve (varsa) puan. `eylemler` verilirse sağ üstte
// gösterilir (öğretmenin kendi kaydındaki düzenle/sil).
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Kart } from '@/components/Kart';
import { OlcekGostergesi } from '@/components/OlcekGostergesi';
import { Rozet } from '@/components/Rozet';
import type { GelisimKaydiSatiri } from '@/lib/gelisim';
import { tarihiBicimle } from '@/lib/tarih';
import { bosluk, dokunmaAlani, renkler, yazi } from '@/lib/tema';

type Props = {
  kayit: GelisimKaydiSatiri;
  eylemler?: ReactNode;
  altNot?: string;
};

export function GelisimKaydiKarti({ kayit, eylemler, altNot }: Props) {
  return (
    <Kart>
      <View style={styles.ust}>
        <View style={styles.kunye}>
          <Rozet metin={kayit.kategori_adi} renk={renkler.ana} zemin={renkler.anaSoluk} />
          <Text style={yazi.kucuk}>{tarihiBicimle(kayit.tarih)}</Text>
        </View>
        {eylemler ? <View style={styles.eylemler}>{eylemler}</View> : null}
      </View>
      <Text style={yazi.govde}>{kayit.not_metni}</Text>
      {kayit.olcek_degeri !== null ? <OlcekGostergesi deger={kayit.olcek_degeri} /> : null}
      {altNot ? <Text style={yazi.kucuk}>{altNot}</Text> : null}
    </Kart>
  );
}

const styles = StyleSheet.create({
  ust: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: bosluk.s,
  },
  kunye: {
    flex: 1,
    gap: bosluk.s,
  },
  eylemler: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: dokunmaAlani.normal,
  },
});
