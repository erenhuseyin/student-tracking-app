// Küçük durum etiketi (renkli nokta + metin). Yoklama durumu için bkz. DurumRozeti.
import { StyleSheet, Text, View } from 'react-native';

import { bosluk, yaricap } from '@/lib/tema';

export function Rozet({ metin, renk, zemin }: { metin: string; renk: string; zemin: string }) {
  return (
    <View style={[styles.rozet, { backgroundColor: zemin }]}>
      <View style={[styles.nokta, { backgroundColor: renk }]} />
      <Text style={[styles.metin, { color: renk }]}>{metin}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rozet: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: bosluk.xs + 2,
    paddingHorizontal: bosluk.m,
    paddingVertical: bosluk.xs,
    borderRadius: yaricap.tam,
  },
  nokta: {
    width: 8,
    height: 8,
    borderRadius: yaricap.tam,
  },
  metin: {
    fontSize: 13,
    fontWeight: '600',
  },
});
