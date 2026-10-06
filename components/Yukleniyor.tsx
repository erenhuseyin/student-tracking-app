import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useTema } from '@/lib/tema';

export function Yukleniyor() {
  const tema = useTema();
  return (
    <View style={[styles.kapsayici, { backgroundColor: tema.renkler.zemin, padding: tema.bosluk.xxl }]}>
      <ActivityIndicator size="large" color={tema.renkler.anaParlak} />
    </View>
  );
}

const styles = StyleSheet.create({
  kapsayici: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
