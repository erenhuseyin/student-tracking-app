// Sınıfın ezber takibi (sınıfın öğretmeni ve kurum admini). İki görünüm:
//   Öğrenciye göre : öğrenciler, ezber özetiyle; dokununca öğrencinin tüm listesi açılır.
//   Maddeye göre   : bir sure/dua seçilir, sınıfın tüm öğrencileri o madde için tek dokunuşla
//                    işaretlenir (derste aynı maddeyi birçok öğrenciden dinleyen hoca için).
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Ekran } from '@/components/Ekran';
import { EzberDurumDugmeleri, type EzberSecimi } from '@/components/EzberDurumDugmeleri';
import { Kart } from '@/components/Kart';
import { Liste } from '@/components/Liste';
import { ListeSatiri } from '@/components/ListeSatiri';
import { Secenekler } from '@/components/Secenekler';
import { Secim } from '@/components/Secim';
import { ezberDurumunuAyarla, ezberListesiniGetir, ogrenciEzberleriniGetir } from '@/lib/icerik';
import { ogrencileriGetir } from '@/lib/ogrenciler';
import { sinifGetir } from '@/lib/siniflar';
import { type Tema, useTema } from '@/lib/tema';
import type { EzberDurumu, EzberMaddesi, Ogrenci } from '@/lib/tipler';

type Gorunum = 'ogrenci' | 'madde';
const GORUNUMLER: { deger: Gorunum; etiket: string }[] = [
  { deger: 'ogrenci', etiket: 'Öğrenciye göre' },
  { deger: 'madde', etiket: 'Maddeye göre' },
];

const anahtar = (ogrenciId: string, maddeId: string) => `${ogrenciId}:${maddeId}`;

export function SinifEzberi({ sinifId }: { sinifId: string }) {
  const router = useRouter();
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const [baslik, setBaslik] = useState('Ezber Takibi');
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[] | null>(null);
  const [maddeler, setMaddeler] = useState<EzberMaddesi[]>([]);
  // 'ogrenciId:maddeId' -> durum (satır yoksa başlamadı)
  const [durumlar, setDurumlar] = useState<Map<string, EzberDurumu>>(new Map());
  // `madde`: ders takibindeki ezber görünümünden gelince o madde "maddeye göre" açılır.
  const { madde } = useLocalSearchParams<{ madde?: string }>();
  const [gorunum, setGorunum] = useState<Gorunum>(madde ? 'madde' : 'ogrenci');
  const [secilenMaddeId, setSecilenMaddeId] = useState<string | null>(madde ?? null);
  const [kaydedilen, setKaydedilen] = useState<Set<string>>(new Set());
  const [hata, setHata] = useState<string | null>(null);

  const yenile = useCallback(async () => {
    setHata(null);
    try {
      const [sinif, liste] = await Promise.all([sinifGetir(sinifId), ogrencileriGetir(sinifId)]);
      const [ezberListesi, kayitlar] = await Promise.all([
        ezberListesiniGetir(sinif.kademe_id),
        ogrenciEzberleriniGetir(liste.map((o) => o.id)),
      ]);
      setBaslik(`${sinif.ad} · Ezber Takibi`);
      setMaddeler(ezberListesi);
      setDurumlar(new Map(kayitlar.map((k) => [anahtar(k.ogrenci_id, k.madde_id), k.durum])));
      setOgrenciler(liste);
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
    }
  }, [sinifId]);

  useFocusEffect(
    useCallback(() => {
      yenile();
    }, [yenile]),
  );

  const maddeId = secilenMaddeId ?? maddeler[0]?.id ?? null;
  const durumu = (ogrenciId: string, m: string): EzberSecimi => durumlar.get(anahtar(ogrenciId, m)) ?? 'baslamadi';
  const sayi = (ogrenciId: string, durum: EzberDurumu) => maddeler.filter((m) => durumu(ogrenciId, m.id) === durum).length;

  const maddeSecenekleri = useMemo(
    () =>
      maddeler.map((m) => {
        const tamam = (ogrenciler ?? []).filter((o) => durumlar.get(anahtar(o.id, m.id)) === 'tamam').length;
        return { deger: m.id, etiket: `${m.ad} · ${tamam}/${ogrenciler?.length ?? 0}` };
      }),
    [maddeler, ogrenciler, durumlar],
  );

  const yaz = (k: string, durum: EzberSecimi) =>
    setDurumlar((mevcut) => {
      const yeni = new Map(mevcut);
      if (durum === 'baslamadi') yeni.delete(k);
      else yeni.set(k, durum);
      return yeni;
    });

  // Ekran hemen güncellenir; kayıt başarısız olursa önceki duruma dönülür.
  const ayarla = async (ogrenci: Ogrenci, m: string, durum: EzberSecimi) => {
    const k = anahtar(ogrenci.id, m);
    const onceki = durumu(ogrenci.id, m);
    setHata(null);
    yaz(k, durum);
    setKaydedilen((s) => new Set(s).add(k));
    try {
      await ezberDurumunuAyarla(ogrenci.kurum_id, ogrenci.id, m, durum);
    } catch (e) {
      yaz(k, onceki);
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
    } finally {
      setKaydedilen((s) => {
        const yeni = new Set(s);
        yeni.delete(k);
        return yeni;
      });
    }
  };

  const maddeyeGore = gorunum === 'madde' && maddeId !== null;

  return (
    <Ekran>
      <Stack.Screen options={{ title: baslik }} />
      <Liste
        veri={ogrenciler}
        hata={hata}
        onYenile={yenile}
        anahtar={(o) => o.id}
        bosIkon="people-outline"
        bosBaslik="Bu sınıfta öğrenci yok"
        ust={
          <View style={styles.ust}>
            {maddeler.length === 0 ? (
              <Text style={tema.yazi.kucuk}>Kurumun ezber listesi henüz tanımlanmamış.</Text>
            ) : (
              <>
                <Secenekler secenekler={GORUNUMLER} secili={gorunum} onSec={setGorunum} />
                {gorunum === 'madde' ? (
                  <Secim etiket="Ezber maddesi" secenekler={maddeSecenekleri} secili={maddeId} onSec={setSecilenMaddeId} />
                ) : null}
              </>
            )}
          </View>
        }
        satir={(o) =>
          maddeyeGore ? (
            <Kart>
              <View style={styles.satir}>
                <Text style={styles.ad}>{o.ad_soyad}</Text>
                <EzberDurumDugmeleri
                  ad={o.ad_soyad}
                  durum={durumu(o.id, maddeId)}
                  onSec={(d) => ayarla(o, maddeId, d)}
                  pasif={kaydedilen.has(anahtar(o.id, maddeId))}
                />
              </View>
            </Kart>
          ) : (
            <ListeSatiri
              baslik={o.ad_soyad}
              altBaslik={`${sayi(o.id, 'tamam')}/${maddeler.length} tamam${sayi(o.id, 'devam') > 0 ? ` · ${sayi(o.id, 'devam')} devam ediyor` : ''}`}
              sol={<Avatar ad={o.ad_soyad} />}
              onPress={() => router.push(`/ogrenci-ezber/${o.id}`)}
            />
          )
        }
      />
    </Ekran>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    ust: {
      gap: t.bosluk.m,
      marginBottom: t.bosluk.m,
    },
    satir: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.s,
    },
    ad: {
      ...t.yazi.govde,
      flex: 1,
      fontFamily: t.yaziTipi.yariKalin,
    },
  });
}
