import { createContext, useContext, useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { Ikon, type IkonAdi } from '@/components/Ikon';
import { type Tema, useTema } from '@/lib/tema';

// 'web' düzeninde düğme içeriği kadar geniştir; ortalanmış tek kartlı ekranlarda (giriş ekranları)
// Ekran bunu `true` yapar ve düğmeler kartı doldurur.
export const TamGenislikliButon = createContext(false);

type Tur = 'birincil' | 'ikincil' | 'tehlike' | 'metin';

type Props = {
  baslik: string;
  onPress: () => void;
  tur?: Tur;
  ikon?: IkonAdi;
  yukleniyor?: boolean;
  pasif?: boolean;
  // Veli ekranları gibi büyük dokunma alanı gereken yerler için.
  buyuk?: boolean;
};

export function Buton({ baslik, onPress, tur = 'birincil', ikon, yukleniyor = false, pasif = false, buyuk = false }: Props) {
  const tema = useTema();
  const { styles, onPlan } = useMemo(() => olustur(tema), [tema]);
  const tamGenislik = useContext(TamGenislikliButon);
  const engelli = pasif || yukleniyor;
  const renk = onPlan[tur];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: engelli, busy: yukleniyor }}
      onPress={onPress}
      disabled={engelli}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.temel,
        // 'web' düzeninde düğme içeriği kadar geniştir; telefonda satırı doldurur.
        tema.duzen === 'web' && !tamGenislik && styles.web,
        hovered && !engelli && styles.uzerinde,
        styles[tur],
        buyuk && styles.buyuk,
        pressed && styles.basili,
        engelli && styles.engelli,
      ]}
    >
      {yukleniyor ? (
        <ActivityIndicator color={renk} />
      ) : (
        <>
          {ikon ? <Ikon ad={ikon} boyut={20} renk={renk} /> : null}
          <Text style={[styles.yazi, { color: renk }]}>{baslik}</Text>
        </>
      )}
    </Pressable>
  );
}

function olustur(t: Tema) {
  const onPlan: Record<Tur, string> = {
    birincil: t.renkler.anaUzeriMetin,
    ikincil: t.renkler.ana,
    tehlike: t.renkler.hata,
    metin: t.renkler.ana,
  };
  const styles = StyleSheet.create({
    temel: {
      minHeight: t.dokunmaAlani.normal,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: t.bosluk.s,
      paddingHorizontal: t.bosluk.l,
      borderRadius: t.yaricap.m,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    buyuk: {
      minHeight: t.dokunmaAlani.buyuk,
    },
    web: {
      alignSelf: 'flex-start',
    },
    uzerinde: {
      opacity: 0.9,
    },
    basili: {
      opacity: 0.8,
    },
    engelli: {
      opacity: 0.5,
    },
    yazi: {
      ...t.yazi.govde,
      fontFamily: t.yaziTipi.yariKalin,
    },
    birincil: {
      backgroundColor: t.renkler.ana,
    },
    ikincil: {
      backgroundColor: t.renkler.yuzey,
      borderColor: t.renkler.ana,
    },
    tehlike: {
      backgroundColor: t.renkler.yuzey,
      borderColor: t.renkler.hata,
    },
    metin: {
      backgroundColor: 'transparent',
    },
  });
  return { styles, onPlan };
}
