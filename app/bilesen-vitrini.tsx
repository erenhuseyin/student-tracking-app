// Bileşen vitrini — yalnızca geliştirme ortamında erişilebilir (`__DEV__`). Hiçbir
// `Stack.Protected` grubuna dahil değildir; `app/_layout.tsx`'te korumaların dışında kayıtlıdır.
// Üretim derlemesinde `__DEV__` false olduğu için yönlendirilir, route tablet/telefonda hiç
// görünmez.
import { Redirect, Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { BosDurum } from '@/components/BosDurum';
import { Buton } from '@/components/Buton';
import { Chip } from '@/components/Chip';
import { DurumRozeti } from '@/components/DurumRozeti';
import { Girdi } from '@/components/Girdi';
import { Kart } from '@/components/Kart';
import { ListeSatiri } from '@/components/ListeSatiri';
import { MetrikKarti } from '@/components/MetrikKarti';
import { Rozet } from '@/components/Rozet';
import { Sidebar } from '@/components/Sidebar';
import { Skeleton, SkeletonKart, SkeletonSatir } from '@/components/Skeleton';
import { Tablo } from '@/components/Tablo';
import { type Tema, useTema } from '@/lib/tema';

function Bolum({ tema: t, baslik, children }: { tema: Tema; baslik: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: t.bosluk.m }}>
      <Text style={t.yazi.bolum}>{baslik}</Text>
      {children}
    </View>
  );
}

function VitrinIcerik() {
  // Her bileşen OS temasını kendi useTema() çağrısıyla bağımsız okur (ortak bir
  // ThemeContext/override yok — bkz. lib/tema.ts dosya başı notu); bu yüzden burada
  // sahte bir "zorla karanlık" düğmesi yok, yalnızca gerçek durum okunur. Karanlık modu
  // görmek için işletim sisteminin/tarayıcının temasını değiştirin (prefers-color-scheme).
  const tema = useTema();
  const [secimli, setSecimli] = useState(false);
  const [tabloOgeleri] = useState([
    { id: '1', ad: 'Elif Kaya', sinif: '1-A', katilim: '%92' },
    { id: '2', ad: 'Kamil Arsız', sinif: '1-A', katilim: '%78' },
  ]);

  return (
    <ScrollView
      style={{ backgroundColor: tema.renkler.zemin }}
      contentContainerStyle={[styles.icerik, { gap: tema.bosluk.xxl, padding: tema.bosluk.l }]}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={tema.yazi.baslik}>Bileşen Vitrini</Text>
        <Rozet
          metin={tema.mod === 'karanlik' ? 'Karanlık (OS)' : 'Açık (OS)'}
          renk={tema.renkler.vurguKoyu}
          zemin={tema.renkler.vurguSoluk}
        />
      </View>

      <Bolum tema={tema} baslik="Buton">
        <View style={{ gap: tema.bosluk.s }}>
          <Buton tur="birincil" baslik="Birincil" onPress={() => {}} />
          <Buton tur="ikincil" baslik="İkincil" onPress={() => {}} />
          <Buton tur="metin" baslik="Metin" onPress={() => {}} />
          <Buton tur="tehlike" baslik="Tehlike" onPress={() => {}} />
        </View>
      </Bolum>

      <Bolum tema={tema} baslik="Chip / durum etiketi">
        <View style={{ flexDirection: 'row', gap: tema.bosluk.s }}>
          <Chip etiket="Seçili" secili onPress={() => {}} />
          <Chip etiket="Seçisiz" secili={false} onPress={() => {}} />
        </View>
        <View style={{ flexDirection: 'row', gap: tema.bosluk.s, flexWrap: 'wrap' }}>
          <DurumRozeti durum="geldi" />
          <DurumRozeti durum="gelmedi" />
          <DurumRozeti durum="gec" />
          <Rozet metin="Kategori" renk={tema.renkler.vurguKoyu} zemin={tema.renkler.vurguSoluk} />
        </View>
      </Bolum>

      <Bolum tema={tema} baslik="Kart + metrik kartı">
        <Kart>
          <Text style={tema.yazi.govde}>Basit bir kart, 1px ayırıcı kenarlıkla (gölge yok).</Text>
        </Kart>
        <View style={{ flexDirection: 'row', gap: tema.bosluk.m }}>
          <MetrikKarti deger={24} etiket="Toplam öğrenci" ikon="people-outline" />
          <MetrikKarti deger="%87" etiket="Haftalık katılım" ikon="checkmark-circle-outline" />
        </View>
      </Bolum>

      <Bolum tema={tema} baslik="Liste satırı">
        <ListeSatiri
          baslik="Elif Kaya"
          altBaslik="1-A · %92 katılım"
          sol={<Avatar ad="Elif Kaya" />}
          sag={<Rozet metin="%92" renk={tema.renkler.basari} zemin={tema.renkler.basariSoluk} />}
        />
      </Bolum>

      <Bolum tema={tema} baslik="Tablo (masaüstü ≥1024'te Liste bunu otomatik kullanır)">
        <Tablo
          veri={tabloOgeleri}
          anahtar={(o) => o.id}
          sutunlar={[
            { anahtar: 'ad', baslik: 'Ad Soyad', icerik: (o) => <Text style={tema.yazi.govde}>{o.ad}</Text> },
            { anahtar: 'sinif', baslik: 'Sınıf', icerik: (o) => <Text style={tema.yazi.govde}>{o.sinif}</Text> },
            {
              anahtar: 'katilim',
              baslik: 'Katılım',
              hizalama: 'sag',
              icerik: (o) => <Text style={tema.yazi.govde}>{o.katilim}</Text>,
            },
          ]}
        />
      </Bolum>

      <Bolum tema={tema} baslik="Form alanı">
        <Girdi etiket="Ad soyad" placeholder="Örn. Elif Kaya" />
      </Bolum>

      <Bolum tema={tema} baslik="Boş durum">
        <BosDurum ikon="people-outline" baslik="Henüz kayıt yok" aciklama="İlk kaydı ekleyince burada görünür." />
      </Bolum>

      <Bolum tema={tema} baslik="Skeleton">
        <SkeletonSatir />
        <SkeletonKart />
        <Skeleton genislik={120} yukseklik={14} />
      </Bolum>

      <Bolum tema={tema} baslik="Sidebar (tablet: yalnızca ikon, masaüstü: ikon + etiket)">
        <View style={{ flexDirection: 'row', height: 220 }}>
          <Sidebar
            ogeler={[
              { href: '/bilesen-vitrini', etiket: 'Sınıflar', ikon: 'school-outline' },
              { href: '/bilesen-vitrini', etiket: 'Personel', ikon: 'people-outline' },
            ]}
          />
        </View>
      </Bolum>

      <Bolum tema={tema} baslik="Alt eylem çubuğu (<768 — gerçek sekme çubuğu değil, bkz. not)">
        <Text style={tema.yazi.kucuk}>
          Not: Navigasyon yapısı (route adları, Stack.Protected) korunduğu için gerçek bir Tabs
          navigatör&apos;üne geçilmedi; çok bölümlü ekranlarda (kurum admini, süper admin) mevcut
          buton grubu yalnızca görsel olarak bu şekilde biçimlendirilir.
        </Text>
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: tema.renkler.ayirici, paddingTop: tema.bosluk.s }}>
          {(['Sınıflar', 'Personel', 'Şubeler'] as const).map((e, i) => (
            <View key={e} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
              <Text style={[tema.yazi.etiket, i === 0 && { color: tema.renkler.ana, fontFamily: tema.yaziTipi.yariKalin }]}>
                {e}
              </Text>
            </View>
          ))}
        </View>
      </Bolum>

      <Buton
        tur="metin"
        baslik={secimli ? 'Segment: Tablo seçili' : 'Segment: Katılım listesi seçili'}
        onPress={() => setSecimli((s) => !s)}
      />
    </ScrollView>
  );
}

export default function BilesenVitrini() {
  // Hook kuralları gereği erken dönüşten önce çağrılamaz; bu yüzden zemin rengi burada değil
  // VitrinIcerik içinde (kendi useTema() çağrısıyla) uygulanır.
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <View style={styles.kok}>
      <Stack.Screen options={{ title: 'Bileşen Vitrini' }} />
      <VitrinIcerik />
    </View>
  );
}

const styles = StyleSheet.create({
  kok: {
    flex: 1,
  },
  icerik: {
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },
});
