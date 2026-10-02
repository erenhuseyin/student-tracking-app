// Bir kurumun (kök ya da şube) sınıf listesi + düzenle/sil + yeni sınıf ekleme.
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { SilOnayButonu } from '@/components/SilOnayButonu';
import { siniflariGetir, sinifSil } from '@/lib/siniflar';
import { renkler } from '@/lib/tema';
import type { Sinif } from '@/lib/tipler';

export function SinifListesi({ kurumId }: { kurumId: string }) {
  const router = useRouter();
  const [siniflar, setSiniflar] = useState<Sinif[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const yenile = useCallback(async () => {
    setHata(null);
    try {
      setSiniflar(await siniflariGetir(kurumId));
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
    }
  }, [kurumId]);

  useFocusEffect(
    useCallback(() => {
      yenile();
    }, [yenile]),
  );

  return (
    <View style={styles.kapsayici}>
      {hata ? <Text style={styles.hataMetni}>{hata}</Text> : null}

      {siniflar === null && !hata ? (
        <ActivityIndicator style={styles.yukleniyor} />
      ) : (
        <FlatList
          style={styles.liste}
          data={siniflar ?? []}
          keyExtractor={(s) => s.id}
          ListEmptyComponent={<Text style={styles.bosMetin}>Henüz sınıf yok.</Text>}
          renderItem={({ item }) => (
            <View style={styles.satir}>
              <Pressable style={styles.satirIcerik} onPress={() => router.push(`/sinif/${item.id}`)}>
                <Text style={styles.satirMetni}>
                  {item.ad} — {item.donem}
                </Text>
              </Pressable>
              <View style={styles.satirButonlari}>
                <Pressable onPress={() => router.push(`/sinif-duzenle/${item.id}`)}>
                  <Text style={styles.duzenleMetni}>Düzenle</Text>
                </Pressable>
                <SilOnayButonu
                  onSil={async () => {
                    try {
                      await sinifSil(item.id);
                      await yenile();
                    } catch (e) {
                      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
                    }
                  }}
                />
              </View>
            </View>
          )}
        />
      )}

      <Pressable style={styles.buton} onPress={() => router.push({ pathname: '/yeni-sinif', params: { kurumId } })}>
        <Text style={styles.butonMetni}>Yeni Sınıf Ekle</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  kapsayici: {
    flex: 1,
    gap: 12,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: renkler.ayirici,
  },
  satirIcerik: {
    flex: 1,
  },
  satirMetni: {
    fontSize: 16,
  },
  satirButonlari: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  duzenleMetni: {
    color: renkler.ana,
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
