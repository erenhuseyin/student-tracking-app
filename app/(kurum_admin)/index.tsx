// Erişim: yalnızca kurum_admin. Kendi kurumunun sınıflarını yönetir; kurumu kök (müşteri)
// ise ayrıca şubelerine geçebilir.
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CikisYapButonu } from '@/components/CikisYapButonu';
import { SinifListesi } from '@/components/SinifListesi';
import { useOturum } from '@/lib/oturum';
import { renkler } from '@/lib/tema';

export default function KurumAdminAnaSayfa() {
  const router = useRouter();
  const { kurum } = useOturum();
  const kokKurumMu = kurum !== null && kurum.ust_kurum_id === null;

  return (
    <View style={styles.kapsayici}>
      <Text style={styles.baslik}>Sınıflarım</Text>
      {kurum ? <Text style={styles.altBaslik}>{kurum.ad}</Text> : null}

      {kurum ? <SinifListesi kurumId={kurum.id} /> : null}

      {kokKurumMu ? (
        <Pressable style={styles.ikincilButon} onPress={() => router.push('/subeler')}>
          <Text style={styles.ikincilButonMetni}>Şubeler</Text>
        </Pressable>
      ) : null}
      <CikisYapButonu />
    </View>
  );
}

const styles = StyleSheet.create({
  kapsayici: {
    flex: 1,
    padding: 24,
    gap: 12,
  },
  baslik: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 24,
  },
  altBaslik: {
    textAlign: 'center',
    color: renkler.metinIkincil,
  },
  ikincilButon: {
    borderWidth: 1,
    borderColor: renkler.ana,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ikincilButonMetni: {
    color: renkler.ana,
    fontWeight: '600',
    fontSize: 16,
  },
});
