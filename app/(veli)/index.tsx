// Erişim: yalnızca veli
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { CikisYapButonu } from '@/components/CikisYapButonu';
import { veliCocuklariniGetir } from '@/lib/ogrenciler';
import { renkler } from '@/lib/tema';
import type { Ogrenci } from '@/lib/tipler';

export default function VeliAnaSayfa() {
  const router = useRouter();
  const [cocuklar, setCocuklar] = useState<Ogrenci[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setHata(null);
      // RLS (ogrenci_veli_oku politikası) yalnızca velinin bağlı olduğu öğrencileri döndürür.
      veliCocuklariniGetir()
        .then(setCocuklar)
        .catch((e: Error) => setHata(e.message));
    }, []),
  );

  return (
    <View style={styles.kapsayici}>
      <Text style={styles.baslik}>Çocuklarım</Text>

      {hata ? <Text style={styles.hataMetni}>{hata}</Text> : null}

      {cocuklar === null && !hata ? (
        <ActivityIndicator style={styles.yukleniyor} />
      ) : (
        <FlatList
          style={styles.liste}
          data={cocuklar ?? []}
          keyExtractor={(o) => o.id}
          ListEmptyComponent={<Text style={styles.bosMetin}>Bağlı bir çocuk bulunamadı.</Text>}
          renderItem={({ item }) => (
            <Pressable style={styles.satir} onPress={() => router.push(`/yoklama/${item.id}`)}>
              <Text style={styles.satirMetni}>{item.ad_soyad}</Text>
            </Pressable>
          )}
        />
      )}

      <Pressable style={styles.pinLinki} onPress={() => router.push('/pin-degistir')}>
        <Text style={styles.pinLinkiMetni}>PIN&apos;imi değiştir</Text>
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
  pinLinki: {
    alignItems: 'center',
    marginTop: 4,
  },
  pinLinkiMetni: {
    color: renkler.ana,
  },
});
