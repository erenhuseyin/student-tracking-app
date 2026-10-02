import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { marka } from '@/lib/marka';
import { supabase } from '@/lib/supabase';

function hataMesajinaCevir(mesaj: string): string {
  if (/invalid login credentials/i.test(mesaj)) return 'E-posta veya şifre hatalı.';
  if (/email not confirmed/i.test(mesaj)) return 'E-posta adresiniz henüz onaylanmamış.';
  if (/network|fetch/i.test(mesaj)) return 'Bağlantı sorunu, lütfen tekrar deneyin.';
  return 'Giriş yapılamadı, lütfen tekrar deneyin.';
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [sifre, setSifre] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const girisYap = async () => {
    if (!email.trim() || !sifre) {
      setHata('E-posta ve şifre gerekli.');
      return;
    }
    setGonderiliyor(true);
    setHata(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: sifre });
    setGonderiliyor(false);
    if (error) setHata(hataMesajinaCevir(error.message));
  };

  return (
    <View style={styles.kapsayici}>
      <Text style={styles.baslik}>{marka.ad}</Text>
      <Text style={styles.altBaslik}>Hesabınızla giriş yapın</Text>

      <TextInput
        style={styles.girdi}
        placeholder="E-posta"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        editable={!gonderiliyor}
      />
      <TextInput
        style={styles.girdi}
        placeholder="Şifre"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password"
        value={sifre}
        onChangeText={setSifre}
        editable={!gonderiliyor}
        onSubmitEditing={girisYap}
      />

      {hata ? <Text style={styles.hataMetni}>{hata}</Text> : null}

      <Pressable
        style={[styles.buton, gonderiliyor && styles.butonPasif]}
        onPress={girisYap}
        disabled={gonderiliyor}
      >
        {gonderiliyor ? <ActivityIndicator color="#fff" /> : <Text style={styles.butonMetni}>Giriş Yap</Text>}
      </Pressable>

      <Link href="/veli-giris" style={styles.altBaslik}>
        Veli misiniz? TCKN ile giriş yapın
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
