// Küçük etiket: renkli zemin + metin, isteğe bağlı ikon. Bir **durum** bildiriyorsa (yoklama,
// personel durumu gibi) `ikon` verilmeli — yalnız renge dayanan bir gösterge erişilebilir
// sayılmaz. Kategori/yüzde gibi bilgi etiketlerinde ikon şart değildir (bkz. DurumRozeti ve
// PersonelDurumRozeti her zaman ikon geçer; GelisimKaydiKarti/KatilimListesi geçmez).
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Ikon, type IkonAdi } from '@/components/Ikon';
import { type Tema, useTema } from '@/lib/tema';

export function Rozet({ metin, renk, zemin, ikon }: { metin: string; renk: string; zemin: string; ikon?: IkonAdi }) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  return (
    <View style={[styles.rozet, { backgroundColor: zemin }]}>
      {ikon ? <Ikon ad={ikon} boyut={14} renk={renk} /> : <View style={[styles.nokta, { backgroundColor: renk }]} />}
      <Text style={[styles.metin, { color: renk }]}>{metin}</Text>
    </View>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    rozet: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: t.bosluk.xs + 2,
      paddingHorizontal: t.bosluk.m,
      paddingVertical: t.bosluk.xs,
      borderRadius: t.yaricap.tam,
    },
    nokta: {
      width: 8,
      height: 8,
      borderRadius: t.yaricap.tam,
    },
    metin: {
      ...t.yazi.etiket,
    },
  });
}
