// Yatay ilerleme çubuğu + '18/30 · %60' metni (konu, ezber ilerlemesi).
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { type Tema, useTema } from '@/lib/tema';

export function IlerlemeCubugu({ tamam, toplam, etiket }: { tamam: number; toplam: number; etiket?: string }) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const oran = toplam === 0 ? 0 : Math.min(1, tamam / toplam);
  return (
    <View style={styles.kapsayici} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: toplam, now: tamam }}>
      <View style={styles.zemin}>
        <View style={[styles.dolgu, { width: `${Math.round(oran * 100)}%` }]} />
      </View>
      <Text style={tema.yazi.kucuk}>
        {etiket ? `${etiket}: ` : ''}
        {tamam}/{toplam}
        {toplam > 0 ? ` · %${Math.round(oran * 100)}` : ''}
      </Text>
    </View>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    kapsayici: {
      gap: t.bosluk.xs,
    },
    zemin: {
      height: 8,
      borderRadius: 4,
      backgroundColor: t.renkler.ayirici,
      overflow: 'hidden',
    },
    dolgu: {
      height: 8,
      borderRadius: 4,
      backgroundColor: t.renkler.anaParlak,
    },
  });
}
