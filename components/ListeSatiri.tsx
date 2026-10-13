// Kart görünümlü liste satırı: sol (avatar/ikon) + başlık/alt başlık + sağ (rozet/eylemler).
// `onPress` verilip `sag` verilmezse sağda ilerleme oku gösterilir (yalnızca 'mobil' düzende; 'web'
// düzeninde satır fare üzerine gelince vurgulanır).
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Ikon } from '@/components/Ikon';
import { type Tema, useTema } from '@/lib/tema';

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
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const [uzerinde, setUzerinde] = useState(false);

  const icerik = (
    <>
      {sol}
      <View style={styles.metinler}>
        <Text style={styles.baslik} numberOfLines={2}>
          {baslik}
        </Text>
        {altBaslik ? <Text style={styles.altBaslik}>{altBaslik}</Text> : null}
      </View>
    </>
  );

  return (
    <View style={[styles.satir, buyuk && styles.buyuk, uzerinde && styles.uzerinde]}>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          onHoverIn={() => setUzerinde(true)}
          onHoverOut={() => setUzerinde(false)}
          style={({ pressed }) => [styles.anaAlan, pressed && styles.basili]}
        >
          {icerik}
          {sag || tema.duzen === 'web' ? null : <Ikon ad="chevron-forward" boyut={20} renk={tema.renkler.kenarlik} />}
        </Pressable>
      ) : (
        <View style={styles.anaAlan}>{icerik}</View>
      )}
      {sag ? <View style={styles.sag}>{sag}</View> : null}
    </View>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    satir: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: t.dokunmaAlani.buyuk,
      backgroundColor: t.renkler.yuzey,
      borderRadius: t.yaricap.l,
      paddingHorizontal: t.bosluk.l,
      paddingVertical: t.bosluk.s,
      gap: t.bosluk.s,
      borderWidth: 1,
      borderColor: t.renkler.ayirici,
    },
    buyuk: {
      minHeight: t.duzen === 'web' ? 60 : 72,
    },
    uzerinde: {
      borderColor: t.renkler.kenarlik,
      backgroundColor: t.renkler.anaSoluk,
    },
    anaAlan: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.m,
      minHeight: t.dokunmaAlani.normal,
    },
    basili: {
      opacity: 0.6,
    },
    metinler: {
      flex: 1,
      gap: 2,
    },
    baslik: {
      ...t.yazi.govde,
    },
    altBaslik: {
      ...t.yazi.kucuk,
    },
    sag: {
      flexDirection: 'row',
      alignItems: 'center',
    },
  });
}
