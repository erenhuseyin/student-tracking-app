// Erişim: yalnızca kök kurumun (müşterinin) kurum_admin'i. Şube admini bu ekrana bağlantı
// görmez; adresle açsa bile RLS ona şube göstermez ve şube eklemesine izin vermez.
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { SilOnayButonu } from '@/components/SilOnayButonu';
import { subeleriGetir, subeSil } from '@/lib/kurumlar';
import { useOturum } from '@/lib/oturum';
import { renkler } from '@/lib/tema';
import type { Kurum } from '@/lib/tipler';

export default function Subeler() {
  const router = useRouter();
  const { kurum } = useOturum();
  const [subeler, setSubeler] = useState<Kurum[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const kurumId = kurum?.id;

  const yenile = useCallback(async () => {
    if (!kurumId) return;
    setHata(null);
    try {
      setSubeler(await subeleriGetir(kurumId));
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
      <Text style={styles.baslik}>Şubeler</Text>

      {hata ? <Text style={styles.hataMetni}>{hata}</Text> : null}

      {subeler === null && !hata ? (
        <ActivityIndicator style={styles.yukleniyor} />
      ) : (
        <FlatList
          style={styles.liste}
          data={subeler ?? []}
          keyExtractor={(s) => s.id}
          ListEmptyComponent={<Text style={styles.bosMetin}>Henüz şube yok.</Text>}
          renderItem={({ item }) => (
            <View style={styles.satir}>
              <Pressable style={styles.satirIcerik} onPress={() => router.push(`/sube/${item.id}`)}>
                <Text style={styles.satirMetni}>{item.ad}</Text>
              </Pressable>
              <SilOnayButonu
                onSil={async () => {
                  try {
                    await subeSil(item.id);
                    await yenile();
                  } catch (e) {
                    setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
                  }
                }}
              />
            </View>
          )}
        />
      )}

      <Pressable style={styles.buton} onPress={() => router.push('/yeni-sube')}>
        <Text style={styles.butonMetni}>Yeni Şube Ekle</Text>
      </Pressable>
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
