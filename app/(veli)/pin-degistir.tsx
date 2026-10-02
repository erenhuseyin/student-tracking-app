// Erişim: yalnızca veli (kendi PIN'ini değiştirir)
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { pinAuthSifresi } from '@/lib/ogrenciler';
import { supabase } from '@/lib/supabase';
import { renkler } from '@/lib/tema';

export default function PinDegistir() {
  const router = useRouter();
  const [yeniPin, setYeniPin] = useState('');
  const [yeniPinTekrar, setYeniPinTekrar] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const kaydet = async () => {
    if (yeniPin.length !== 4) {
      setHata('PIN 4 haneli olmalı.');
      return;
    }
    if (yeniPin !== yeniPinTekrar) {
      setHata('Girdiğiniz PIN\'ler eşleşmiyor.');
      return;
    }
    setGonderiliyor(true);
    setHata(null);
    const { error } = await supabase.auth.updateUser({ password: pinAuthSifresi(yeniPin) });
    setGonderiliyor(false);
    if (error) {
      setHata('PIN değiştirilemedi, lütfen tekrar deneyin.');
      return;
    }
    router.back();
  };

  return (
    <View style={styles.kapsayici}>
      <Text style={styles.baslik}>PIN&apos;imi Değiştir</Text>

      <TextInput
        style={styles.girdi}
        placeholder="Yeni PIN"
        secureTextEntry
        keyboardType="number-pad"
        maxLength={4}
        value={yeniPin}
        onChangeText={setYeniPin}
        editable={!gonderiliyor}
      />
      <TextInput
        style={styles.girdi}
        placeholder="Yeni PIN (tekrar)"
        secureTextEntry
        keyboardType="number-pad"
        maxLength={4}
        value={yeniPinTekrar}
        onChangeText={setYeniPinTekrar}
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
