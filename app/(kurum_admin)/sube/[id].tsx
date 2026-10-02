// Erişim: yalnızca kök kurumun kurum_admin'i (RLS: şube admini başka şubeyi okuyamaz).
// Kök admin bir şubenin sınıflarını burada yönetir.
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SinifListesi } from '@/components/SinifListesi';
import { kurumGetir } from '@/lib/kurumlar';
import { renkler } from '@/lib/tema';

export default function SubeDetay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ad, setAd] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    let iptalEdildi = false;
    kurumGetir(id)
      .then((sube) => {
        if (!iptalEdildi) setAd(sube.ad);
      })
      .catch((e: Error) => {
        if (!iptalEdildi) setHata(e.message);
      });
    return () => {
      iptalEdildi = true;
    };
  }, [id]);

  return (
    <View style={styles.kapsayici}>
      <Text style={styles.baslik}>{ad ?? 'Şube'}</Text>
      {hata ? <Text style={styles.hataMetni}>{hata}</Text> : <SinifListesi kurumId={id} />}
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
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 24,
  },
  hataMetni: {
    color: renkler.hata,
    textAlign: 'center',
  },
});
