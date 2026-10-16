// "Menü" sekmesinin gövdesi (tüm roller): profile giden kullanıcı satırı, sekme çubuğuna sığmayan bölümler
// (lib/menu.ts; gruplu olanlar grup başlığının altında — sekme olan öğe burada tekrar edilmez), tema
// seçimi ve çıkış. Yalnızca 'mobil' düzende: 'web' düzeninde bunların hepsi kenar
// çubuğundadır (components/Sidebar), bu adres açılırsa ana ekrana dönülür.
import { type Href, Redirect, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Ekran } from '@/components/Ekran';
import { Ikon, type IkonAdi } from '@/components/Ikon';
import { Kart } from '@/components/Kart';
import { ListeSatiri } from '@/components/ListeSatiri';
import { OnayButonu } from '@/components/OnayButonu';
import { Secenekler } from '@/components/Secenekler';
import { rolEtiketi, useMenu } from '@/lib/menu';
import { useOturum } from '@/lib/oturum';
import { useDuzen, useTema } from '@/lib/tema';
import { type TemaTercihi, useTemaTercihi } from '@/lib/temaTercihi';

const TEMA_SECENEKLERI: { deger: TemaTercihi; etiket: string }[] = [
  { deger: 'sistem', etiket: 'Sistem' },
  { deger: 'acik', etiket: 'Açık' },
  { deger: 'karanlik', etiket: 'Karanlık' },
];

export function MenuEkrani() {
  const router = useRouter();
  const tema = useTema();
  const { kullanici, kurum, gorev, cikisYap } = useOturum();
  const { menuSatirlari, sekmeler, gruplar } = useMenu();
  const sekmeAdresleri = new Set(sekmeler.map((s) => (s.sekme === 'index' ? '/' : `/${s.sekme}`)));
  const menuGruplari = gruplar
    .map((g) => ({ ...g, ogeler: g.ogeler.filter((o) => !(typeof o.href === 'string' && sekmeAdresleri.has(o.href))) }))
    .filter((g) => g.ogeler.length > 0);
  const satir = (o: { anahtar: string; etiket: string; ikon: IkonAdi; href: Href }) => (
    <ListeSatiri
      key={o.anahtar}
      baslik={o.etiket}
      sol={<Ikon ad={o.ikon} boyut={24} renk={tema.renkler.anaParlak} />}
      onPress={() => router.push(o.href)}
    />
  );
  const { tercih, tercihiAyarla } = useTemaTercihi();
  const duzen = useDuzen();

  if (duzen === 'web') return <Redirect href="/" />;

  return (
    <Ekran kaydirilabilir>
      {kullanici ? (
        <ListeSatiri
          buyuk
          baslik={kullanici.ad_soyad}
          altBaslik={[rolEtiketi(kullanici.rol, kurum, gorev?.ad), kurum?.ad].filter(Boolean).join(' · ')}
          sol={<Avatar ad={kullanici.ad_soyad} boyut={48} />}
          onPress={() => router.push('/profil')}
        />
      ) : null}

      {menuSatirlari.map((o) => satir({ ...o, href: o.rota }))}

      {menuGruplari.map((g) => (
        <View key={g.anahtar} style={{ gap: tema.bosluk.m }}>
          <Text accessibilityRole="header" style={[tema.yazi.etiket, { marginTop: tema.bosluk.s }]}>
            {g.etiket}
          </Text>
          {g.ogeler.map(satir)}
        </View>
      ))}

      <Kart>
        <Secenekler etiket="Görünüm" secenekler={TEMA_SECENEKLERI} secili={tercih} onSec={tercihiAyarla} />
      </Kart>

      <OnayButonu etiket="Çıkış Yap" soru="Çıkış yapılsın mı?" onayEtiketi="Evet, çık" onOnay={cikisYap} />
    </Ekran>
  );
}
