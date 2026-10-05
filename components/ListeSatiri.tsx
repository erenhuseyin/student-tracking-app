// Kart görünümlü liste satırı: sol (avatar/ikon) + başlık/alt başlık + sağ (rozet/eylemler).
// `onPress` verilip `sag` verilmezse sağda ilerleme oku gösterilir.
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Ikon } from '@/components/Ikon';
import { bosluk, dokunmaAlani, golge, renkler, yaricap, yazi } from '@/lib/tema';

type Props = {
  baslik: string;
  altBaslik?: string | null;
  sol?: ReactNode;
  sag?: ReactNode;
  onPress?: () => void;
  // Veli ekranları gibi büyük dokunma alanı gereken yerler için.
  buyuk?: boolean;
};

export function ListeSatiri({ baslik, altBaslik, sol, sag, onPress, buyuk = false }: Props) {
  const icerik = (
    <>
      {sol}
      <View style={styles.metinler}>
        <Text style={yazi.govde} numberOfLines={2}>
          {baslik}
        </Text>
        {altBaslik ? <Text style={yazi.kucuk}>{altBaslik}</Text> : null}
      </View>
    </>
  );

  return (
    <View style={[styles.satir, buyuk && styles.buyuk]}>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={({ pressed }) => [styles.anaAlan, pressed && styles.basili]}
        >
          {icerik}
          {sag ? null : <Ikon ad="chevron-forward" boyut={20} renk={renkler.kenarlik} />}
        </Pressable>
      ) : (
        <View style={styles.anaAlan}>{icerik}</View>
      )}
      {sag ? <View style={styles.sag}>{sag}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: dokunmaAlani.buyuk,
    backgroundColor: renkler.yuzey,
    borderRadius: yaricap.l,
    paddingHorizontal: bosluk.l,
    paddingVertical: bosluk.s,
    gap: bosluk.s,
    ...golge,
  },
  buyuk: {
    minHeight: 72,
  },
  anaAlan: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: bosluk.m,
    minHeight: dokunmaAlani.normal,
  },
  basili: {
    opacity: 0.6,
  },
  metinler: {
    flex: 1,
    gap: 2,
  },
  sag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
