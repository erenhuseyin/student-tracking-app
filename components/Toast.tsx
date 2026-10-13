// Kısa süreli başarı bildirimi ("Kaydedildi" gibi); ekranın altında, sekme çubuğunun üstünde
// belirir ve kendiliğinden kaybolur. Doğrudan kullanılmaz: bkz. lib/toast.tsx > useToast.
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Ikon } from '@/components/Ikon';
import { type Tema, useTema } from '@/lib/tema';

export function Toast({ metin }: { metin: string }) {
  const tema = useTema();
  const kenarlar = useSafeAreaInsets();
  const styles = useMemo(() => olustur(tema), [tema]);
  return (
    <View
      pointerEvents="none"
      // 'web' düzeninde sağ altta; telefonda sekme çubuğunun üstünde ortada.
      style={[styles.kapsayici, tema.duzen === 'web' ? styles.web : { bottom: kenarlar.bottom + 84 }]}
    >
      <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.kutu}>
        <Ikon ad="checkmark-circle" boyut={20} renk={tema.renkler.basari} />
        <Text style={styles.metin}>{metin}</Text>
      </View>
    </View>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    kapsayici: {
      position: 'absolute',
      left: 0,
      right: 0,
      alignItems: 'center',
      paddingHorizontal: t.bosluk.l,
    },
    web: {
      bottom: t.bosluk.xl,
      alignItems: 'flex-end',
      paddingHorizontal: t.bosluk.xl,
    },
    kutu: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.s,
      maxWidth: 480,
      paddingVertical: t.bosluk.m,
      paddingHorizontal: t.bosluk.l,
      borderRadius: t.duzen === 'web' ? t.yaricap.m : t.yaricap.tam,
      borderWidth: 1,
      borderColor: t.renkler.ayirici,
      backgroundColor: t.renkler.yuzey,
    },
    metin: {
      ...t.yazi.govde,
      flexShrink: 1,
    },
  });
}
