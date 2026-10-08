// Erişim: yalnızca kök kurumun (müşterinin) kurum_admin'i. Şube admini bu sekmeyi görmez
// (lib/menu.ts); adresle açsa bile RLS ona şube göstermez ve şube eklemesine izin vermez.
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { BaslikEkleButonu } from '@/components/BaslikEkleButonu';
import { Ekran } from '@/components/Ekran';
import { Ikon } from '@/components/Ikon';
import { Liste } from '@/components/Liste';
import { ListeSatiri } from '@/components/ListeSatiri';
import { IkonButon } from '@/components/IkonButon';
import { subeleriGetir } from '@/lib/kurumlar';
import { useOturum } from '@/lib/oturum';
import { useTema } from '@/lib/tema';
import type { Kurum } from '@/lib/tipler';

export default function Subeler() {
  const router = useRouter();
  const tema = useTema();
  const { kurum } = useOturum();
  const [subeler, setSubeler] = useState<Kurum[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const kurumId = kurum?.id;

  const yenile = useCallback(async () => {
    if (!kurumId) return;
    setHata(null);
    try {
      setSubeler(await subeleriGetir(kurumId));
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
    }
  }, [kurumId]);

  useFocusEffect(
    useCallback(() => {
      yenile();
    }, [yenile]),
  );

  return (
    <Ekran>
      <BaslikEkleButonu etiket="Yeni şube ekle" onPress={() => router.push('/yeni-sube')} />

      <Liste
        veri={subeler}
        hata={hata}
        onYenile={yenile}
        anahtar={(s) => s.id}
        bosIkon="business-outline"
        bosBaslik="Henüz şube yok"
        bosAciklama="Sağ üstteki + ile ilk şubeyi ekleyin."
        satir={(s) => (
          <ListeSatiri
            baslik={s.ad}
            sol={<Ikon ad="business-outline" boyut={26} renk={tema.renkler.anaParlak} />}
            onPress={() => router.push(`/sube/${s.id}`)}
            sag={<IkonButon ikon="create-outline" etiket="Düzenle" onPress={() => router.push(`/sube-duzenle/${s.id}`)} />}
          />
        )}
      />
    </Ekran>
  );
}
