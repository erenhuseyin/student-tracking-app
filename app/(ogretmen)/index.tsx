// Erişim: yalnızca ogretmen
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { CikisYapButonu } from '@/components/CikisYapButonu';
import { Ekran } from '@/components/Ekran';
import { Ikon } from '@/components/Ikon';
import { Liste } from '@/components/Liste';
import { ListeSatiri } from '@/components/ListeSatiri';
import { siniflariGetir } from '@/lib/siniflar';
import { renkler } from '@/lib/tema';
import type { Sinif } from '@/lib/tipler';

export default function OgretmenAnaSayfa() {
  const router = useRouter();
  const [siniflar, setSiniflar] = useState<Sinif[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setHata(null);
      // RLS (sinif_ogretmen_oku politikası) yalnızca öğretmenin atandığı sınıfları döndürür.
      siniflariGetir()
        .then(setSiniflar)
        .catch((e: Error) => setHata(e.message));
    }, []),
  );

  return (
    <Ekran>
      <Stack.Screen options={{ title: 'Sınıflarım', headerRight: () => <CikisYapButonu /> }} />

      <Liste
        veri={siniflar}
        hata={hata}
        anahtar={(s) => s.id}
        bosIkon="school-outline"
        bosBaslik="Henüz size atanmış sınıf yok"
        satir={(s) => (
          <ListeSatiri
            baslik={s.ad}
            altBaslik={`${s.donem} · Yoklama al`}
            sol={<Ikon ad="school-outline" boyut={26} renk={renkler.ana} />}
            onPress={() => router.push(`/yoklama/${s.id}`)}
          />
        )}
      />
    </Ekran>
  );
}
