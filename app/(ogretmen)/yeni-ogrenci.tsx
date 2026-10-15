// Erişim: yalnızca ogretmen (ogretmen_kayit bayrağı açıksa). Öğrenci öğretmenin atandığı bir sınıfa
// eklenir (RLS: ogrenci_ogretmen_ekle); kayıtla birlikte veli girişi açılır.
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { Ekran } from '@/components/Ekran';
import { HataMesaji } from '@/components/HataMesaji';
import { YeniOgrenciFormu } from '@/components/YeniOgrenciFormu';
import { Yukleniyor } from '@/components/Yukleniyor';
import { siniflariGetir } from '@/lib/siniflar';
import type { Sinif } from '@/lib/tipler';

export default function YeniOgrenci() {
  const router = useRouter();
  const { sinifId } = useLocalSearchParams<{ sinifId?: string }>();
  const [siniflar, setSiniflar] = useState<Sinif[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      // RLS yalnızca öğretmenin atandığı sınıfları döndürür.
      siniflariGetir()
        .then(setSiniflar)
        .catch((e: Error) => setHata(e.message));
    }, []),
  );

  return (
    <Ekran kaydirilabilir>
      <Stack.Screen options={{ title: 'Yeni Öğrenci' }} />
      <HataMesaji mesaj={hata} />
      {siniflar === null ? (
        hata ? null : <Yukleniyor />
      ) : (
        <YeniOgrenciFormu
          siniflar={siniflar}
          sinifEtiketi={(s) => `${s.ad} · ${s.donem}`}
          varsayilanSinifId={sinifId ?? (siniflar.length === 1 ? siniflar[0].id : null)}
          onEklendi={() => router.back()}
        />
      )}
    </Ekran>
  );
}
