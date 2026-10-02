// Erişim: auth hesabı olup `kullanici` satırı olmayan herkes (bkz. lib/oturum.tsx, durum: profil_yok).
import { StyleSheet, Text, View } from 'react-native';

import { CikisYapButonu } from '@/components/CikisYapButonu';
import { renkler } from '@/lib/tema';

export default function ProfilYok() {
  return (
    <View style={styles.kapsayici}>
      <Text style={styles.baslik}>Hesabınız bulunamadı</Text>
      <Text style={styles.aciklama}>
        Bu hesap sisteme kayıtlı değil. Lütfen kurumunuzun yöneticisiyle iletişime geçin.
      </Text>
      <CikisYapButonu />
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
    color: renkler.metinOrta,
  },
});
