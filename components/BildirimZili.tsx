// Sekme ekranlarının başlık çubuğunda (solda) bildirim zili; okunmamış bildirim varsa sayısını
// gösterir. Sayı, ekran değiştikçe yeniden okunur.
import { usePathname, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { IkonButon } from '@/components/IkonButon';
import { okunmamisBildirimSayisi } from '@/lib/bildirimMerkezi';
import { useOturum } from '@/lib/oturum';
import { type Tema, useTema } from '@/lib/tema';

export function BildirimZili() {
  const router = useRouter();
  const yol = usePathname();
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const { kullanici } = useOturum();
  const [sayi, setSayi] = useState(0);
  const kullaniciId = kullanici?.id;

  useEffect(() => {
    if (!kullaniciId) return;
    let iptalEdildi = false;
    okunmamisBildirimSayisi(kullaniciId).then((s) => {
      if (!iptalEdildi) setSayi(s);
    });
    return () => {
      iptalEdildi = true;
    };
  }, [kullaniciId, yol]);

  return (
    <View>
      <IkonButon
        ikon="notifications-outline"
        etiket={sayi > 0 ? `Bildirimler, ${sayi} okunmamış` : 'Bildirimler'}
        onPress={() => router.push('/bildirimler')}
      />
      {sayi > 0 ? (
        <View pointerEvents="none" style={styles.rozet}>
          <Text style={styles.rozetMetni}>{sayi > 9 ? '9+' : sayi}</Text>
        </View>
      ) : null}
    </View>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    rozet: {
      position: 'absolute',
      top: 6,
      right: 4,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.renkler.hata,
    },
    rozetMetni: {
      fontFamily: t.yaziTipi.kalin,
      fontSize: 11,
      color: '#FFFFFF',
    },
  });
}
