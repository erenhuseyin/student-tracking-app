// Bir sınıfın haftalık ders programı, günlere göre gruplu. `duzenlenebilir` verilirse başlıkta
// "+" ve her derste düzenleme kalemi gösterilir; silme düzenleme ekranındadır (kurum admini ve sınıfın öğretmeni; RLS zorlar).
// Kendi kaydırmasını yapar: kaydırmasız bir `Ekran` içinde kullanılır.
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BaslikEkleButonu } from '@/components/BaslikEkleButonu';
import { BosDurum } from '@/components/BosDurum';
import { HataMesaji } from '@/components/HataMesaji';
import { IkonButon } from '@/components/IkonButon';
import { Kart } from '@/components/Kart';
import { Yukleniyor } from '@/components/Yukleniyor';
import { dersProgrami, saatiKisalt } from '@/lib/dersProgrami';
import { GUN_ADLARI } from '@/lib/tarih';
import { type Tema, useTema } from '@/lib/tema';
import type { DersSaati } from '@/lib/tipler';

export function SinifProgrami({ sinifId, duzenlenebilir = false }: { sinifId: string; duzenlenebilir?: boolean }) {
  const router = useRouter();
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const [dersler, setDersler] = useState<DersSaati[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const yenile = useCallback(async () => {
    setHata(null);
    try {
      setDersler(await dersProgrami(sinifId));
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
    }
  }, [sinifId]);

  useFocusEffect(
    useCallback(() => {
      yenile();
    }, [yenile]),
  );

  const gunler = [1, 2, 3, 4, 5, 6, 7]
    .map((gun) => ({ gun, dersler: (dersler ?? []).filter((d) => d.gun === gun) }))
    .filter((g) => g.dersler.length > 0);

  return (
    <ScrollView style={styles.kaydirma} contentContainerStyle={styles.icerik}>
      {duzenlenebilir ? (
        <BaslikEkleButonu etiket="Ders ekle" onPress={() => router.push({ pathname: '/ders-saati', params: { sinifId } })} />
      ) : null}
      <HataMesaji mesaj={hata} />
      {!dersler && !hata ? <Yukleniyor /> : null}
      {dersler && gunler.length === 0 ? (
        <BosDurum
          ikon="calendar-outline"
          baslik="Ders programı henüz girilmedi"
          aciklama={duzenlenebilir ? 'Sağ üstteki + ile ilk dersi ekleyin.' : undefined}
        />
      ) : null}

      {gunler.map((g) => (
        <Kart key={g.gun}>
          <Text style={tema.yazi.bolum}>{GUN_ADLARI[g.gun - 1]}</Text>
          {g.dersler.map((d) => (
            <View key={d.id} style={styles.ders}>
              <Text style={styles.saat}>
                {saatiKisalt(d.baslangic_saati)}–{saatiKisalt(d.bitis_saati)}
              </Text>
              <Text style={styles.ad}>{d.ders_adi}</Text>
              {duzenlenebilir ? (
                <IkonButon
                  ikon="create-outline"
                  etiket="Düzenle"
                  onPress={() => router.push({ pathname: '/ders-saati', params: { sinifId, id: d.id } })}
                />
              ) : null}
            </View>
          ))}
        </Kart>
      ))}

      {duzenlenebilir && gunler.length > 0 ? (
        <Text style={tema.yazi.kucuk}>
          Program değişince sınıfın ders günleri (haftalık yoklama tablosu) bu haftadan itibaren programdaki günlere göre
          güncellenir.
        </Text>
      ) : null}
    </ScrollView>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    kaydirma: {
      flex: 1,
    },
    icerik: {
      gap: t.bosluk.m,
      paddingBottom: t.bosluk.l,
    },
    ders: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: t.bosluk.m,
      minHeight: t.dokunmaAlani.normal,
    },
    saat: {
      ...t.yazi.govde,
      fontFamily: t.yaziTipi.yariKalin,
      fontVariant: ['tabular-nums'],
      minWidth: 96,
    },
    ad: {
      ...t.yazi.govde,
      flex: 1,
    },
  });
}
