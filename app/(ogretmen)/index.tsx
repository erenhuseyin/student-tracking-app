// Erişim: yalnızca ogretmen
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { CikisYapButonu } from '@/components/CikisYapButonu';
import { siniflariGetir } from '@/lib/siniflar';
import { renkler } from '@/lib/tema';
import type { Sinif } from '@/lib/tipler';

export default function OgretmenAnaSayfa() {
  const router = useRouter();
  const [siniflar, setSiniflar] = useState<Sinif[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setHata(null);
      // RLS (sinif_ogretmen_oku politikası) yalnızca öğretmenin atandığı sınıfları döndürür.
      siniflariGetir()
        .then(setSiniflar)
        .catch((e: Error) => setHata(e.message));
    }, []),
  );

  return (
    <View style={styles.kapsayici}>
      <Text style={styles.baslik}>Sınıflarım</Text>

      {hata ? <Text style={styles.hataMetni}>{hata}</Text> : null}

      {siniflar === null && !hata ? (
        <ActivityIndicator style={styles.yukleniyor} />
      ) : (
        <FlatList
          style={styles.liste}
          data={siniflar ?? []}
          keyExtractor={(s) => s.id}
          ListEmptyComponent={<Text style={styles.bosMetin}>Henüz size atanmış sınıf yok.</Text>}
          renderItem={({ item }) => (
            <Pressable style={styles.satir} onPress={() => router.push(`/yoklama/${item.id}`)}>
              <Text style={styles.satirMetni}>
                {item.ad} — {item.donem}
              </Text>
            </Pressable>
          )}
        />
      )}

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
    color: renkler.metinIkincil,
    marginTop: 24,
  },
  satir: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: renkler.ayirici,
  },
  satirMetni: {
    fontSize: 16,
  },
  hataMetni: {
    color: renkler.hata,
    textAlign: 'center',
  },
});
