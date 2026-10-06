// Masaüstü (>=1024) tablo görünümü. Başlık satırı vurguSoluk zeminli, satır yüksekliği 48.
// `Liste` bileşeni bu genişlikte, `sutunlar` verilmişse otomatik buna döner (bkz. Liste.tsx);
// doğrudan da kullanılabilir. Web'de fare üzerine gelince satır hafifçe vurgulanır (hover),
// native tarafta `onHoverIn/onHoverOut` sessizce yok sayılır.
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type Tema, useTema } from '@/lib/tema';

export type TabloSutunu<T> = {
  anahtar: string;
  baslik: string;
  icerik: (oge: T) => ReactNode;
  // Verilmezse sütun eşit pay alır.
  genislik?: number;
  hizalama?: 'sol' | 'sag';
};

type Props<T> = {
  veri: T[];
  sutunlar: TabloSutunu<T>[];
  anahtar: (oge: T) => string;
  onPress?: (oge: T) => void;
};

export function Tablo<T>({ veri, sutunlar, anahtar, onPress }: Props<T>) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);

  const sutunStili = (s: TabloSutunu<T>) => [
    s.genislik ? { width: s.genislik, flexGrow: 0, flexShrink: 0 } : styles.esitSutun,
    s.hizalama === 'sag' && styles.sagaYasli,
  ];

  return (
    <View style={styles.tablo}>
      <View style={[styles.satir, styles.baslikSatiri]}>
        {sutunlar.map((s) => (
          <Text key={s.anahtar} style={[styles.baslikMetni, sutunStili(s)]} numberOfLines={1}>
            {s.baslik}
          </Text>
        ))}
      </View>
      {veri.map((oge) => (
        <TabloSatiri key={anahtar(oge)} tema={tema} onPress={onPress ? () => onPress(oge) : undefined}>
          {sutunlar.map((s) => (
            <View key={s.anahtar} style={sutunStili(s)}>
              {s.icerik(oge)}
            </View>
          ))}
        </TabloSatiri>
      ))}
    </View>
  );
}

function TabloSatiri({
  tema,
  onPress,
  children,
}: {
  tema: Tema;
  onPress?: () => void;
  children: ReactNode;
}) {
  const styles = useMemo(() => olustur(tema), [tema]);
  const [vurgulu, setVurgulu] = useState(false);

  const icerik = (
    <View style={[styles.satir, styles.veriSatiri, vurgulu && styles.vurguluSatir]}>{children}</View>
  );

  if (!onPress) return icerik;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onHoverIn={() => setVurgulu(true)}
      onHoverOut={() => setVurgulu(false)}
      style={({ pressed }) => [pressed && styles.basili]}
    >
      {icerik}
    </Pressable>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    tablo: {
      borderRadius: t.yaricap.l,
      borderWidth: 1,
      borderColor: t.renkler.ayirici,
      overflow: 'hidden',
    },
    satir: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 48,
      paddingHorizontal: t.bosluk.l,
      gap: t.bosluk.m,
    },
    baslikSatiri: {
      backgroundColor: t.renkler.vurguSoluk,
    },
    baslikMetni: {
      ...t.yazi.etiket,
    },
    veriSatiri: {
      backgroundColor: t.renkler.yuzey,
      borderTopWidth: 1,
      borderTopColor: t.renkler.ayirici,
    },
    vurguluSatir: {
      backgroundColor: t.renkler.anaSoluk,
    },
    basili: {
      opacity: 0.7,
    },
    esitSutun: {
      flex: 1,
    },
    sagaYasli: {
      textAlign: 'right',
      alignItems: 'flex-end',
    },
  });
}
