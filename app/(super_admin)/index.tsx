// Erişim: yalnızca super_admin
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { CikisYapButonu } from '@/components/CikisYapButonu';
import { kurumlariGetir } from '@/lib/kurumlar';
import { renkler } from '@/lib/tema';
import type { Kurum } from '@/lib/tipler';

// Kök kurumlar ada göre, her kökün şubeleri hemen altında.
function agacSirasinaDiz(kurumlar: Kurum[]): Kurum[] {
  return kurumlar
    .filter((k) => !k.ust_kurum_id)
    .flatMap((kok) => [kok, ...kurumlar.filter((k) => k.ust_kurum_id === kok.id)]);
}

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
          if (!iptalEdildi) setKurumlar(agacSirasinaDiz(veri));
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
            <View style={[styles.satir, item.ust_kurum_id ? styles.subeSatiri : null]}>
              <Text style={styles.satirMetni}>{item.ad}</Text>
              {item.ust_kurum_id ? null : (
                <Text style={styles.markaKodu}>{item.marka_kodu ?? 'marka kodu yok'}</Text>
              )}
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
    color: renkler.metinIkincil,
    marginTop: 24,
  },
  satir: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: renkler.ayirici,
  },
  subeSatiri: {
    paddingLeft: 24,
  },
  satirMetni: {
    fontSize: 16,
  },
  markaKodu: {
    color: renkler.metinIkincil,
    marginTop: 2,
  },
  hataMetni: {
    color: renkler.hata,
    textAlign: 'center',
  },
  buton: {
    backgroundColor: renkler.ana,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  butonMetni: {
    color: renkler.anaUstu,
    fontWeight: '600',
    fontSize: 16,
  },
});
