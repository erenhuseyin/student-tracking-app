// Erişim: yalnızca veli
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { ogrenciGetir } from '@/lib/ogrenciler';
import { renkler } from '@/lib/tema';
import type { Ogrenci, Yoklama, YoklamaDurumu } from '@/lib/tipler';
import { veliYoklamalariGetir } from '@/lib/yoklama';

const DURUM_ETIKETLERI: Record<YoklamaDurumu, string> = {
  geldi: 'Geldi',
  gelmedi: 'Gelmedi',
  gec: 'Geç',
};

export default function VeliYoklamaGecmisi() {
  const { ogrenciId } = useLocalSearchParams<{ ogrenciId: string }>();
  const [ogrenci, setOgrenci] = useState<Ogrenci | null>(null);
  const [kayitlar, setKayitlar] = useState<Yoklama[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setHata(null);
      Promise.all([ogrenciGetir(ogrenciId), veliYoklamalariGetir(ogrenciId)])
        .then(([o, y]) => {
          setOgrenci(o);
          setKayitlar(y);
        })
        .catch((e: Error) => setHata(e.message));
    }, [ogrenciId]),
  );

  return (
    <View style={styles.kapsayici}>
      <Text style={styles.baslik}>{ogrenci ? ogrenci.ad_soyad : 'Yoklama Geçmişi'}</Text>

      {hata ? <Text style={styles.hataMetni}>{hata}</Text> : null}

      {kayitlar === null && !hata ? (
        <ActivityIndicator style={styles.yukleniyor} />
      ) : (
        <FlatList
          style={styles.liste}
          data={kayitlar ?? []}
          keyExtractor={(y) => y.id}
          ListEmptyComponent={<Text style={styles.bosMetin}>Henüz yoklama kaydı yok.</Text>}
          renderItem={({ item }) => (
            <View style={styles.satir}>
              <Text style={styles.satirMetni}>{item.tarih}</Text>
              <Text style={styles.durumMetni}>{DURUM_ETIKETLERI[item.durum]}</Text>
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
    gap: 12,
  },
  baslik: {
    fontSize: 22,
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
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: renkler.ayirici,
  },
  satirMetni: {
    fontSize: 16,
  },
  durumMetni: {
    fontWeight: '600',
    color: renkler.metin,
  },
  hataMetni: {
    color: renkler.hata,
    textAlign: 'center',
  },
});
