// Erişim: yalnızca kurum_admin (yönettiği birim ve altındaki öğrenciler; RLS). Öğrencinin salt
// okunur özeti — kimlik, son 4 haftanın katılımı, ezber/kitap/gelişim sayıları — ve yoklama,
// gelişim, ezber, kitap görünümleri. Düzenleme mevcut formdadır (`/ogrenci-duzenle/[id]`).
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BilgiListesi } from '@/components/BilgiListesi';
import { Buton } from '@/components/Buton';
import { Chip } from '@/components/Chip';
import { Ekran } from '@/components/Ekran';
import { EylemCubugu } from '@/components/EylemCubugu';
import { GelisimZamanCizelgesi } from '@/components/GelisimZamanCizelgesi';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { MetrikKarti } from '@/components/MetrikKarti';
import { OgrenciEzber } from '@/components/OgrenciEzber';
import { OgrenciKitaplari } from '@/components/OgrenciKitaplari';
import { Rozet } from '@/components/Rozet';
import { YoklamaGecmisi } from '@/components/YoklamaGecmisi';
import { cinsiyetEtiketi } from '@/lib/cinsiyet';
import { DETAY_GUN_SAYISI, type OgrenciOzeti, ogrenciOzetiniGetir } from '@/lib/detay';
import { ICERIK_OZELLIGI } from '@/lib/icerik';
import { katilimMetni, yuzdeMetni } from '@/lib/katilim';
import { useOzellik } from '@/lib/ozellikler';
import { tarihiBicimle } from '@/lib/tarih';
import { type Tema, useTema } from '@/lib/tema';
import { useKurum } from '@/lib/useKurum';

type Gorunum = 'ozet' | 'yoklama' | 'gelisim' | 'ezber' | 'kitap';

export default function OgrenciDetayi() {
  const router = useRouter();
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ozet, setOzet] = useState<OgrenciOzeti | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [gorunum, setGorunum] = useState<Gorunum>('ozet');
  const icerikAcik = useOzellik(ICERIK_OZELLIGI);
  const { kurum: birim, yol } = useKurum(ozet?.ogrenci.kurum_id, true);

  useFocusEffect(
    useCallback(() => {
      let iptalEdildi = false;
      setHata(null);
      ogrenciOzetiniGetir(id)
        .then((veri) => {
          if (!iptalEdildi) setOzet(veri);
        })
        .catch((e: Error) => {
          if (!iptalEdildi) setHata(e.message);
        });
      return () => {
        iptalEdildi = true;
      };
    }, [id]),
  );

  const gorunumler: { deger: Gorunum; etiket: string }[] = [
    { deger: 'ozet', etiket: 'Özet' },
    { deger: 'yoklama', etiket: 'Yoklama' },
    { deger: 'gelisim', etiket: 'Gelişim' },
    ...(icerikAcik
      ? [
          { deger: 'ezber' as const, etiket: 'Ezber' },
          { deger: 'kitap' as const, etiket: 'Kitap' },
        ]
      : []),
  ];

  const o = ozet?.ogrenci;

  return (
    <Ekran>
      <Stack.Screen options={{ title: o?.ad_soyad ?? 'Öğrenci' }} />
      <HataMesaji mesaj={hata} />
      {o ? (
        <EylemCubugu>
          <Buton
            tur="ikincil"
            ikon="create-outline"
            baslik="Düzenle"
            onPress={() => router.push({ pathname: '/ogrenci-duzenle/[id]', params: { id: o.id } })}
          />
          <Buton
            tur="ikincil"
            ikon="school-outline"
            baslik="Sınıfı"
            onPress={() => router.push({ pathname: '/sinif/[id]', params: { id: o.sinif_id } })}
          />
        </EylemCubugu>
      ) : null}

      <View style={styles.cipler}>
        {gorunumler.map((g) => (
          <Chip key={g.deger} etiket={g.etiket} secili={g.deger === gorunum} onPress={() => setGorunum(g.deger)} />
        ))}
      </View>

      {gorunum === 'ozet' && ozet && o ? (
        <ScrollView style={styles.kaydirma} contentContainerStyle={styles.icerik}>
          <Kart>
            <View style={styles.baslikSatiri}>
              <Text style={tema.yazi.bolum}>Bilgiler</Text>
              {o.aktif ? (
                <Rozet metin="Aktif" renk={tema.renkler.basari} zemin={tema.renkler.basariSoluk} ikon="checkmark-circle" />
              ) : (
                <Rozet metin="Pasif" renk={tema.renkler.metinIkincil} zemin={tema.renkler.ayirici} ikon="pause-circle-outline" />
              )}
            </View>
            <BilgiListesi
              satirlar={[
                { etiket: 'Birim', deger: yol || birim?.ad },
                { etiket: 'Sınıf', deger: ozet.sinif?.ad },
                { etiket: 'Doğum tarihi', deger: tarihiBicimle(o.dogum_tarihi) },
                { etiket: 'Cinsiyet', deger: cinsiyetEtiketi(o.cinsiyet) },
                { etiket: 'Veli kullanıcı adı', deger: o.kullanici_adi ?? 'Veli girişi açılmamış' },
                { etiket: 'Kayıt tarihi', deger: tarihiBicimle(o.olusturma_tarihi.slice(0, 10)) },
              ]}
            />
          </Kart>
          <View style={styles.izgara}>
            <MetrikKarti deger={yuzdeMetni(ozet.katilim.oran)} etiket={`Katılım (son ${DETAY_GUN_SAYISI / 7} hafta)`} ikon="checkmark-done-outline" />
            <MetrikKarti deger={ozet.gelisimKaydi} etiket="Gelişim kaydı" ikon="trending-up-outline" />
            {icerikAcik ? (
              <>
                <MetrikKarti deger={ozet.ezber.tamam} etiket={`Ezber tamam · ${ozet.ezber.devam} devam`} ikon="book-outline" />
                <MetrikKarti deger={ozet.kitap.biten} etiket={`Biten kitap · ${ozet.kitap.okunan} okunuyor`} ikon="library-outline" />
              </>
            ) : null}
          </View>
          <Text style={tema.yazi.kucuk}>
            {katilimMetni(ozet.katilim) ?? `Son ${DETAY_GUN_SAYISI / 7} haftada yoklama kaydı yok.`}
            {ozet.sonYoklama ? ` · son yoklama ${tarihiBicimle(ozet.sonYoklama)}` : ''}
          </Text>
        </ScrollView>
      ) : null}
      {gorunum === 'yoklama' ? <YoklamaGecmisi ogrenciId={id} /> : null}
      {gorunum === 'gelisim' ? <GelisimZamanCizelgesi ogrenciId={id} /> : null}
      {gorunum === 'ezber' ? <OgrenciEzber ogrenciId={id} duzenlenebilir /> : null}
      {gorunum === 'kitap' ? <OgrenciKitaplari ogrenciId={id} duzenlenebilir /> : null}
    </Ekran>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    cipler: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: t.bosluk.s,
    },
    kaydirma: {
      flex: 1,
    },
    icerik: {
      gap: t.bosluk.m,
      paddingBottom: t.bosluk.l,
    },
    baslikSatiri: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: t.bosluk.s,
    },
    izgara: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: t.bosluk.m,
    },
  });
}
