// Sınıfın ders/konu takibi (sınıfın öğretmeni ve kurum admini): sınıfın izlediği kademenin
// dersleri seçilir, konular "işlendi" olarak işaretlenir; ilerleme kendiliğinden hesaplanır.
// Konuya dokununca ayrıntısı açılır: işlenme tarihi, sınıfın konu notu ve yöneticinin yanıtı
// (bkz. KonuAyrintisi). Yönetici okunmamış bir notu açınca not "görüldü" olur. "Ezber" çipi
// sınıfın ezber listesinde madde başına kaç öğrencinin tamamladığını gösterir.
// Adres parametresi `konu`: Konu Notları / bildirimden gelince o konu seçili ve açık gelir.
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BosDurum } from '@/components/BosDurum';
import { Chip } from '@/components/Chip';
import { DersEzberKarti } from '@/components/DersEzberKarti';
import { Ekran } from '@/components/Ekran';
import { HataMesaji } from '@/components/HataMesaji';
import { IkonButon } from '@/components/IkonButon';
import { IlerlemeCubugu } from '@/components/IlerlemeCubugu';
import { Kart } from '@/components/Kart';
import { KonuAyrintisi } from '@/components/KonuAyrintisi';
import { OnayKutusu } from '@/components/OnayKutusu';
import { Yukleniyor } from '@/components/Yukleniyor';
import {
  type KademeIcerigi,
  kademeIceriginiGetir,
  konuDurumunuAyarla,
  type KonuNotuAyrintisi,
  notuGorulduYap,
  sinifIlerlemesiniGetir,
  sinifKonuNotlariniGetir,
} from '@/lib/icerik';
import { useOturum } from '@/lib/oturum';
import { sinifGetir } from '@/lib/siniflar';
import { tarihiBicimle } from '@/lib/tarih';
import { type Tema, useTema } from '@/lib/tema';
import type { Sinif } from '@/lib/tipler';

const EZBER = 'ezber';

export function DersTakibiEkrani({ sinifId }: { sinifId: string }) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const { kullanici } = useOturum();
  const { konu: istenenKonu } = useLocalSearchParams<{ konu?: string }>();
  const yonetici = kullanici?.rol === 'kurum_admin' || kullanici?.rol === 'super_admin';
  const [sinif, setSinif] = useState<Sinif | null>(null);
  const [icerik, setIcerik] = useState<KademeIcerigi | null>(null);
  const [ilerleme, setIlerleme] = useState<Map<string, string>>(new Map());
  const [notlar, setNotlar] = useState<Map<string, KonuNotuAyrintisi>>(new Map());
  const [seciliDersId, setSeciliDersId] = useState<string | null>(null);
  const [acikKonuId, setAcikKonuId] = useState<string | null>(istenenKonu ?? null);
  const [degisen, setDegisen] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [hazir, setHazir] = useState(false);

  const takibiYenile = useCallback(async () => {
    const [il, n] = await Promise.all([sinifIlerlemesiniGetir(sinifId), sinifKonuNotlariniGetir(sinifId)]);
    setIlerleme(il);
    setNotlar(n);
  }, [sinifId]);

  useFocusEffect(
    useCallback(() => {
      let iptalEdildi = false;
      setHata(null);
      (async () => {
        const s = await sinifGetir(sinifId);
        const [i, il, n] = await Promise.all([
          s.kademe_id ? kademeIceriginiGetir(s.kademe_id) : null,
          sinifIlerlemesiniGetir(sinifId),
          sinifKonuNotlariniGetir(sinifId),
        ]);
        if (iptalEdildi) return;
        setSinif(s);
        setIcerik(i);
        setIlerleme(il);
        setNotlar(n);
        setHazir(true);
      })().catch((e: Error) => {
        if (!iptalEdildi) setHata(e.message);
      });
      return () => {
        iptalEdildi = true;
      };
    }, [sinifId]),
  );

  const dersler = icerik?.dersler ?? [];
  // İstenen konu varsa onun dersi seçili gelir (kullanıcı başka çipe geçene kadar).
  const istenenDersId = istenenKonu ? dersler.find((d) => d.konular.some((k) => k.id === istenenKonu))?.id : undefined;
  const seciliId = seciliDersId ?? istenenDersId ?? dersler[0]?.id ?? null;
  const seciliDers = seciliId === EZBER ? null : (dersler.find((d) => d.id === seciliId) ?? null);
  const tumKonular = dersler.flatMap((d) => d.konular);
  const tamamSayisi = (konular: { id: string }[]) => konular.filter((k) => ilerleme.has(k.id)).length;

  // Yönetici okunmamış notu açınca not görüldü olur (hata sessiz: yalnızca işaret).
  const acikNot = acikKonuId ? notlar.get(acikKonuId) : undefined;
  useEffect(() => {
    if (!yonetici || !acikKonuId || !acikNot || acikNot.goruldu_zamani) return;
    notuGorulduYap(sinifId, acikKonuId)
      .then(takibiYenile)
      .catch(() => {});
  }, [yonetici, acikKonuId, acikNot, sinifId, takibiYenile]);

  const isaretle = async (konuId: string, tamamlandi: boolean) => {
    if (!sinif || !kullanici) return;
    setDegisen(konuId);
    setHata(null);
    try {
      await konuDurumunuAyarla(sinif.kurum_id, sinif.id, konuId, kullanici.id, tamamlandi);
      setIlerleme(await sinifIlerlemesiniGetir(sinif.id));
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
    } finally {
      setDegisen(null);
    }
  };

  const notIsareti = (n: KonuNotuAyrintisi | undefined) => {
    if (!n) return null;
    const parcalar = ['Not var'];
    if (n.yanit_metni) parcalar.push('yanıtlandı');
    else if (yonetici && !n.goruldu_zamani) parcalar.push('okunmadı');
    return parcalar.join(' · ');
  };

  return (
    <Ekran>
      <Stack.Screen options={{ title: sinif ? `${sinif.ad} · Ders Takibi` : 'Ders Takibi' }} />
      <HataMesaji mesaj={hata} />
      {!hazir && !hata ? <Yukleniyor /> : null}

      {hazir && dersler.length === 0 ? (
        <BosDurum
          ikon="book-outline"
          baslik={sinif?.kademe_id ? 'Bu kademede henüz ders yok' : 'Bu sınıfa kademe atanmamış'}
          aciklama={
            sinif?.kademe_id
              ? 'Dersleri ve konuları kurum yöneticisi Menü > Kademeler ekranından tanımlar.'
              : 'Kademeyi kurum yöneticisi sınıfı düzenlerken seçer.'
          }
        />
      ) : null}

      {hazir && sinif && dersler.length > 0 ? (
        <ScrollView style={styles.kaydirma} contentContainerStyle={styles.icerik}>
          <Kart>
            <IlerlemeCubugu tamam={tamamSayisi(tumKonular)} toplam={tumKonular.length} etiket="Tüm dersler" />
          </Kart>
          <View style={styles.cipler}>
            {dersler.map((d) => (
              <Chip
                key={d.id}
                etiket={`${d.ad} ${tamamSayisi(d.konular)}/${d.konular.length}`}
                secili={d.id === seciliId}
                onPress={() => setSeciliDersId(d.id)}
              />
            ))}
            <Chip etiket="Ezber" secili={seciliId === EZBER} onPress={() => setSeciliDersId(EZBER)} />
          </View>

          {seciliId === EZBER ? <DersEzberKarti sinif={sinif} /> : null}

          {seciliDers ? (
            <Kart>
              <Text style={tema.yazi.bolum}>{seciliDers.ad}</Text>
              {seciliDers.konular.length === 0 ? <Text style={tema.yazi.kucuk}>Bu derse henüz konu eklenmemiş.</Text> : null}
              {seciliDers.konular.map((k, i) => {
                const acik = acikKonuId === k.id;
                const not = notlar.get(k.id);
                const tarih = ilerleme.get(k.id);
                const isaret = notIsareti(not);
                return (
                  <View key={k.id}>
                    <View style={styles.satir}>
                      <View style={styles.kutu}>
                        <OnayKutusu
                          etiket={`${i + 1}. ${k.ad}`}
                          secili={ilerleme.has(k.id)}
                          calisiyor={degisen === k.id}
                          pasif={degisen !== null}
                          onDegis={(secili) => isaretle(k.id, secili)}
                        />
                      </View>
                      <IkonButon
                        ikon={acik ? 'chevron-up' : not ? 'chatbubble-ellipses' : 'chatbubble-outline'}
                        etiket={acik ? `${k.ad} ayrıntısını kapat` : `${k.ad} ayrıntısı (tarih ve not)`}
                        renk={not && (not.yanit_metni || (yonetici && !not.goruldu_zamani)) ? tema.renkler.vurguKoyu : undefined}
                        onPress={() => setAcikKonuId(acik ? null : k.id)}
                      />
                    </View>
                    {tarih || isaret ? (
                      <Text style={[tema.yazi.kucuk, styles.alt]}>
                        {[tarih ? `İşlendi: ${tarihiBicimle(tarih)}` : null, isaret].filter(Boolean).join(' · ')}
                      </Text>
                    ) : null}
                    {acik ? (
                      <KonuAyrintisi
                        key={[tarih, not?.yazilma_zamani, not?.yanit_zamani, not?.goruldu_zamani].join('|')}
                        kurumId={sinif.kurum_id}
                        sinifId={sinif.id}
                        konuId={k.id}
                        islenmeTarihi={tarih}
                        not={not}
                        yonetici={yonetici}
                        benimId={kullanici?.id}
                        onDegisti={() => {
                          takibiYenile().catch((e: Error) => setHata(e.message));
                        }}
                      />
                    ) : null}
                  </View>
                );
              })}
            </Kart>
          ) : null}
        </ScrollView>
      ) : null}
    </Ekran>
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
    cipler: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: t.bosluk.s,
    },
    satir: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.s,
    },
    kutu: {
      flex: 1,
      minWidth: 0,
    },
    alt: {
      marginLeft: t.bosluk.xxl,
    },
  });
}
