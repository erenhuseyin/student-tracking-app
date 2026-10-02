// Erişim: yalnızca kök kurumun kurum_admin'i (RLS: kurum_admin_sube_ekle; şube admini
// denerse 2 seviye sınırı reddeder).
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { subeEkle } from '@/lib/kurumlar';
import { useOturum } from '@/lib/oturum';
import { renkler } from '@/lib/tema';

export default function YeniSube() {
  const router = useRouter();
  const { kurum } = useOturum();
  const [ad, setAd] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const kaydet = async () => {
    if (!kurum) {
      setHata('Kurum bilgisi bulunamadı.');
      return;
    }
    setGonderiliyor(true);
    setHata(null);
    try {
      await subeEkle(kurum.id, ad);
      router.back();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');
    } finally {
      setGonderiliyor(false);
    }
  };

  return (
    <View style={styles.kapsayici}>
      <Text style={styles.baslik}>Yeni Şube</Text>

      <TextInput
        style={styles.girdi}
        placeholder="Şube adı (örn. Bakırköy)"
        value={ad}
        onChangeText={setAd}
        editable={!gonderiliyor}
        onSubmitEditing={kaydet}
        autoFocus
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
