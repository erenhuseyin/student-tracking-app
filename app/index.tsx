import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useOturum } from '@/lib/oturum';

export default function Index() {
  const { durum, kullanici, cikisYap } = useOturum();

  if (durum === 'profil_yok') {
    return (
      <View style={styles.kapsayici}>
        <Text style={styles.baslik}>Hesabınız bulunamadı</Text>
        <Text style={styles.aciklama}>
          Bu hesap sisteme kayıtlı değil. Lütfen kurumunuzun yöneticisiyle iletişime geçin.
        </Text>
        <Pressable style={styles.buton} onPress={cikisYap}>
          <Text style={styles.butonMetni}>Çıkış Yap</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.kapsayici}>
      <Text style={styles.baslik}>Öğrenci Takip</Text>
      <Text style={styles.aciklama}>
        Hoş geldin, {kullanici?.ad_soyad} ({kullanici?.rol})
      </Text>
      <Pressable style={styles.buton} onPress={cikisYap}>
        <Text style={styles.butonMetni}>Çıkış Yap</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  kapsayici: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  baslik: {
    fontSize: 24,
    fontWeight: '600',
  },
  aciklama: {
    textAlign: 'center',
    color: '#444',
  },
  buton: {
    backgroundColor: '#208aef',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  butonMetni: {
    color: '#fff',
    fontWeight: '600',
  },
});
