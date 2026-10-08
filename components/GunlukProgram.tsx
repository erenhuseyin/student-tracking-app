// Seçilen günün tüm dersleri, saat sırasıyla ve sınıf adıyla: kurum admini için kurumun (ve
// şubelerinin), öğretmen için atandığı sınıfların birleşik programı. Hangi satırların geldiğini
// RLS belirler. Kendi kaydırmasını yapar: kaydırmasız bir `Ekran` içinde kullanılır.
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BosDurum } from '@/components/BosDurum';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { Secenekler } from '@/components/Secenekler';
import { Yukleniyor } from '@/components/Yukleniyor';
import { dersProgrami, saatiKisalt } from '@/lib/dersProgrami';
import { siniflariGetir } from '@/lib/siniflar';
import { bugununTarihi, GUN_ADLARI, GUN_KISA_ADLARI, isoGun } from '@/lib/tarih';
import { type Tema, useTema } from '@/lib/tema';
import type { DersSaati } from '@/lib/tipler';

const GUN_SECENEKLERI = GUN_KISA_ADLARI.map((etiket, i) => ({ deger: String(i + 1), etiket }));

export function GunlukProgram() {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const [gun, setGun] = useState(() => String(isoGun(bugununTarihi())));
  const [dersler, setDersler] = useState<DersSaati[] | null>(null);
  const [sinifAdlari, setSinifAdlari] = useState<Map<string, string>>(new Map());
  const [hata, setHata] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let iptalEdildi = false;
      setHata(null);
      Promise.all([dersProgrami(), siniflariGetir()])
        .then(([d, siniflar]) => {
          if (iptalEdildi) return;
          setDersler(d);
          setSinifAdlari(new Map(siniflar.map((s) => [s.id, s.ad])));
        })
        .catch((e: Error) => {
          if (!iptalEdildi) setHata(e.message);
        });
      return () => {
        iptalEdildi = true;
      };
    }, []),
  );

  const gununDersleri = (dersler ?? [])
    .filter((d) => String(d.gun) === gun)
    .sort((a, b) => a.baslangic_saati.localeCompare(b.baslangic_saati));

  return (
    <View style={styles.kapsayici}>
      <Secenekler secenekler={GUN_SECENEKLERI} secili={gun} onSec={setGun} />
      <HataMesaji mesaj={hata} />
      {!dersler && !hata ? <Yukleniyor /> : null}
      {dersler ? (
        <ScrollView style={styles.kaydirma} contentContainerStyle={styles.icerik}>
          {gununDersleri.length === 0 ? (
            <BosDurum
              ikon="calendar-outline"
              baslik={`${GUN_ADLARI[Number(gun) - 1]} günü ders yok`}
              aciklama={dersler.length === 0 ? 'Ders programı sınıf ekranından girilir.' : undefined}
            />
          ) : (
            <Kart>
              {gununDersleri.map((d) => (
                <View key={d.id} style={styles.ders}>
                  <Text style={styles.saat}>
                    {saatiKisalt(d.baslangic_saati)}–{saatiKisalt(d.bitis_saati)}
                  </Text>
                  <View style={styles.metinler}>
                    <Text style={tema.yazi.govde}>{d.ders_adi}</Text>
                    <Text style={tema.yazi.kucuk}>{sinifAdlari.get(d.sinif_id) ?? 'Sınıf'}</Text>
                  </View>
                </View>
              ))}
            </Kart>
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    kapsayici: {
      flex: 1,
      gap: t.bosluk.m,
    },
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
      gap: t.bosluk.m,
      minHeight: t.dokunmaAlani.normal,
    },
    saat: {
      ...t.yazi.govde,
      fontFamily: t.yaziTipi.yariKalin,
      fontVariant: ['tabular-nums'],
      minWidth: 96,
    },
    metinler: {
      flex: 1,
    },
  });
}
