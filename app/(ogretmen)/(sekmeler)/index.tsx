// Erişim: yalnızca ogretmen. Müşteride ogretmen_kayit açıksa (varsayılan) buradan sınıf da açar.
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { BaslikEkleButonu } from '@/components/BaslikEkleButonu';
import { Ekran } from '@/components/Ekran';
import { Ikon } from '@/components/Ikon';
import { Liste } from '@/components/Liste';
import { ListeSatiri } from '@/components/ListeSatiri';
import { OGRETMEN_KAYIT_OZELLIGI, useOzellik } from '@/lib/ozellikler';
import { siniflariGetir } from '@/lib/siniflar';
import { useTema } from '@/lib/tema';
import type { Sinif } from '@/lib/tipler';

export default function OgretmenAnaSayfa() {
  const router = useRouter();
  const tema = useTema();
  const [siniflar, setSiniflar] = useState<Sinif[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const kayitAcik = useOzellik(OGRETMEN_KAYIT_OZELLIGI, true);

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
      {kayitAcik ? <BaslikEkleButonu etiket="Yeni sınıf" onPress={() => router.push('/yeni-sinif')} /> : null}
      <Liste
        veri={siniflar}
        hata={hata}
        anahtar={(s) => s.id}
        bosIkon="school-outline"
        bosBaslik="Henüz size atanmış sınıf yok"
        bosAciklama={kayitAcik ? 'Sağ üstteki düğmeyle kendi sınıfınızı açabilirsiniz.' : undefined}
        sutunlar={[
          { anahtar: 'ad', baslik: 'Sınıf', icerik: (s) => s.ad },
          { anahtar: 'donem', baslik: 'Dönem', icerik: (s) => s.donem },
        ]}
        onSatirPress={(s) => router.push(`/sinifim/${s.id}`)}
        satir={(s) => (
          <ListeSatiri
            baslik={s.ad}
            altBaslik={`${s.donem} · Yoklama ve gelişim`}
            sol={<Ikon ad="school-outline" boyut={26} renk={tema.renkler.anaParlak} />}
            onPress={() => router.push(`/sinifim/${s.id}`)}
          />
        )}
      />
    </Ekran>
  );
}
