// İsteğe bağlı 1-5 puan seçici. Seçili puana tekrar dokunulunca puan kaldırılır (null).
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OLCEK_DEGERLERI } from '@/lib/gelisim';
import { bosluk, dokunmaAlani, renkler, yaricap, yazi } from '@/lib/tema';

type Props = {
  etiket: string;
  deger: number | null;
  onDegis: (deger: number | null) => void;
  pasif?: boolean;
};

export function OlcekSecici({ etiket, deger, onDegis, pasif = false }: Props) {
  return (
    <View style={styles.kapsayici}>
      <Text style={yazi.etiket}>{etiket}</Text>
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

const styles = StyleSheet.create({
  kapsayici: {
    gap: bosluk.xs,
  },
  satir: {
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
  secili: {
    backgroundColor: renkler.ana,
    borderColor: renkler.ana,
  },
  metin: {
    ...yazi.govde,
    fontWeight: '600',
    color: renkler.metinIkincil,
  },
  seciliMetin: {
    color: renkler.anaUstu,
  },
});
