// Bir kurumun (kök ya da şube) sınıf listesi + düzenle/sil + yeni sınıf ekleme.
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Buton } from '@/components/Buton';
import { Ikon } from '@/components/Ikon';
import { IkonButon } from '@/components/IkonButon';
import { Liste } from '@/components/Liste';
import { ListeSatiri } from '@/components/ListeSatiri';
import { OnayButonu } from '@/components/OnayButonu';
import { siniflariGetir, sinifSil } from '@/lib/siniflar';
import { bosluk, renkler } from '@/lib/tema';
import type { Sinif } from '@/lib/tipler';

export function SinifListesi({ kurumId }: { kurumId: string }) {
  const router = useRouter();
  const [siniflar, setSiniflar] = useState<Sinif[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const yenile = useCallback(async () => {
    setHata(null);
    try {
      setSiniflar(await siniflariGetir(kurumId));
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
    }
  }, [kurumId]);

  useFocusEffect(
    useCallback(() => {
      yenile();
    }, [yenile]),
  );

  return (
    <View style={styles.kapsayici}>
      <Liste
        veri={siniflar}
        hata={hata}
        anahtar={(s) => s.id}
        bosIkon="school-outline"
        bosBaslik="Henüz sınıf yok"
        bosAciklama="Aşağıdaki butonla ilk sınıfı ekleyin."
        satir={(s) => (
          <ListeSatiri
            baslik={s.ad}
            altBaslik={s.donem}
            sol={<Ikon ad="school-outline" boyut={26} renk={renkler.ana} />}
            onPress={() => router.push(`/sinif/${s.id}`)}
            sag={
              <>
                <IkonButon ikon="create-outline" etiket="Düzenle" onPress={() => router.push(`/sinif-duzenle/${s.id}`)} />
                <OnayButonu
                  ikon="trash-outline"
                  onOnay={async () => {
                    try {
                      await sinifSil(s.id);
                      await yenile();
                    } catch (e) {
                      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
                    }
                  }}
                />
              </>
            }
          />
        )}
      />

      <Buton
        ikon="add"
        baslik="Yeni Sınıf Ekle"
        onPress={() => router.push({ pathname: '/yeni-sinif', params: { kurumId } })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  kapsayici: {
    flex: 1,
    gap: bosluk.m,
  },
});
