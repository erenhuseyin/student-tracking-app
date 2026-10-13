// Veri listelerinin ortak iskeleti: hata kutusu, yükleniyor, boş durum ve aralıklı FlatList.
// `veri` null ise henüz yüklenmemiştir. `sutunlar` verilen bir ekran 'web' düzeninde (bkz.
// lib/tema.ts > useDuzen) Tablo görünümüne döner; 'mobil' düzende ve `sutunlar` vermeyen ekranlarda
// kart listesi çizilir.
import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { BosDurum } from '@/components/BosDurum';
import { HataMesaji } from '@/components/HataMesaji';
import type { IkonAdi } from '@/components/Ikon';
import { SkeletonSatir } from '@/components/Skeleton';
import { Tablo, type TabloSutunu } from '@/components/Tablo';
import { type Tema, useTema } from '@/lib/tema';

type Props<T> = {
  veri: T[] | null;
  hata: string | null;
  anahtar: (oge: T) => string;
  satir: (oge: T) => ReactElement;
  bosIkon: IkonAdi;
  bosBaslik: string;
  bosAciklama?: string;
  ust?: ReactElement;
  // Listenin altında, satırlarla birlikte kayan içerik (liste boşken gösterilmez).
  alt?: ReactElement;
  // Verilirse 'web' düzeninde bu sütunlarla bir Tablo gösterilir.
  sutunlar?: TabloSutunu<T>[];
  onSatirPress?: (oge: T) => void;
  // Verilirse liste aşağı çekilerek yenilenebilir (telefon). Web'de etkisizdir.
  onYenile?: () => Promise<unknown> | void;
};

export function Liste<T>({
  veri,
  hata,
  anahtar,
  satir,
  bosIkon,
  bosBaslik,
  bosAciklama,
  ust,
  alt,
  sutunlar,
  onSatirPress,
  onYenile,
}: Props<T>) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const masaustuTablo = sutunlar && tema.duzen === 'web';
  const satirlar = veri ?? [];
  const [yenileniyor, setYenileniyor] = useState(false);
  const yenile = async () => {
    setYenileniyor(true);
    try {
      await onYenile?.();
    } finally {
      setYenileniyor(false);
    }
  };

  return (
    <View style={styles.kapsayici}>
      <HataMesaji mesaj={hata} />
      {veri === null ? (
        hata ? null : (
          <View style={styles.iskeletListesi}>
            {Array.from({ length: 4 }, (_, i) => (
              <SkeletonSatir key={i} />
            ))}
          </View>
        )
      ) : masaustuTablo ? (
        <>
          {ust}
          {satirlar.length === 0 ? (
            hata ? null : (
              <BosDurum ikon={bosIkon} baslik={bosBaslik} aciklama={bosAciklama} />
            )
          ) : (
            <Tablo veri={satirlar} sutunlar={sutunlar} anahtar={anahtar} onPress={onSatirPress} />
          )}
        </>
      ) : (
        <FlatList
          style={styles.liste}
          contentContainerStyle={styles.icerik}
          data={veri ?? []}
          keyExtractor={anahtar}
          renderItem={({ item }) => satir(item)}
          ListHeaderComponent={veri && veri.length > 0 ? ust : null}
          ListFooterComponent={veri && veri.length > 0 ? alt : null}
          ListEmptyComponent={hata ? null : <BosDurum ikon={bosIkon} baslik={bosBaslik} aciklama={bosAciklama} />}
          refreshControl={
            onYenile ? (
              <RefreshControl refreshing={yenileniyor} onRefresh={yenile} tintColor={tema.renkler.anaParlak} colors={[tema.renkler.ana]} />
            ) : undefined
          }
        />
      )}
    </View>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    kapsayici: {
      flex: 1,
      gap: t.bosluk.m,
    },
    liste: {
      flex: 1,
    },
    icerik: {
      gap: t.duzen === 'web' ? t.bosluk.s : t.bosluk.m,
      paddingBottom: t.bosluk.l,
    },
    iskeletListesi: {
      gap: t.bosluk.m,
    },
  });
}
