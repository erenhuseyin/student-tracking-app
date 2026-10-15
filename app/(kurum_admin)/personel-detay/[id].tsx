// Erişim: yalnızca kurum_admin (yönettiği birim ve altındaki personel; RLS). Hocanın (ya da
// yöneticinin) salt okunur özeti: kimlik, sınıfları ve her sınıfın öğrenci sayısı, son 4 haftanın
// katılımı, son yoklaması ve konu ilerlemesi. Düzenleme mevcut ekrandadır (`/personel/[id]`).
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BilgiListesi } from '@/components/BilgiListesi';
import { BosDurum } from '@/components/BosDurum';
import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { EylemCubugu } from '@/components/EylemCubugu';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { ListeSatiri } from '@/components/ListeSatiri';
import { MetrikKarti } from '@/components/MetrikKarti';
import { PersonelDurumRozeti } from '@/components/PersonelDurumRozeti';
import { Tablo, type TabloSutunu } from '@/components/Tablo';
import { Yukleniyor } from '@/components/Yukleniyor';
import { cinsiyetEtiketi } from '@/lib/cinsiyet';
import { DETAY_GUN_SAYISI, type HocaSinifi, type PersonelOzeti, personelOzetiniGetir } from '@/lib/detay';
import { gorevleriGetir } from '@/lib/gorevler';
import { yuzdeMetni } from '@/lib/katilim';
import { rolEtiketi } from '@/lib/menu';
import { tarihiBicimle } from '@/lib/tarih';
import { type Tema, useTema } from '@/lib/tema';
import type { Gorev } from '@/lib/tipler';
import { useKurum } from '@/lib/useKurum';

const konuMetni = (s: HocaSinifi) => (s.konu ? `${s.konu.islenen}/${s.konu.toplam}` : '—');
const sonYoklamaMetni = (s: HocaSinifi) => (s.sonYoklama ? tarihiBicimle(s.sonYoklama) : '—');

export default function PersonelDetayi() {
  const router = useRouter();
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ozet, setOzet] = useState<PersonelOzeti | null>(null);
  const [gorevler, setGorevler] = useState<Gorev[]>([]);
  const [hata, setHata] = useState<string | null>(null);
  const { kurum: birim, yol } = useKurum(ozet?.personel.kurum_id ?? undefined, true);

  useFocusEffect(
    useCallback(() => {
      let iptalEdildi = false;
      setHata(null);
      personelOzetiniGetir(id)
        .then((veri) => {
          if (!iptalEdildi) setOzet(veri);
        })
        .catch((e: Error) => {
          if (!iptalEdildi) setHata(e.message);
        });
      // Tanımlı rolün adı okunamazsa yalnızca sistem rolü yazılır.
      gorevleriGetir()
        .then((veri) => {
          if (!iptalEdildi) setGorevler(veri);
        })
        .catch(() => {});
      return () => {
        iptalEdildi = true;
      };
    }, [id]),
  );

  const sinifaGit = useCallback((s: HocaSinifi) => router.push({ pathname: '/sinif/[id]', params: { id: s.sinif.id } }), [router]);

  const sutunlar = useMemo<TabloSutunu<HocaSinifi>[]>(
    () => [
      { anahtar: 'ad', baslik: 'Sınıf', icerik: (s) => s.sinif.ad },
      { anahtar: 'kademe', baslik: 'Kademe', icerik: (s) => s.kademeAdi ?? '—' },
      { anahtar: 'ogrenci', baslik: 'Öğrenci', icerik: (s) => String(s.ogrenciSayisi), genislik: 90, hizalama: 'sag' },
      { anahtar: 'katilim', baslik: 'Katılım', icerik: (s) => yuzdeMetni(s.katilim.oran), genislik: 90, hizalama: 'sag' },
      { anahtar: 'son', baslik: 'Son Yoklama', icerik: sonYoklamaMetni, genislik: 130 },
      { anahtar: 'konu', baslik: 'İşlenen Konu', icerik: konuMetni, genislik: 120, hizalama: 'sag' },
    ],
    [],
  );

  if (hata) {
    return (
      <Ekran>
        <Stack.Screen options={{ title: 'Personel' }} />
        <HataMesaji mesaj={hata} />
      </Ekran>
    );
  }
  if (!ozet) {
    return (
      <Ekran>
        <Stack.Screen options={{ title: 'Personel' }} />
        <Yukleniyor />
      </Ekran>
    );
  }

  const p = ozet.personel;
  const gorevAdi = gorevler.find((g) => g.id === p.gorev_id)?.ad;
  const ogretmen = p.rol === 'ogretmen';

  return (
    <Ekran kaydirilabilir>
      <Stack.Screen options={{ title: p.ad_soyad }} />
      <EylemCubugu>
        <Buton
          tur="ikincil"
          ikon="create-outline"
          baslik="Düzenle"
          onPress={() => router.push({ pathname: '/personel/[id]', params: { id: p.id } })}
        />
      </EylemCubugu>

      <Kart>
        <View style={styles.baslikSatiri}>
          <Text style={tema.yazi.bolum}>Bilgiler</Text>
          <PersonelDurumRozeti personel={p} />
        </View>
        <BilgiListesi
          satirlar={[
            { etiket: 'Rol / görev', deger: rolEtiketi(p.rol, birim, gorevAdi) },
            { etiket: 'Birim', deger: yol || birim?.ad },
            { etiket: 'Cinsiyet', deger: cinsiyetEtiketi(p.cinsiyet) },
            { etiket: 'E-posta', deger: p.eposta },
          ]}
        />
      </Kart>

      {ogretmen ? (
        <>
          <View style={styles.izgara}>
            <MetrikKarti deger={ozet.siniflar.length} etiket="Sınıf" ikon="school-outline" />
            <MetrikKarti deger={ozet.ogrenciSayisi} etiket="Öğrenci" ikon="people-outline" />
            <MetrikKarti
              deger={yuzdeMetni(ozet.katilim.oran)}
              etiket={`Katılım (son ${DETAY_GUN_SAYISI / 7} hafta)`}
              ikon="checkmark-done-outline"
            />
          </View>

          <Text style={tema.yazi.bolum}>Sınıfları</Text>
          {ozet.siniflar.length === 0 ? (
            <BosDurum ikon="school-outline" baslik="Atanmış sınıf yok" aciklama="Sınıf ataması Düzenle ekranından yapılır." />
          ) : tema.duzen === 'web' ? (
            <Tablo veri={ozet.siniflar} sutunlar={sutunlar} anahtar={(s) => s.sinif.id} onPress={sinifaGit} />
          ) : (
            ozet.siniflar.map((s) => (
              <ListeSatiri
                key={s.sinif.id}
                baslik={s.sinif.ad}
                altBaslik={[
                  `${s.ogrenciSayisi} öğrenci`,
                  `katılım ${yuzdeMetni(s.katilim.oran)}`,
                  s.sonYoklama ? `son yoklama ${tarihiBicimle(s.sonYoklama)}` : 'yoklama yok',
                  s.konu ? `${konuMetni(s)} konu` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                onPress={() => sinifaGit(s)}
              />
            ))
          )}
          <Text style={tema.yazi.kucuk}>Katılım ve son yoklama son {DETAY_GUN_SAYISI / 7} haftaya göredir.</Text>
        </>
      ) : null}
    </Ekran>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
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
