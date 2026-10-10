// Sınıfın ders/konu takibi (sınıfın öğretmeni ve kurum admini): sınıfın izlediği kademenin
// dersleri seçilir, konular "işlendi" olarak işaretlenir; ilerleme kendiliğinden hesaplanır.
import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BosDurum } from '@/components/BosDurum';
import { Chip } from '@/components/Chip';
import { Ekran } from '@/components/Ekran';
import { HataMesaji } from '@/components/HataMesaji';
import { IlerlemeCubugu } from '@/components/IlerlemeCubugu';
import { Kart } from '@/components/Kart';
import { OnayKutusu } from '@/components/OnayKutusu';
import { Yukleniyor } from '@/components/Yukleniyor';
import { type KademeIcerigi, kademeIceriginiGetir, konuDurumunuAyarla, sinifIlerlemesiniGetir } from '@/lib/icerik';
import { useOturum } from '@/lib/oturum';
import { sinifGetir } from '@/lib/siniflar';
import { tarihiBicimle } from '@/lib/tarih';
import { type Tema, useTema } from '@/lib/tema';
import type { Sinif } from '@/lib/tipler';

export function DersTakibiEkrani({ sinifId }: { sinifId: string }) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const { kullanici } = useOturum();
  const [sinif, setSinif] = useState<Sinif | null>(null);
  const [icerik, setIcerik] = useState<KademeIcerigi | null>(null);
  const [ilerleme, setIlerleme] = useState<Map<string, string>>(new Map());
  const [seciliDersId, setSeciliDersId] = useState<string | null>(null);
  const [degisen, setDegisen] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [hazir, setHazir] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let iptalEdildi = false;
      setHata(null);
      (async () => {
        const s = await sinifGetir(sinifId);
        const [i, il] = await Promise.all([
          s.kademe_id ? kademeIceriginiGetir(s.kademe_id) : null,
          sinifIlerlemesiniGetir(sinifId),
        ]);
        if (iptalEdildi) return;
        setSinif(s);
        setIcerik(i);
        setIlerleme(il);
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
  const seciliDers = dersler.find((d) => d.id === seciliDersId) ?? dersler[0] ?? null;
  const tumKonular = dersler.flatMap((d) => d.konular);
  const tamamSayisi = (konular: { id: string }[]) => konular.filter((k) => ilerleme.has(k.id)).length;

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

      {hazir && seciliDers ? (
        <ScrollView style={styles.kaydirma} contentContainerStyle={styles.icerik}>
          <Kart>
            <IlerlemeCubugu tamam={tamamSayisi(tumKonular)} toplam={tumKonular.length} etiket="Tüm dersler" />
          </Kart>
          <View style={styles.cipler}>
            {dersler.map((d) => (
              <Chip
                key={d.id}
                etiket={`${d.ad} ${tamamSayisi(d.konular)}/${d.konular.length}`}
                secili={d.id === seciliDers.id}
                onPress={() => setSeciliDersId(d.id)}
              />
            ))}
          </View>
          <Kart>
            <Text style={tema.yazi.bolum}>{seciliDers.ad}</Text>
            {seciliDers.konular.length === 0 ? <Text style={tema.yazi.kucuk}>Bu derse henüz konu eklenmemiş.</Text> : null}
            {seciliDers.konular.map((k, i) => (
              <View key={k.id}>
                <OnayKutusu
                  etiket={`${i + 1}. ${k.ad}`}
                  secili={ilerleme.has(k.id)}
                  calisiyor={degisen === k.id}
                  pasif={degisen !== null}
                  onDegis={(secili) => isaretle(k.id, secili)}
                />
                {ilerleme.has(k.id) ? (
                  <Text style={[tema.yazi.kucuk, styles.tarih]}>İşlendi: {tarihiBicimle(ilerleme.get(k.id) ?? '')}</Text>
                ) : null}
              </View>
            ))}
          </Kart>
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
    tarih: {
      marginLeft: t.bosluk.xxl,
    },
  });
}
