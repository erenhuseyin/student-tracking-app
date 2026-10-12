// Bir ezber maddesinin durumunu tek satırda değiştiren iki düğme: Devam | Tamam. Seçili düğmeye
// yeniden dokunmak durumu "başlamadı"ya döndürür (başlamadı = ikisi de seçili değil).
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Ikon, type IkonAdi } from '@/components/Ikon';
import { EZBER_ETIKETLERI } from '@/lib/icerik';
import { type Tema, useTema } from '@/lib/tema';
import type { EzberDurumu } from '@/lib/tipler';

export type EzberSecimi = EzberDurumu | 'baslamadi';

const DUGMELER: { deger: EzberDurumu; ikon: IkonAdi }[] = [
  { deger: 'devam', ikon: 'time-outline' },
  { deger: 'tamam', ikon: 'checkmark-circle' },
];

type Props = {
  // Ekran okuyucu için satırın adı (madde ya da öğrenci).
  ad: string;
  durum: EzberSecimi;
  onSec: (durum: EzberSecimi) => void;
  pasif?: boolean;
};

export function EzberDurumDugmeleri({ ad, durum, onSec, pasif = false }: Props) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  return (
    <View style={styles.satir}>
      {DUGMELER.map((d) => {
        const secili = durum === d.deger;
        const renk = d.deger === 'tamam' ? tema.renkler.basari : tema.renkler.uyari;
        const zemin = d.deger === 'tamam' ? tema.renkler.basariSoluk : tema.renkler.uyariSoluk;
        return (
          <Pressable
            key={d.deger}
            accessibilityRole="checkbox"
            accessibilityLabel={`${ad}: ${EZBER_ETIKETLERI[d.deger]}`}
            accessibilityState={{ checked: secili, disabled: pasif }}
            disabled={pasif}
            onPress={() => onSec(secili ? 'baslamadi' : d.deger)}
            style={({ pressed }) => [
              styles.dugme,
              secili && { backgroundColor: zemin, borderColor: renk },
              (pressed || pasif) && styles.soluk,
            ]}
          >
            <Ikon ad={d.ikon} boyut={16} renk={secili ? renk : tema.renkler.metinIkincil} />
            <Text style={[styles.metin, secili && { color: renk }]}>{EZBER_ETIKETLERI[d.deger]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    satir: {
      flexDirection: 'row',
      gap: t.bosluk.xs,
    },
    dugme: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: t.bosluk.xs,
      minHeight: t.dokunmaAlani.normal,
      paddingHorizontal: t.bosluk.s,
      borderWidth: 1,
      borderColor: t.renkler.kenarlik,
      borderRadius: t.yaricap.m,
      backgroundColor: t.renkler.yuzey,
    },
    metin: {
      ...t.yazi.kucuk,
      fontFamily: t.yaziTipi.yariKalin,
      color: t.renkler.metinIkincil,
    },
    soluk: {
      opacity: 0.6,
    },
  });
}
