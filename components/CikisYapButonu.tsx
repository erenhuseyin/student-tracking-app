import { Pressable, StyleSheet, Text } from 'react-native';

import { useOturum } from '@/lib/oturum';
import { renkler } from '@/lib/tema';

export function CikisYapButonu() {
  const { cikisYap } = useOturum();

  return (
    <Pressable style={styles.buton} onPress={cikisYap}>
      <Text style={styles.metin}>Çıkış Yap</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  buton: {
    backgroundColor: renkler.ana,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  metin: {
    color: renkler.anaUstu,
    fontWeight: '600',
  },
});
