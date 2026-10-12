// "Menü" sekmesinin gövdesi (tüm roller): profile giden kullanıcı satırı, sekme çubuğuna sığmayan bölümler
// (lib/menu.ts), tema seçimi ve çıkış.
import { useRouter } from 'expo-router';

import { Avatar } from '@/components/Avatar';
import { Ekran } from '@/components/Ekran';
import { Ikon } from '@/components/Ikon';
import { Kart } from '@/components/Kart';
import { ListeSatiri } from '@/components/ListeSatiri';
import { OnayButonu } from '@/components/OnayButonu';
import { Secenekler } from '@/components/Secenekler';
import { rolEtiketi, useMenu } from '@/lib/menu';
import { useOturum } from '@/lib/oturum';
import { useTema } from '@/lib/tema';
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
  const { menuSatirlari } = useMenu();
  const { tercih, tercihiAyarla } = useTemaTercihi();

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
