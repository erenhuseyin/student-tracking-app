// Erişim: yalnızca kurum_admin. Gelişim kategorileri müşteri (ana kurum) düzeyindedir ve
// şubeler ortak kullanır; yalnızca ana kurumun yöneticisi düzenler (RLS de bunu zorlar),
// şube yöneticisi bu ekranı salt okunur görür.
import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { Girdi } from '@/components/Girdi';
import { IkonButon } from '@/components/IkonButon';
import { Kart } from '@/components/Kart';
import { Liste } from '@/components/Liste';
import { ListeSatiri } from '@/components/ListeSatiri';
import { OnayButonu } from '@/components/OnayButonu';
import { kategoriEkle, kategoriGuncelle, kategorileriGetir, kategoriSil } from '@/lib/gelisim';
import { useOturum } from '@/lib/oturum';
import { type Tema, useTema } from '@/lib/tema';
import type { GelisimKategorisi } from '@/lib/tipler';

export default function GelisimKategorileri() {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const { kurum } = useOturum();
  const kokKurumMu = kurum !== null && kurum.ust_kurum_id === null;
  const [kategoriler, setKategoriler] = useState<GelisimKategorisi[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  // Form hem ekleme hem yeniden adlandırma içindir; `duzenlenen` doluysa o kategori güncellenir.
  const [duzenlenen, setDuzenlenen] = useState<GelisimKategorisi | null>(null);
  const [ad, setAd] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);

  const yenile = useCallback(async () => {
    try {
      setKategoriler(await kategorileriGetir());
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setHata(null);
      yenile();
    }, [yenile]),
  );

  // Hata listenin üstünde gösterilir; başarılıysa liste tazelenir.
  const calistir = async (islem: () => Promise<unknown>): Promise<boolean> => {
    setHata(null);
    try {
      await islem();
      await yenile();
      return true;
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
      return false;
    }
  };

  const formuKapat = () => {
    setDuzenlenen(null);
    setAd('');
  };

  const kaydet = async () => {
    if (!kurum) return;
    setGonderiliyor(true);
    const basarili = await calistir(() =>
      duzenlenen ? kategoriGuncelle(duzenlenen.id, { ad }) : kategoriEkle(kurum.id, ad),
    );
    if (basarili) formuKapat();
    setGonderiliyor(false);
  };

  return (
    <Ekran>
      <Stack.Screen options={{ title: 'Gelişim Kategorileri' }} />

      {kokKurumMu ? (
        <Kart>
          <Girdi
            etiket={duzenlenen ? `"${duzenlenen.ad}" için yeni ad` : 'Yeni kategori'}
            value={ad}
            onChangeText={setAd}
            editable={!gonderiliyor}
            maxLength={40}
          />
          <View style={styles.formButonlari}>
            {duzenlenen ? (
              <View style={styles.formButonu}>
                <Buton tur="ikincil" baslik="Vazgeç" onPress={formuKapat} pasif={gonderiliyor} />
              </View>
            ) : null}
            <View style={styles.formButonu}>
              <Buton
                ikon={duzenlenen ? undefined : 'add'}
                baslik={duzenlenen ? 'Kaydet' : 'Ekle'}
                onPress={kaydet}
                yukleniyor={gonderiliyor}
              />
            </View>
          </View>
        </Kart>
      ) : (
        <Text style={tema.yazi.kucuk}>Kategorileri ana kurumun yöneticisi düzenler.</Text>
      )}

      <Liste
        veri={kategoriler}
        hata={hata}
        anahtar={(k) => k.id}
        bosIkon="pricetags-outline"
        bosBaslik="Henüz kategori yok"
        bosAciklama="Öğretmenlerin gelişim kaydı girebilmesi için en az bir kategori gerekir."
        satir={(k) => (
          <ListeSatiri
            baslik={k.ad}
            altBaslik={k.aktif ? null : 'Pasif · yeni kayıtlarda görünmez'}
            sag={
              kokKurumMu ? (
                <>
                  <IkonButon
                    ikon="create-outline"
                    etiket="Yeniden adlandır"
                    onPress={() => {
                      setDuzenlenen(k);
                      setAd(k.ad);
                    }}
                  />
                  <IkonButon
                    ikon={k.aktif ? 'eye-outline' : 'eye-off-outline'}
                    etiket={k.aktif ? 'Pasif yap' : 'Aktif yap'}
                    renk={k.aktif ? tema.renkler.ana : tema.renkler.metinIkincil}
                    onPress={() => calistir(() => kategoriGuncelle(k.id, { aktif: !k.aktif }))}
                  />
                  <OnayButonu
                    ikon="trash-outline"
                    onOnay={async () => {
                      await calistir(() => kategoriSil(k.id));
                    }}
                  />
                </>
              ) : undefined
            }
          />
        )}
      />
    </Ekran>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    formButonlari: {
      flexDirection: 'row',
      gap: t.bosluk.m,
    },
    formButonu: {
      flex: 1,
    },
  });
}
