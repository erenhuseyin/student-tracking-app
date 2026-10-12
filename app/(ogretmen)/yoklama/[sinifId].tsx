// Erişim: yalnızca ogretmen. `tarih` parametresi verilmezse bugünün yoklaması alınır; haftalık
// tablodan geçmiş bir gün açılabilir (düzeltme). Gelecek tarih kabul edilmez.
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { Ikon } from '@/components/Ikon';
import { Kart } from '@/components/Kart';
import { Liste } from '@/components/Liste';
import { gununDevamsizlikNedenleri } from '@/lib/devamsizlik';
import { useOturum } from '@/lib/oturum';
import { bugununTarihi, tarihGecerliMi, tarihiBicimle } from '@/lib/tarih';
import { type Tema, useTema } from '@/lib/tema';
import { YOKLAMA_DURUMLARI, type YoklamaDurumu } from '@/lib/tipler';
import {
  gununYoklamasiniGetir,
  hepsiniGeldiIsaretle,
  type OgrenciYoklamaSatiri,
  YOKLAMA_ETIKETLERI,
  yoklamaKaydet,
} from '@/lib/yoklama';

function ozetMetni(ogrenciler: OgrenciYoklamaSatiri[]): string {
  const parcalar = YOKLAMA_DURUMLARI.map((durum) => {
    const adet = ogrenciler.filter((o) => o.yoklama_durumu === durum).length;
    return `${adet} ${YOKLAMA_ETIKETLERI[durum].toLocaleLowerCase('tr-TR')}`;
  });
  const isaretlenmemis = ogrenciler.filter((o) => o.yoklama_durumu === null).length;
  if (isaretlenmemis > 0) parcalar.push(`${isaretlenmemis} işaretlenmedi`);
  return parcalar.join(' · ');
}

export default function OgretmenYoklama() {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const { sinifId, tarih: tarihParametresi } = useLocalSearchParams<{ sinifId: string; tarih?: string }>();
  const bugun = bugununTarihi();
  const tarih =
    tarihParametresi && tarihGecerliMi(tarihParametresi) && tarihParametresi <= bugun ? tarihParametresi : bugun;
  const gecmisGun = tarih < bugun;
  const { kullanici } = useOturum();
  const [ogrenciler, setOgrenciler] = useState<OgrenciYoklamaSatiri[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [kaydedenId, setKaydedenId] = useState<string | null>(null);
  const [topluKaydediyor, setTopluKaydediyor] = useState(false);
  // Velilerin bu gün için bildirdiği devamsızlıklar (öğrenci id -> neden).
  const [nedenler, setNedenler] = useState<Map<string, string>>(new Map());

  const yenile = useCallback(async () => {
    setHata(null);
    try {
      const liste = await gununYoklamasiniGetir(sinifId, tarih);
      setOgrenciler(liste);
      setNedenler(await gununDevamsizlikNedenleri(tarih, liste.map((o) => o.id)));
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
    }
  }, [sinifId, tarih]);

  useFocusEffect(
    useCallback(() => {
      yenile();
    }, [yenile]),
  );

  const isaretle = async (ogrenciId: string, durum: YoklamaDurumu) => {
    if (!kullanici?.kurum_id) {
      setHata('Kurum bilgisi bulunamadı.');
      return;
    }
    setKaydedenId(ogrenciId);
    setHata(null);
    try {
      await yoklamaKaydet(kullanici.kurum_id, ogrenciId, kullanici.id, durum, tarih);
      setOgrenciler((mevcut) =>
        (mevcut ?? []).map((o) => (o.id === ogrenciId ? { ...o, yoklama_durumu: durum } : o)),
      );
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
    } finally {
      setKaydedenId(null);
    }
  };

  // "Hepsi geldi" yalnızca işaretlenmemişleri doldurur; velisi devamsızlık bildiren öğrenci dışarıda
  // kalır (öğretmen ona bakarak kendisi işaretler, veliye yanlış "geldi" bildirimi gitmesin).
  const isaretlenmemisler = (ogrenciler ?? []).filter((o) => o.yoklama_durumu === null);
  const topluHedef = isaretlenmemisler.filter((o) => !nedenler.has(o.id));
  const disaridaKalan = isaretlenmemisler.length - topluHedef.length;

  const hepsiGeldi = async () => {
    if (!kullanici?.kurum_id) {
      setHata('Kurum bilgisi bulunamadı.');
      return;
    }
    setTopluKaydediyor(true);
    setHata(null);
    try {
      await hepsiniGeldiIsaretle(kullanici.kurum_id, topluHedef.map((o) => o.id), kullanici.id, tarih);
      // Araya giren başka bir işaretleme varsa o da görünsün diye liste yeniden okunur.
      await yenile();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
    } finally {
      setTopluKaydediyor(false);
    }
  };

  return (
    <Ekran>
      <Stack.Screen options={{ title: 'Yoklama' }} />

      <Liste
        veri={ogrenciler}
        hata={hata}
        anahtar={(o) => o.id}
        bosIkon="people-outline"
        bosBaslik="Bu sınıfta öğrenci yok"
        ust={
          <View style={styles.ust}>
            <Text style={styles.ustBaslik}>{tarihiBicimle(tarih)}</Text>
            <Text style={styles.kucuk}>{ozetMetni(ogrenciler ?? [])}</Text>
            {gecmisGun ? <Text style={styles.kucuk}>Geçmiş gün düzeltmesi veliye bildirilmez.</Text> : null}
            {topluHedef.length > 0 ? (
              <View style={styles.toplu}>
                <Buton
                  baslik={
                    topluHedef.length === (ogrenciler ?? []).length
                      ? 'Hepsi geldi'
                      : `Kalan ${topluHedef.length} öğrenci geldi`
                  }
                  ikon="checkmark-done-outline"
                  tur="ikincil"
                  yukleniyor={topluKaydediyor}
                  pasif={kaydedenId !== null}
                  onPress={hepsiGeldi}
                />
                {disaridaKalan > 0 ? (
                  <Text style={styles.kucuk}>
                    Velisi devamsızlık bildiren {disaridaKalan} öğrenci bunun dışında kalır.
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        }
        satir={(o) => (
          <Kart>
            <View style={styles.adSatiri}>
              <Text style={[styles.govde, styles.ad]}>{o.ad_soyad}</Text>
              {kaydedenId === o.id ? <ActivityIndicator size="small" color={tema.renkler.ana} /> : null}
            </View>
            {nedenler.has(o.id) ? (
              <View style={styles.veliNotu}>
                <Ikon ad="information-circle-outline" boyut={18} renk={tema.renkler.uyari} />
                <Text style={[styles.kucuk, styles.veliNotuMetni]}>Veli bildirdi: {nedenler.get(o.id)}</Text>
              </View>
            ) : null}
            <View style={styles.secici}>
              {YOKLAMA_DURUMLARI.map((durum) => {
                const secili = o.yoklama_durumu === durum;
                return (
                  <Pressable
                    key={durum}
                    accessibilityRole="button"
                    accessibilityState={{ selected: secili }}
                    accessibilityLabel={`${o.ad_soyad}: ${YOKLAMA_ETIKETLERI[durum]}`}
                    disabled={kaydedenId === o.id || topluKaydediyor}
                    onPress={() => isaretle(o.id, durum)}
                    style={[
                      styles.secenek,
                      secili && {
                        backgroundColor: tema.yoklamaRenkleri[durum].renk,
                        borderColor: tema.yoklamaRenkleri[durum].renk,
                      },
                    ]}
                  >
                    <Text style={[styles.secenekMetni, secili && styles.secenekMetniSecili]}>
                      {YOKLAMA_ETIKETLERI[durum]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Kart>
        )}
      />
    </Ekran>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    veliNotu: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.xs,
    },
    veliNotuMetni: {
      flex: 1,
    },
    ust: {
      gap: t.bosluk.xs,
      marginBottom: t.bosluk.m,
    },
    toplu: {
      gap: t.bosluk.xs,
      marginTop: t.bosluk.s,
    },
    ustBaslik: {
      ...t.yazi.bolum,
    },
    kucuk: {
      ...t.yazi.kucuk,
    },
    adSatiri: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.s,
    },
    govde: {
      ...t.yazi.govde,
    },
    ad: {
      flex: 1,
      fontFamily: t.yaziTipi.yariKalin,
    },
    // Dört durum (Geldi / Gelmedi / Geç / Mazeretli) telefon genişliğine sığsın diye aralık dar,
    // yazı bir boy küçüktür.
    secici: {
      flexDirection: 'row',
      gap: t.bosluk.xs,
    },
    secenek: {
      flex: 1,
      minHeight: t.dokunmaAlani.normal,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: t.renkler.kenarlik,
      borderRadius: t.yaricap.m,
      backgroundColor: t.renkler.yuzey,
    },
    secenekMetni: {
      ...t.yazi.kucuk,
      fontFamily: t.yaziTipi.yariKalin,
      color: t.renkler.metinIkincil,
    },
    secenekMetniSecili: {
      color: t.renkler.anaUzeriMetin,
    },
  });
}
