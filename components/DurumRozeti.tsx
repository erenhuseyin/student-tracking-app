// Yoklama durumu rozeti. `durum` null ise "İşaretlenmedi" gösterilir.
import { StyleSheet, Text, View } from 'react-native';

import { bosluk, renkler, yaricap, yoklamaRenkleri } from '@/lib/tema';
import type { YoklamaDurumu } from '@/lib/tipler';
import { YOKLAMA_ETIKETLERI } from '@/lib/yoklama';

export function DurumRozeti({ durum }: { durum: YoklamaDurumu | null }) {
  const renk = durum ? yoklamaRenkleri[durum].renk : renkler.metinIkincil;
  const zemin = durum ? yoklamaRenkleri[durum].soluk : renkler.ayirici;

  return (
    <View style={[styles.rozet, { backgroundColor: zemin }]}>
      <View style={[styles.nokta, { backgroundColor: renk }]} />
      <Text style={[styles.metin, { color: renk }]}>{durum ? YOKLAMA_ETIKETLERI[durum] : 'İşaretlenmedi'}</Text>
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
