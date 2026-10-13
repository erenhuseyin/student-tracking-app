// 'web' düzeninde ekranların üstündeki sayfa başlığı: telefon başlık çubuğunun (ortalanmış başlık +
// geri oku) yerini alır. Başlık solda, alt ekranlarda geri bağlantısı, sağda ekranın eylemleri
// (`headerRight`) ve bildirim zili. Ekranlar başlığı ve eylemi yine `Stack.Screen options` ile verir.
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BildirimZili } from '@/components/BildirimZili';
import { Ikon } from '@/components/Ikon';
import { useOturum } from '@/lib/oturum';
import { type Tema, useTema } from '@/lib/tema';

type Props = {
  baslik: string;
  // Verilirse başlığın solunda geri bağlantısı çizilir.
  onGeri?: () => void;
  sag?: ReactNode;
};

export function WebBaslik({ baslik, onGeri, sag }: Props) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const { kullanici } = useOturum();
  // Süper admine bildirim gönderilmez.
  const zilVar = kullanici !== null && kullanici.rol !== 'super_admin';

  return (
    <View style={styles.cubuk}>
      {onGeri ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Geri"
          onPress={onGeri}
          style={({ hovered, pressed }: { hovered?: boolean; pressed: boolean }) => [
            styles.geri,
            (hovered || pressed) && styles.geriVurgulu,
          ]}
        >
          <Ikon ad="arrow-back" boyut={18} renk={tema.renkler.metinIkincil} />
        </Pressable>
      ) : null}
      <Text accessibilityRole="header" style={styles.baslik} numberOfLines={1}>
        {baslik}
      </Text>
      <View style={styles.sag}>
        {sag}
        {zilVar ? <BildirimZili /> : null}
      </View>
    </View>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    cubuk: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.m,
      height: 64,
      paddingHorizontal: t.kenarBosluklari.web,
      backgroundColor: t.renkler.zemin,
      borderBottomWidth: 1,
      borderBottomColor: t.renkler.ayirici,
    },
    geri: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: t.yaricap.s,
      borderWidth: 1,
      borderColor: t.renkler.ayirici,
      backgroundColor: t.renkler.yuzey,
    },
    geriVurgulu: {
      backgroundColor: t.renkler.ayirici,
    },
    baslik: {
      ...t.yazi.bolum,
      fontSize: 20,
      flex: 1,
    },
    sag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.s,
    },
  });
}
