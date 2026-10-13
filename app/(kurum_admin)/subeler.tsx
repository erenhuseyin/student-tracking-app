// Erişim: kurum_admin. Bir düğümün doğrudan altındaki birimler (kökün bölgeleri, bölgenin ilçeleri …).
// `ustId` verilmezse yöneticinin kendi kurumunun altı listelenir. RLS yönetici olmayan ya da başka
// daldaki birimi göstermez; en alt seviyedeki yönetici Menü'de bu satırı görmez (lib/menu.ts).
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { BaslikEkleButonu } from '@/components/BaslikEkleButonu';
import { Ekran } from '@/components/Ekran';
import { Ikon } from '@/components/Ikon';
import { IkonButon } from '@/components/IkonButon';
import { Liste } from '@/components/Liste';
import { ListeSatiri } from '@/components/ListeSatiri';
import { altKurumlariGetir } from '@/lib/kurumlar';
import { useOturum } from '@/lib/oturum';
import { altBirimAcabilir, seviyeAdiCogul, seviyeAdiKucuk } from '@/lib/seviye';
import { useTema } from '@/lib/tema';
import type { Kurum } from '@/lib/tipler';
import { useKurum } from '@/lib/useKurum';

export default function AltBirimler() {
  const router = useRouter();
  const tema = useTema();
  const { kurum: kendiKurumu } = useOturum();
  const { ustId: ustParam } = useLocalSearchParams<{ ustId?: string }>();
  const ustId = ustParam ?? kendiKurumu?.id;
  const { kurum: ust, hata: ustHatasi } = useKurum(ustId);
  const [birimler, setBirimler] = useState<Kurum[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const yenile = useCallback(async () => {
    if (!ustId) return;
    setHata(null);
    try {
      setBirimler(await altKurumlariGetir(ustId));
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
    }
  }, [ustId]);

  useFocusEffect(
    useCallback(() => {
      yenile();
    }, [yenile]),
  );

  const altSeviye = (ust?.seviye ?? 1) + 1;
  const ad = seviyeAdiKucuk(altSeviye);

  return (
    <Ekran>
      <Stack.Screen options={{ title: ust ? (ustParam ? `${ust.ad} · ${seviyeAdiCogul(altSeviye)}` : seviyeAdiCogul(altSeviye)) : '' }} />
      {altBirimAcabilir(ust) ? (
        <BaslikEkleButonu etiket={`Yeni ${ad} ekle`} onPress={() => router.push(`/yeni-sube?ustId=${ustId}`)} />
      ) : null}

      <Liste
        veri={birimler}
        hata={hata ?? ustHatasi}
        onYenile={yenile}
        anahtar={(b) => b.id}
        bosIkon="business-outline"
        bosBaslik={`Henüz ${ad} yok`}
        bosAciklama={`Sağ üstteki + ile ilk ${ad} kaydını ekleyin.`}
        sutunlar={[
          { anahtar: 'ad', baslik: 'Ad', icerik: (b) => b.ad },
          {
            anahtar: 'duzenle',
            baslik: '',
            genislik: 56,
            hizalama: 'sag',
            icerik: (b) => <IkonButon ikon="create-outline" etiket="Düzenle" onPress={() => router.push(`/sube-duzenle/${b.id}`)} />,
          },
        ]}
        onSatirPress={(b) => router.push(`/sube/${b.id}`)}
        satir={(b) => (
          <ListeSatiri
            baslik={b.ad}
            sol={<Ikon ad="business-outline" boyut={26} renk={tema.renkler.anaParlak} />}
            onPress={() => router.push(`/sube/${b.id}`)}
            sag={<IkonButon ikon="create-outline" etiket="Düzenle" onPress={() => router.push(`/sube-duzenle/${b.id}`)} />}
          />
        )}
      />
    </Ekran>
  );
}
