import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { bosluk, renkler } from '@/lib/tema';

export function Yukleniyor() {
  return (
    <View style={styles.kapsayici}>
      <ActivityIndicator size="large" color={renkler.ana} />
    </View>
  );
}

const styles = StyleSheet.create({
  kapsayici: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: bosluk.xxl,
    backgroundColor: renkler.zemin,
  },
});
