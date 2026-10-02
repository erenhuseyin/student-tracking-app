// Erişim: yalnızca kurum_admin
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { SilOnayButonu } from '@/components/SilOnayButonu';
import { ogrencileriGetir, ogrenciSil } from '@/lib/ogrenciler';
import { sinifGetir } from '@/lib/siniflar';
import { renkler } from '@/lib/tema';
import type { Ogrenci, Sinif } from '@/lib/tipler';

export default function SinifDetay() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [sinif, setSinif] = useState<Sinif | null>(null);
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const yenile = useCallback(async () => {
    setHata(null);
    try {
      const [sinifVerisi, ogrenciVerisi] = await Promise.all([sinifGetir(id), ogrencileriGetir(id)]);
      setSinif(sinifVerisi);
      setOgrenciler(ogrenciVerisi);
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      yenile();
    }, [yenile]),
  );

  return (
    <View style={styles.kapsayici}>
      <Text style={styles.baslik}>{sinif ? `${sinif.ad} — ${sinif.donem}` : 'Sınıf'}</Text>

      {hata ? <Text style={styles.hataMetni}>{hata}</Text> : null}

      {ogrenciler === null && !hata ? (
        <ActivityIndicator style={styles.yukleniyor} />
      ) : (
        <FlatList
          style={styles.liste}
          data={ogrenciler ?? []}
          keyExtractor={(o) => o.id}
          ListEmptyComponent={<Text style={styles.bosMetin}>Bu sınıfta henüz öğrenci yok.</Text>}
          renderItem={({ item }) => (
            <View style={styles.satir}>
              <View style={styles.satirIcerik}>
                <Text style={styles.satirMetni}>{item.ad_soyad}</Text>
                <Text style={styles.satirAltMetni}>{item.dogum_tarihi}</Text>
              </View>
              <View style={styles.satirButonlari}>
                <Pressable onPress={() => router.push(`/ogrenci-duzenle/${item.id}`)}>
                  <Text style={styles.duzenleMetni}>Düzenle</Text>
                </Pressable>
                <SilOnayButonu
                  onSil={async () => {
                    try {
                      await ogrenciSil(item.id);
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

      <Pressable style={styles.buton} onPress={() => router.push({ pathname: '/yeni-ogrenci', params: { sinifId: id } })}>
        <Text style={styles.butonMetni}>Yeni Öğrenci Ekle</Text>
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
  satirAltMetni: {
    color: renkler.metinIkincil,
    fontSize: 13,
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
