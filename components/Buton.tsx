import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { Ikon, type IkonAdi } from '@/components/Ikon';
import { bosluk, dokunmaAlani, renkler, yaricap } from '@/lib/tema';

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

const ON_PLAN: Record<Tur, string> = {
  birincil: renkler.anaUstu,
  ikincil: renkler.ana,
  tehlike: renkler.hata,
  metin: renkler.ana,
};

export function Buton({ baslik, onPress, tur = 'birincil', ikon, yukleniyor = false, pasif = false, buyuk = false }: Props) {
  const engelli = pasif || yukleniyor;
  const onPlan = ON_PLAN[tur];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: engelli, busy: yukleniyor }}
      onPress={onPress}
      disabled={engelli}
      style={({ pressed }) => [
        styles.temel,
        turStilleri[tur],
        buyuk && styles.buyuk,
        pressed && styles.basili,
        engelli && styles.engelli,
      ]}
    >
      {yukleniyor ? (
        <ActivityIndicator color={onPlan} />
      ) : (
        <>
          {ikon ? <Ikon ad={ikon} boyut={20} renk={onPlan} /> : null}
          <Text style={[styles.yazi, { color: onPlan }]}>{baslik}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  temel: {
    minHeight: dokunmaAlani.normal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: bosluk.s,
    paddingHorizontal: bosluk.l,
    borderRadius: yaricap.m,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  buyuk: {
    minHeight: dokunmaAlani.buyuk,
  },
  basili: {
    opacity: 0.8,
  },
  engelli: {
    opacity: 0.5,
  },
  yazi: {
    fontSize: 16,
    fontWeight: '600',
  },
});

const turStilleri = StyleSheet.create({
  birincil: {
    backgroundColor: renkler.ana,
  },
  ikincil: {
    backgroundColor: renkler.yuzey,
    borderColor: renkler.ana,
  },
  tehlike: {
    backgroundColor: renkler.yuzey,
    borderColor: renkler.hata,
  },
  metin: {
    backgroundColor: 'transparent',
  },
});
