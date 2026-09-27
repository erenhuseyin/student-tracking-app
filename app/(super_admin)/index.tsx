// Erişim: yalnızca super_admin
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { CikisYapButonu } from '@/components/CikisYapButonu';
import { kurumlariGetir } from '@/lib/kurumlar';
import type { Kurum } from '@/lib/tipler';

export default function SuperAdminAnaSayfa() {
  const router = useRouter();
  const [kurumlar, setKurumlar] = useState<Kurum[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let iptalEdildi = false;
      setHata(null);
      kurumlariGetir()
        .then((veri) => {
          if (!iptalEdildi) setKurumlar(veri);
        })
        .catch((e: Error) => {
          if (!iptalEdildi) setHata(e.message);
        });
      return () => {
        iptalEdildi = true;
      };
    }, []),
  );

  return (
    <View style={styles.kapsayici}>
      <Text style={styles.baslik}>Kurumlar</Text>

      {hata ? <Text style={styles.hataMetni}>{hata}</Text> : null}

      {kurumlar === null && !hata ? (
        <ActivityIndicator style={styles.yukleniyor} />
      ) : (
        <FlatList
          style={styles.liste}
          data={kurumlar ?? []}
          keyExtractor={(k) => k.id}
          ListEmptyComponent={<Text style={styles.bosMetin}>Henüz kurum yok.</Text>}
          renderItem={({ item }) => (
            <View style={styles.satir}>
              <Text style={styles.satirMetni}>{item.ad}</Text>
            </View>
          )}
        />
      )}

      <Pressable style={styles.buton} onPress={() => router.push('/yeni-kurum')}>
        <Text style={styles.butonMetni}>Yeni Kurum Ekle</Text>
      </Pressable>
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
  yukleniyor: {
    marginTop: 24,
  },
  liste: {
    flex: 1,
  },
  bosMetin: {
    textAlign: 'center',
    color: '#666',
    marginTop: 24,
  },
  satir: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  satirMetni: {
    fontSize: 16,
  },
  hataMetni: {
    color: '#c62828',
    textAlign: 'center',
  },
  buton: {
    backgroundColor: '#208aef',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  butonMetni: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
