// İsteğe bağlı 1-5 puan seçici. Seçili puana tekrar dokunulunca puan kaldırılır (null).
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OLCEK_DEGERLERI } from '@/lib/gelisim';
import { type Tema, useTema } from '@/lib/tema';

type Props = {
  etiket: string;
  deger: number | null;
  onDegis: (deger: number | null) => void;
  pasif?: boolean;
};

export function OlcekSecici({ etiket, deger, onDegis, pasif = false }: Props) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  return (
    <View style={styles.kapsayici}>
      <Text style={styles.etiket}>{etiket}</Text>
      <View style={styles.satir}>
        {OLCEK_DEGERLERI.map((n) => {
          const secili = n === deger;
          return (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityLabel={`${etiket}: ${n}`}
              accessibilityState={{ selected: secili, disabled: pasif }}
              disabled={pasif}
              onPress={() => onDegis(secili ? null : n)}
              style={[styles.secenek, secili && styles.secili]}
            >
              <Text style={[styles.metin, secili && styles.seciliMetin]}>{n}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    kapsayici: {
      gap: t.bosluk.xs,
    },
    etiket: {
      ...t.yazi.etiket,
    },
    satir: {
      flexDirection: 'row',
      gap: t.bosluk.s,
    },
    secenek: {
      flex: 1,
      minHeight: t.dokunmaAlani.normal,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: t.renkler.kenarlik,
      borderRadius: t.yaricap.m,
      backgroundColor: t.renkler.yuzey,
    },
    secili: {
      backgroundColor: t.renkler.ana,
      borderColor: t.renkler.ana,
    },
    metin: {
      ...t.yazi.govde,
      fontFamily: t.yaziTipi.yariKalin,
      color: t.renkler.metinIkincil,
    },
    seciliMetin: {
      color: t.renkler.anaUzeriMetin,
    },
  });
}
