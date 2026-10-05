// Veri listelerinin ortak iskeleti: hata kutusu, yükleniyor, boş durum ve aralıklı FlatList.
// `veri` null ise henüz yüklenmemiştir.
import type { ReactElement } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { BosDurum } from '@/components/BosDurum';
import { HataMesaji } from '@/components/HataMesaji';
import type { IkonAdi } from '@/components/Ikon';
import { Yukleniyor } from '@/components/Yukleniyor';
import { bosluk } from '@/lib/tema';

type Props<T> = {
  veri: T[] | null;
  hata: string | null;
  anahtar: (oge: T) => string;
  satir: (oge: T) => ReactElement;
  bosIkon: IkonAdi;
  bosBaslik: string;
  bosAciklama?: string;
  ust?: ReactElement;
};

export function Liste<T>({ veri, hata, anahtar, satir, bosIkon, bosBaslik, bosAciklama, ust }: Props<T>) {
  return (
    <View style={styles.kapsayici}>
      <HataMesaji mesaj={hata} />
      {veri === null && !hata ? (
        <Yukleniyor />
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
    // Kart gölgeleri kenarda kesilmesin.
    marginHorizontal: -bosluk.xs,
  },
  icerik: {
    gap: bosluk.m,
    paddingHorizontal: bosluk.xs,
    paddingBottom: bosluk.l,
  },
});
