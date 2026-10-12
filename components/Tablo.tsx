// Tablo görünümü. Başlık satırı vurguSoluk zeminli, satır yüksekliği 48.
// `Liste` bileşeni masaüstü genişlikte (>=1024), `sutunlar` verilmişse otomatik buna döner (bkz.
// Liste.tsx); yönetim ekranları `VeriEkrani` üzerinden kullanır; doğrudan da kullanılabilir.
// Web'de fare üzerine gelince satır hafifçe vurgulanır (hover); native tarafta
// `onHoverIn/onHoverOut` sessizce yok sayılır.
//
// Sıralama denetimlidir: tablo yalnızca oku çizer ve `onSirala`'yı çağırır; satırları sıralamak
// (sunucuda ya da istemcide) ekranın işidir, çünkü sayfalanan veride sıralama sorguya aittir.
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Ikon } from '@/components/Ikon';
import { type Tema, useTema } from '@/lib/tema';

export type TabloSutunu<T> = {
  anahtar: string;
  baslik: string;
  // Metin dönerse tek satırlık gövde yazısı olarak çizilir.
  icerik: (oge: T) => ReactNode;
  // Verilmezse sütun eşit pay alır.
  genislik?: number;
  hizalama?: 'sol' | 'sag';
  // Başlığına tıklanınca `onSirala(anahtar)` çağrılır.
  siralanabilir?: boolean;
  // Yer daralınca (ör. yan panel açıkken) ilk gizlenecek sütun; bkz. VeriEkrani.
  ikincil?: boolean;
};

export type TabloSiralamasi = { anahtar: string; yon: 'artan' | 'azalan' };

type Props<T> = {
  veri: T[];
  sutunlar: TabloSutunu<T>[];
  anahtar: (oge: T) => string;
  onPress?: (oge: T) => void;
  // Seçili satır (yan panelde açık olan kayıt) vurgulanır.
  seciliAnahtar?: string | null;
  siralama?: TabloSiralamasi | null;
  onSirala?: (sutunAnahtari: string) => void;
  // Tablo bundan dar bir alana düşerse yatay kayar (sütunlar sıkışıp okunmaz olmasın diye).
  enAzGenislik?: number;
};

export function Tablo<T>({ veri, sutunlar, anahtar, onPress, seciliAnahtar, siralama, onSirala, enAzGenislik }: Props<T>) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);

  const sutunStili = (s: TabloSutunu<T>) => [
    s.genislik ? { width: s.genislik, flexGrow: 0, flexShrink: 0 } : styles.esitSutun,
    s.hizalama === 'sag' && styles.sagaYasli,
  ];

  const baslik = (s: TabloSutunu<T>) => {
    const metin = (
      <Text style={styles.baslikMetni} numberOfLines={1}>
        {s.baslik}
      </Text>
    );
    if (!s.siralanabilir || !onSirala) {
      return (
        <View key={s.anahtar} style={sutunStili(s)}>
          {metin}
        </View>
      );
    }
    const etkin = siralama?.anahtar === s.anahtar;
    return (
      <Pressable
        key={s.anahtar}
        accessibilityRole="button"
        accessibilityLabel={`${s.baslik} sütununa göre sırala`}
        onPress={() => onSirala(s.anahtar)}
        style={[sutunStili(s), styles.siralanabilirBaslik]}
      >
        {metin}
        <Ikon
          ad={etkin ? (siralama.yon === 'artan' ? 'arrow-up' : 'arrow-down') : 'swap-vertical'}
          boyut={14}
          renk={etkin ? tema.renkler.ana : tema.renkler.kenarlik}
        />
      </Pressable>
    );
  };

  const tablo = (
    <View style={[styles.tablo, enAzGenislik ? { minWidth: enAzGenislik, flexGrow: 1 } : null]}>
      <View style={[styles.satir, styles.baslikSatiri]}>{sutunlar.map(baslik)}</View>
      {veri.map((oge) => (
        <TabloSatiri
          key={anahtar(oge)}
          tema={tema}
          secili={seciliAnahtar === anahtar(oge)}
          onPress={onPress ? () => onPress(oge) : undefined}
        >
          {sutunlar.map((s) => {
            const icerik = s.icerik(oge);
            return (
              <View key={s.anahtar} style={sutunStili(s)}>
                {typeof icerik === 'string' || typeof icerik === 'number' ? (
                  <Text style={[styles.hucreMetni, s.hizalama === 'sag' && styles.sagaYasli]} numberOfLines={1}>
                    {icerik}
                  </Text>
                ) : (
                  icerik
                )}
              </View>
            );
          })}
        </TabloSatiri>
      ))}
    </View>
  );

  if (!enAzGenislik) return tablo;
  return (
    <ScrollView horizontal contentContainerStyle={styles.yatayIcerik} showsHorizontalScrollIndicator>
      {tablo}
    </ScrollView>
  );
}

function TabloSatiri({
  tema,
  secili,
  onPress,
  children,
}: {
  tema: Tema;
  secili: boolean;
  onPress?: () => void;
  children: ReactNode;
}) {
  const styles = useMemo(() => olustur(tema), [tema]);
  const [vurgulu, setVurgulu] = useState(false);

  const icerik = (
    <View style={[styles.satir, styles.veriSatiri, vurgulu && styles.vurguluSatir, secili && styles.seciliSatir]}>
      {children}
    </View>
  );

  if (!onPress) return icerik;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: secili }}
      onPress={onPress}
      onHoverIn={() => setVurgulu(true)}
      onHoverOut={() => setVurgulu(false)}
      style={({ pressed }) => [pressed && styles.basili]}
    >
      {icerik}
    </Pressable>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    tablo: {
      borderRadius: t.yaricap.l,
      borderWidth: 1,
      borderColor: t.renkler.ayirici,
      overflow: 'hidden',
    },
    yatayIcerik: {
      flexGrow: 1,
    },
    satir: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 48,
      paddingHorizontal: t.bosluk.l,
      gap: t.bosluk.m,
    },
    baslikSatiri: {
      backgroundColor: t.renkler.vurguSoluk,
    },
    baslikMetni: {
      ...t.yazi.etiket,
      flexShrink: 1,
    },
    siralanabilirBaslik: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.xs,
      minHeight: 48,
    },
    hucreMetni: {
      ...t.yazi.govde,
    },
    veriSatiri: {
      backgroundColor: t.renkler.yuzey,
      borderTopWidth: 1,
      borderTopColor: t.renkler.ayirici,
    },
    vurguluSatir: {
      backgroundColor: t.renkler.anaSoluk,
    },
    seciliSatir: {
      backgroundColor: t.renkler.anaSoluk,
      borderLeftWidth: 3,
      borderLeftColor: t.renkler.ana,
      paddingLeft: t.bosluk.l - 3,
    },
    basili: {
      opacity: 0.7,
    },
    esitSutun: {
      flex: 1,
      minWidth: 0,
    },
    sagaYasli: {
      textAlign: 'right',
      alignItems: 'flex-end',
    },
  });
}
