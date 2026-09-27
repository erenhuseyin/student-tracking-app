// Erişim: yalnızca ogretmen
import { StyleSheet, Text, View } from 'react-native';

import { CikisYapButonu } from '@/components/CikisYapButonu';
import { useOturum } from '@/lib/oturum';

export default function OgretmenAnaSayfa() {
  const { kullanici } = useOturum();

  return (
    <View style={styles.kapsayici}>
      <Text style={styles.baslik}>Sınıflarım</Text>
      <Text style={styles.aciklama}>Hoş geldin, {kullanici?.ad_soyad}.</Text>
      <Text style={styles.aciklama}>Yoklama ve gelişim kaydı yakında burada olacak.</Text>
      <CikisYapButonu />
    </View>
  );
}

const styles = StyleSheet.create({
  kapsayici: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  baslik: {
    fontSize: 24,
    fontWeight: '600',
  },
  aciklama: {
    textAlign: 'center',
    color: '#444',
  },
});
