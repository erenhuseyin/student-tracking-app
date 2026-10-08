// Erişim: yalnızca veli
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { Avatar } from '@/components/Avatar';
import { DurumRozeti } from '@/components/DurumRozeti';
import { Ekran } from '@/components/Ekran';
import { Liste } from '@/components/Liste';
import { ListeSatiri } from '@/components/ListeSatiri';
import { type OgrenciYoklamaSatiri, veliCocuklariniBugunkuYoklamaylaGetir } from '@/lib/yoklama';

export default function VeliAnaSayfa() {
  const router = useRouter();
  const [cocuklar, setCocuklar] = useState<OgrenciYoklamaSatiri[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setHata(null);
      // RLS (ogrenci_veli_oku politikası) yalnızca velinin bağlı olduğu öğrencileri döndürür.
      veliCocuklariniBugunkuYoklamaylaGetir()
        .then(setCocuklar)
        .catch((e: Error) => setHata(e.message));
    }, []),
  );

  return (
    <Ekran>
      <Liste
        veri={cocuklar}
        hata={hata}
        anahtar={(o) => o.id}
        bosIkon="people-outline"
        bosBaslik="Bağlı bir çocuk bulunamadı"
        bosAciklama="Lütfen kurumunuzun yöneticisiyle iletişime geçin."
        satir={(o) => (
          <ListeSatiri
            buyuk
            baslik={o.ad_soyad}
            altBaslik="Bugün"
            sol={<Avatar ad={o.ad_soyad} boyut={48} />}
            sag={<DurumRozeti durum={o.yoklama_durumu} />}
            onPress={() => router.push(`/cocuk/${o.id}`)}
          />
        )}
      />
    </Ekran>
  );
}
