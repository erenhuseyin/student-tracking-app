import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { marka, veliEpostasi } from '@/lib/marka';
import { pinAuthSifresi } from '@/lib/ogrenciler';
import { supabase } from '@/lib/supabase';

export default function VeliGiris() {
  const [tckn, setTckn] = useState('');
  const [pin, setPin] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const girisYap = async () => {
    if (tckn.trim().length !== 11 || pin.length !== 4) {
      setHata('TCKN 11, PIN 4 haneli olmalı.');
      return;
    }
    setGonderiliyor(true);
    setHata(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: veliEpostasi(tckn.trim()),
      password: pinAuthSifresi(pin),
    });
    setGonderiliyor(false);
    if (error) setHata('TCKN veya PIN hatalı.');
  };

  return (
    <View style={styles.kapsayici}>
      <Text style={styles.baslik}>{marka.ad}</Text>
      <Text style={styles.altBaslik}>Veli girişi</Text>

      <TextInput
        style={styles.girdi}
        placeholder="TCKN"
        keyboardType="number-pad"
        maxLength={11}
        value={tckn}
        onChangeText={setTckn}
        editable={!gonderiliyor}
      />
      <TextInput
        style={styles.girdi}
        placeholder="PIN"
        secureTextEntry
        keyboardType="number-pad"
        maxLength={4}
        value={pin}
        onChangeText={setPin}
        editable={!gonderiliyor}
        onSubmitEditing={girisYap}
      />

      {hata ? <Text style={styles.hataMetni}>{hata}</Text> : null}

      <Pressable style={[styles.buton, gonderiliyor && styles.butonPasif]} onPress={girisYap} disabled={gonderiliyor}>
        {gonderiliyor ? <ActivityIndicator color="#fff" /> : <Text style={styles.butonMetni}>Giriş Yap</Text>}
      </Pressable>

      <Link href="/login" style={styles.altBaslik}>
        Personel misiniz? E-posta ile giriş yapın
      </Link>
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
  },
  altBaslik: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 12,
  },
  girdi: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  hataMetni: {
    color: '#c62828',
  },
  buton: {
    backgroundColor: '#208aef',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  butonPasif: {
    opacity: 0.6,
  },
  butonMetni: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
