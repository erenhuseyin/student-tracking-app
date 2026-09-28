// Erişim: yalnızca ogretmen
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useOturum } from '@/lib/oturum';
import type { YoklamaDurumu } from '@/lib/tipler';
import { bugununTarihi, bugununYoklamasiniGetir, type OgrenciYoklamaSatiri, yoklamaKaydet } from '@/lib/yoklama';

const DURUM_ETIKETLERI: Record<YoklamaDurumu, string> = {
  geldi: 'Geldi',
  gelmedi: 'Gelmedi',
  gec: 'Geç',
};

export default function OgretmenYoklama() {
  const { sinifId } = useLocalSearchParams<{ sinifId: string }>();
  const { kullanici } = useOturum();
  const [ogrenciler, setOgrenciler] = useState<OgrenciYoklamaSatiri[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [kaydedenId, setKaydedenId] = useState<string | null>(null);

  const yenile = useCallback(async () => {
    setHata(null);
    try {
      setOgrenciler(await bugununYoklamasiniGetir(sinifId));
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
    }
  }, [sinifId]);

  useFocusEffect(
    useCallback(() => {
      yenile();
    }, [yenile]),
  );

  const isaretle = async (ogrenciId: string, durum: YoklamaDurumu) => {
    if (!kullanici?.kurum_id) {
      setHata('Kurum bilgisi bulunamadı.');
      return;
    }
    setKaydedenId(ogrenciId);
    setHata(null);
    try {
      await yoklamaKaydet(kullanici.kurum_id, ogrenciId, kullanici.id, durum);
      setOgrenciler((mevcut) =>
        (mevcut ?? []).map((o) => (o.id === ogrenciId ? { ...o, yoklama_durumu: durum } : o)),
      );
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
    } finally {
      setKaydedenId(null);
    }
  };

  return (
    <View style={styles.kapsayici}>
      <Text style={styles.baslik}>Yoklama</Text>
      <Text style={styles.altBaslik}>{bugununTarihi()}</Text>

      {hata ? <Text style={styles.hataMetni}>{hata}</Text> : null}

      {ogrenciler === null && !hata ? (
        <ActivityIndicator style={styles.yukleniyor} />
      ) : (
        <FlatList
          style={styles.liste}
          data={ogrenciler ?? []}
          keyExtractor={(o) => o.id}
          ListEmptyComponent={<Text style={styles.bosMetin}>Bu sınıfta öğrenci yok.</Text>}
          renderItem={({ item }) => (
            <View style={styles.satir}>
              <Text style={styles.satirMetni}>{item.ad_soyad}</Text>
              <View style={styles.durumButonlari}>
                {kaydedenId === item.id ? (
                  <ActivityIndicator size="small" />
                ) : (
                  (Object.keys(DURUM_ETIKETLERI) as YoklamaDurumu[]).map((durum) => (
                    <Pressable
                      key={durum}
                      style={[styles.durumButonu, item.yoklama_durumu === durum && styles.durumButonuSecili]}
                      onPress={() => isaretle(item.id, durum)}
                    >
                      <Text
                        style={[styles.durumMetni, item.yoklama_durumu === durum && styles.durumMetniSecili]}
                      >
                        {DURUM_ETIKETLERI[durum]}
                      </Text>
                    </Pressable>
                  ))
                )}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  kapsayici: {
    flex: 1,
    padding: 24,
    gap: 4,
  },
  baslik: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 24,
  },
  altBaslik: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 12,
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 8,
  },
  satirMetni: {
    fontSize: 16,
  },
  durumButonlari: {
    flexDirection: 'row',
    gap: 8,
  },
  durumButonu: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  durumButonuSecili: {
    backgroundColor: '#208aef',
    borderColor: '#208aef',
  },
  durumMetni: {
    color: '#333',
  },
  durumMetniSecili: {
    color: '#fff',
    fontWeight: '600',
  },
  hataMetni: {
    color: '#c62828',
    textAlign: 'center',
  },
});
