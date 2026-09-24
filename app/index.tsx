import { StyleSheet, Text, View } from 'react-native';

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.baslik}>Öğrenci Takip</Text>
      <Text>İskelet hazır.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  baslik: {
    fontSize: 24,
    fontWeight: '600',
  },
});
