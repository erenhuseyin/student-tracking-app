// Erişim: yalnızca ogretmen. `tarih` parametresi verilmezse bugünün yoklaması alınır; haftalık
// tablodan geçmiş bir gün açılabilir (düzeltme). Gelecek tarih kabul edilmez.
//
// Düzen: üstte sabit kalan özet (sayılar, bildirim durumu, Tümü/Kalanlar, "Hepsi geldi"), altında
// kayan liste; öğrenci başına tek satır. Dokunuş beklemeden işaretlenir, kayıt arkada sürer; kayıt
// düşerse liste sunucudan yeniden okunur.
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { BosDurum } from '@/components/BosDurum';
import { HataMesaji } from '@/components/HataMesaji';
import { Ikon, type IkonAdi } from '@/components/Ikon';
import { Kart } from '@/components/Kart';
import { Secenekler } from '@/components/Secenekler';
import { SkeletonSatir } from '@/components/Skeleton';
import { gununDevamsizlikNedenleri } from '@/lib/devamsizlik';
import { useOturum } from '@/lib/oturum';
import { bugununTarihi, tarihGecerliMi, tarihiBicimle } from '@/lib/tarih';
import { type Tema, useTema } from '@/lib/tema';
import { YOKLAMA_DURUMLARI, type YoklamaDurumu } from '@/lib/tipler';
import {
  gununYoklamasiniGetir,
  hepsiniGeldiIsaretle,
  yoklamaBildir,
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

// Telefonda düğmeler yalnızca simgedir (dört düğme adın yanına sığsın diye); anlamları özetin
// altındaki açıklama satırında yazar. Geniş ekranda simge + ad.
const DURUM_IKONLARI: Record<YoklamaDurumu, IkonAdi> = {
  geldi: 'checkmark',
  gelmedi: 'close',
  gec: 'time-outline',
  mazeretli: 'document-text-outline',
};

type Suzgec = 'tumu' | 'kalan';
const SUZGECLER: { deger: Suzgec; etiket: string }[] = [
  { deger: 'tumu', etiket: 'Tümü' },
  { deger: 'kalan', etiket: 'Kalanlar' },
];

export default function OgretmenYoklama() {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const dar = tema.duzen === 'mobil';
  const { sinifId, tarih: tarihParametresi } = useLocalSearchParams<{ sinifId: string; tarih?: string }>();
  const bugun = bugununTarihi();
  const tarih =
    tarihParametresi && tarihGecerliMi(tarihParametresi) && tarihParametresi <= bugun ? tarihParametresi : bugun;
  const gecmisGun = tarih < bugun;
  const { kullanici } = useOturum();
  const [ogrenciler, setOgrenciler] = useState<OgrenciYoklamaSatiri[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [topluKaydediyor, setTopluKaydediyor] = useState(false);
  const [suzgec, setSuzgec] = useState<Suzgec>('tumu');
  // Velilerin bu gün için bildirdiği devamsızlıklar (öğrenci id -> neden).
  const [nedenler, setNedenler] = useState<Map<string, string>>(new Map());
  // Ekrandaki en güncel durumlar (kayıt bitince "yoklama tamamlandı mı" buradan sorulur) ve öğrenci
  // başına kayıt kuyruğu: aynı öğrenciye art arda dokunuşlar sunucuya sırayla gider.
  const guncel = useRef<OgrenciYoklamaSatiri[]>([]);
  const kuyruk = useRef(new Map<string, Promise<void>>());

  const listeyiAyarla = (liste: OgrenciYoklamaSatiri[]) => {
    guncel.current = liste;
    setOgrenciler(liste);
  };

  const yenile = useCallback(async () => {
    setHata(null);
    try {
      const liste = await gununYoklamasiniGetir(sinifId, tarih);
      guncel.current = liste;
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

  const isaretle = (ogrenciId: string, durum: YoklamaDurumu) => {
    const kurumId = kullanici?.kurum_id;
    if (!kullanici || !kurumId) {
      setHata('Kurum bilgisi bulunamadı.');
      return;
    }
    setHata(null);
    listeyiAyarla(guncel.current.map((o) => (o.id === ogrenciId ? { ...o, yoklama_durumu: durum } : o)));

    const onceki = kuyruk.current.get(ogrenciId) ?? Promise.resolve();
    const kayit = onceki.then(async () => {
      try {
        await yoklamaKaydet(kurumId, ogrenciId, kullanici.id, durum, tarih);
        // Veliler yoklama tamamlanınca bildirilir; tamamlandıktan sonraki düzeltmede yalnızca
        // düzeltilen öğrencinin velisi (kimin bildirileceğine sunucu karar verir).
        if (guncel.current.every((o) => o.yoklama_durumu !== null)) yoklamaBildir(sinifId, tarih);
      } catch (e) {
        // Ekrandaki işaret kaydedilemedi: gerçek durum sunucudan okunur, hata onun üstüne yazılır.
        await yenile();
        setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
      }
    });
    kuyruk.current.set(ogrenciId, kayit);
  };

  // "Hepsi geldi" yalnızca işaretlenmemişleri doldurur; velisi devamsızlık bildiren öğrenci dışarıda
  // kalır (öğretmen ona bakarak kendisi işaretler, veliye yanlış "geldi" bildirimi gitmesin).
  const tumu = ogrenciler ?? [];
  const isaretlenmemisler = tumu.filter((o) => o.yoklama_durumu === null);
  const topluHedef = isaretlenmemisler.filter((o) => !nedenler.has(o.id));
  const disaridaKalan = isaretlenmemisler.length - topluHedef.length;
  const gorunenler = suzgec === 'kalan' ? isaretlenmemisler : tumu;

  const hepsiGeldi = async () => {
    if (!kullanici?.kurum_id) {
      setHata('Kurum bilgisi bulunamadı.');
      return;
    }
    setTopluKaydediyor(true);
    setHata(null);
    try {
      // Süren tek tek kayıtlar bitsin: liste yeniden okunurken yarım kalmış bir işaret kaybolmasın.
      await Promise.all(kuyruk.current.values());
      await hepsiniGeldiIsaretle(kullanici.kurum_id, topluHedef.map((o) => o.id), kullanici.id, tarih);
      // Araya giren başka bir işaretleme varsa o da görünsün diye liste yeniden okunur.
      await yenile();
      // Yoklama bununla tamamlandıysa veliler bildirilir (tamamlanmadıysa sunucu göndermez).
      yoklamaBildir(sinifId, tarih);
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
    } finally {
      setTopluKaydediyor(false);
    }
  };

  const bildirimDurumu = gecmisGun
    ? 'Geçmiş gün düzeltmesi veliye bildirilmez.'
    : isaretlenmemisler.length > 0
      ? 'Veliler, tüm öğrenciler işaretlenince bildirilir.'
      : 'Yoklama tamamlandı; veliler bildirildi. Düzeltirseniz yalnızca o öğrencinin velisi bildirilir.';

  return (
    <Ekran>
      <Stack.Screen options={{ title: 'Yoklama' }} />
      <HataMesaji mesaj={hata} />

      {ogrenciler === null ? (
        hata ? null : (
          <View style={styles.iskelet}>
            {Array.from({ length: 4 }, (_, i) => (
              <SkeletonSatir key={i} />
            ))}
          </View>
        )
      ) : tumu.length === 0 ? (
        <BosDurum ikon="people-outline" baslik="Bu sınıfta öğrenci yok" />
      ) : (
        <>
          {/* Sabit özet: liste kayarken yerinde kalır. */}
          <View style={styles.ust}>
            <View style={dar ? styles.ustSutun : styles.ustSatir}>
              <View style={dar ? null : styles.esnek}>
                <Text style={styles.ustBaslik}>{tarihiBicimle(tarih)}</Text>
                <Text style={styles.kucuk}>{ozetMetni(tumu)}</Text>
              </View>
              <View style={dar ? null : styles.suzgec}>
                <Secenekler secenekler={SUZGECLER} secili={suzgec} onSec={setSuzgec} />
              </View>
            </View>
            <Text style={styles.kucuk}>{bildirimDurumu}</Text>
            {topluHedef.length > 0 ? (
              <Buton
                baslik={topluHedef.length === tumu.length ? 'Hepsi geldi' : `Kalan ${topluHedef.length} öğrenci geldi`}
                ikon="checkmark-done-outline"
                tur="ikincil"
                yukleniyor={topluKaydediyor}
                onPress={hepsiGeldi}
              />
            ) : null}
            {disaridaKalan > 0 && topluHedef.length > 0 ? (
              <Text style={styles.kucuk}>Velisi devamsızlık bildiren {disaridaKalan} öğrenci bunun dışında kalır.</Text>
            ) : null}
            {dar ? (
              <View style={styles.aciklama}>
                {YOKLAMA_DURUMLARI.map((durum) => (
                  <View key={durum} style={styles.aciklamaOgesi}>
                    <Ikon ad={DURUM_IKONLARI[durum]} boyut={14} renk={tema.yoklamaRenkleri[durum].renk} />
                    <Text style={styles.kucuk}>{YOKLAMA_ETIKETLERI[durum]}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <ScrollView style={styles.esnek} contentContainerStyle={styles.icerik}>
            {gorunenler.length === 0 ? (
              <Text style={styles.kucuk}>İşaretlenmemiş öğrenci kalmadı.</Text>
            ) : (
              <Kart stil={styles.listeKarti}>
                {gorunenler.map((o, i) => (
                  <View key={o.id} style={[styles.satir, i > 0 && styles.ayiricili]}>
                    <View style={styles.esnek}>
                      <Text style={styles.ad} numberOfLines={2}>
                        {o.ad_soyad}
                      </Text>
                      {nedenler.has(o.id) ? (
                        <Text style={[styles.kucuk, styles.veliNotu]} numberOfLines={2}>
                          Veli bildirdi: {nedenler.get(o.id)}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.secici}>
                      {YOKLAMA_DURUMLARI.map((durum) => {
                        const secili = o.yoklama_durumu === durum;
                        const onPlan = secili ? tema.renkler.anaUzeriMetin : tema.renkler.metinIkincil;
                        return (
                          <Pressable
                            key={durum}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: secili, disabled: topluKaydediyor }}
                            accessibilityLabel={`${o.ad_soyad}: ${YOKLAMA_ETIKETLERI[durum]}`}
                            disabled={topluKaydediyor}
                            onPress={() => isaretle(o.id, durum)}
                            style={({ pressed }) => [
                              styles.secenek,
                              !dar && styles.secenekGenis,
                              secili && {
                                backgroundColor: tema.yoklamaRenkleri[durum].renk,
                                borderColor: tema.yoklamaRenkleri[durum].renk,
                              },
                              pressed && styles.basili,
                            ]}
                          >
                            <Ikon ad={DURUM_IKONLARI[durum]} boyut={18} renk={onPlan} />
                            {dar ? null : (
                              <Text style={[styles.secenekMetni, { color: onPlan }]}>{YOKLAMA_ETIKETLERI[durum]}</Text>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </Kart>
            )}
          </ScrollView>
        </>
      )}
    </Ekran>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    esnek: {
      flex: 1,
    },
    iskelet: {
      gap: t.bosluk.m,
    },
    ust: {
      gap: t.bosluk.s,
    },
    ustSatir: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.m,
    },
    ustSutun: {
      gap: t.bosluk.s,
    },
    ustBaslik: {
      ...t.yazi.bolum,
    },
    suzgec: {
      width: 176,
    },
    kucuk: {
      ...t.yazi.kucuk,
    },
    aciklama: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      columnGap: t.bosluk.m,
      rowGap: t.bosluk.xs,
    },
    aciklamaOgesi: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.xs,
    },
    icerik: {
      paddingBottom: t.bosluk.l,
    },
    listeKarti: {
      gap: 0,
      paddingVertical: t.bosluk.xs,
    },
    satir: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.s,
      paddingVertical: t.bosluk.s,
    },
    ayiricili: {
      borderTopWidth: 1,
      borderTopColor: t.renkler.ayirici,
    },
    ad: {
      ...t.yazi.govde,
      fontFamily: t.yaziTipi.yariKalin,
    },
    veliNotu: {
      color: t.renkler.uyari,
    },
    secici: {
      flexDirection: 'row',
      gap: t.bosluk.xs,
    },
    secenek: {
      flexDirection: 'row',
      // Dört düğme telefonda adın yanına sığsın diye olağan dokunma alanından (48) biraz dar.
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      gap: t.bosluk.xs,
      borderWidth: 1,
      borderColor: t.renkler.kenarlik,
      borderRadius: t.yaricap.m,
      backgroundColor: t.renkler.yuzey,
    },
    secenekGenis: {
      width: 'auto',
      paddingHorizontal: t.bosluk.m,
    },
    secenekMetni: {
      ...t.yazi.kucuk,
      fontFamily: t.yaziTipi.yariKalin,
    },
    basili: {
      opacity: 0.6,
    },
  });
}
