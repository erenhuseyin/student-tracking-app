// Veri listelerinin ortak iskeleti: hata kutusu, yükleniyor, boş durum ve aralıklı FlatList.
// `veri` null ise henüz yüklenmemiştir. `sutunlar` verilen bir ekran, masaüstü genişlikte
// (>=1024) otomatik olarak Tablo görünümüne döner; vermeyen ekranlar her genişlikte kart
// listesi olarak kalır (kademeli geçiş — bkz. lib/tema.ts dosya başı notu).
import type { ReactElement } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { BosDurum } from '@/components/BosDurum';
import { HataMesaji } from '@/components/HataMesaji';
import type { IkonAdi } from '@/components/Ikon';
import { SkeletonSatir } from '@/components/Skeleton';
import { Tablo, type TabloSutunu } from '@/components/Tablo';
import { bosluk, useKirilma } from '@/lib/tema';

type Props<T> = {
  veri: T[] | null;
  hata: string | null;
  anahtar: (oge: T) => string;
  satir: (oge: T) => ReactElement;
  bosIkon: IkonAdi;
  bosBaslik: string;
  bosAciklama?: string;
  ust?: ReactElement;
  // Verilirse masaüstü genişlikte bu sütunlarla bir Tablo gösterilir.
  sutunlar?: TabloSutunu<T>[];
  onSatirPress?: (oge: T) => void;
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
  sutunlar,
  onSatirPress,
}: Props<T>) {
  const kirilma = useKirilma();
  const masaustuTablo = sutunlar && kirilma === 'masaustu';
  const satirlar = veri ?? [];

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
          ListEmptyComponent={hata ? null : <BosDurum ikon={bosIkon} baslik={bosBaslik} aciklama={bosAciklama} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  kapsayici: {
    flex: 1,
    gap: bosluk.m,
  },
  liste: {
    flex: 1,
  },
  icerik: {
    gap: bosluk.m,
    paddingBottom: bosluk.l,
  },
  iskeletListesi: {
    gap: bosluk.m,
  },
});
