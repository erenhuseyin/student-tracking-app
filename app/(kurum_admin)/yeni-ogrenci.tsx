// Erişim: yalnızca kurum_admin
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useOturum } from '@/lib/oturum';
import { ogrenciEkle } from '@/lib/ogrenciler';
import { renkler } from '@/lib/tema';

export default function YeniOgrenci() {
  const router = useRouter();
  // kurumId: sınıfın kurumu (kök admin şube sınıfına öğrenci ekliyorsa şube).
  const { sinifId, kurumId } = useLocalSearchParams<{ sinifId: string; kurumId?: string }>();
  const { kullanici } = useOturum();
  const hedefKurumId = kurumId ?? kullanici?.kurum_id;
  const [adSoyad, setAdSoyad] = useState('');
  const [dogumTarihi, setDogumTarihi] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const kaydet = async () => {
    if (!hedefKurumId) {
      setHata('Kurum bilgisi bulunamadı.');
      return;
    }
    setGonderiliyor(true);
    setHata(null);
    try {
      await ogrenciEkle(hedefKurumId, sinifId, adSoyad, dogumTarihi);
      router.back();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');
    } finally {
      setGonderiliyor(false);
    }
  };

  return (
    <View style={styles.kapsayici}>
      <Text style={styles.baslik}>Yeni Öğrenci</Text>

      <TextInput
        style={styles.girdi}
        placeholder="Ad soyad"
        value={adSoyad}
        onChangeText={setAdSoyad}
        editable={!gonderiliyor}
        autoFocus
      />
      <TextInput
        style={styles.girdi}
        placeholder="Doğum tarihi (YYYY-AA-GG)"
        value={dogumTarihi}
        onChangeText={setDogumTarihi}
        editable={!gonderiliyor}
        onSubmitEditing={kaydet}
      />

      {hata ? <Text style={styles.hataMetni}>{hata}</Text> : null}

      <Pressable style={[styles.buton, gonderiliyor && styles.butonPasif]} onPress={kaydet} disabled={gonderiliyor}>
        {gonderiliyor ? <ActivityIndicator color={renkler.anaUstu} /> : <Text style={styles.butonMetni}>Kaydet</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  kapsayici: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  baslik: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  girdi: {
    borderWidth: 1,
    borderColor: renkler.kenarlik,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  hataMetni: {
    color: renkler.hata,
  },
  buton: {
    backgroundColor: renkler.ana,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  butonPasif: {
    opacity: 0.6,
  },
  butonMetni: {
    color: renkler.anaUstu,
    fontWeight: '600',
    fontSize: 16,
  },
});
