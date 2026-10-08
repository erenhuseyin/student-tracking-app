// "Menü" sekmesinin gövdesi (tüm roller): kullanıcı kartı, sekme çubuğuna sığmayan bölümler
// (lib/menu.ts), tema seçimi ve çıkış.
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Ekran } from '@/components/Ekran';
import { Ikon } from '@/components/Ikon';
import { Kart } from '@/components/Kart';
import { ListeSatiri } from '@/components/ListeSatiri';
import { OnayButonu } from '@/components/OnayButonu';
import { Secenekler } from '@/components/Secenekler';
import { useMenu } from '@/lib/menu';
import { useOturum } from '@/lib/oturum';
import { type Tema, useTema } from '@/lib/tema';
import { type TemaTercihi, useTemaTercihi } from '@/lib/temaTercihi';
import type { Rol } from '@/lib/tipler';

const ROL_ETIKETLERI: Record<Rol, string> = {
  super_admin: 'Süper yönetici',
  kurum_admin: 'Yönetici',
  ogretmen: 'Öğretmen',
  veli: 'Veli',
};

const TEMA_SECENEKLERI: { deger: TemaTercihi; etiket: string }[] = [
  { deger: 'sistem', etiket: 'Sistem' },
  { deger: 'acik', etiket: 'Açık' },
  { deger: 'karanlik', etiket: 'Karanlık' },
];

export function MenuEkrani() {
  const router = useRouter();
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const { kullanici, kurum, cikisYap } = useOturum();
  const { menuSatirlari } = useMenu();
  const { tercih, tercihiAyarla } = useTemaTercihi();

  return (
    <Ekran kaydirilabilir>
      {kullanici ? (
        <Kart>
          <View style={styles.kullanici}>
            <Avatar ad={kullanici.ad_soyad} boyut={48} />
            <View style={styles.kullaniciMetinleri}>
              <Text style={tema.yazi.bolum} numberOfLines={2}>
                {kullanici.ad_soyad}
              </Text>
              <Text style={tema.yazi.kucuk} numberOfLines={2}>
                {[ROL_ETIKETLERI[kullanici.rol], kurum?.ad].filter(Boolean).join(' · ')}
              </Text>
            </View>
          </View>
        </Kart>
      ) : null}

      {menuSatirlari.map((o) => (
        <ListeSatiri
          key={o.anahtar}
          baslik={o.etiket}
          sol={<Ikon ad={o.ikon} boyut={24} renk={tema.renkler.anaParlak} />}
          onPress={() => router.push(o.rota)}
        />
      ))}

      <Kart>
        <Secenekler etiket="Görünüm" secenekler={TEMA_SECENEKLERI} secili={tercih} onSec={tercihiAyarla} />
      </Kart>

      <OnayButonu etiket="Çıkış Yap" soru="Çıkış yapılsın mı?" onayEtiketi="Evet, çık" onOnay={cikisYap} />
    </Ekran>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    kullanici: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.m,
    },
    kullaniciMetinleri: {
      flex: 1,
      gap: t.bosluk.xs,
    },
  });
}
