// Erişim: hesabı başka bir müşterinin uygulamasına ait olan herkes (bkz. lib/oturum.tsx,
// durum: yanlis_uygulama). Süper admin bu ekrana düşmez.
import { StyleSheet, Text, View } from 'react-native';

import { CikisYapButonu } from '@/components/CikisYapButonu';
import { marka } from '@/lib/marka';
import { renkler } from '@/lib/tema';

export default function YanlisUygulama() {
  return (
    <View style={styles.kapsayici}>
      <Text style={styles.baslik}>Bu hesap bu uygulamaya ait değil</Text>
      <Text style={styles.aciklama}>
        Hesabınız {marka.ad} uygulamasına kayıtlı değil. Lütfen kurumunuzun kendi uygulamasını kullanın.
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
    textAlign: 'center',
  },
  aciklama: {
    textAlign: 'center',
    color: renkler.metinOrta,
  },
});
