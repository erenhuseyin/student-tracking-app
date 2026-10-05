// Erişim: yalnızca super_admin. Bir kurumun personelini görür ve yönetici davet eder.
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Ekran } from '@/components/Ekran';
import { PersonelListesi } from '@/components/PersonelListesi';
import { kurumGetir } from '@/lib/kurumlar';

export default function KurumDetay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ad, setAd] = useState<string | null>(null);

  useEffect(() => {
    let iptalEdildi = false;
    kurumGetir(id)
      .then((kurum) => {
        if (!iptalEdildi) setAd(kurum.ad);
      })
      .catch(() => {
        // Başlık varsayılanda kalır; liste kendi hatasını gösterir.
      });
    return () => {
      iptalEdildi = true;
    };
  }, [id]);

  return (
    <Ekran>
      <Stack.Screen options={{ title: ad ?? 'Kurum' }} />
      <PersonelListesi kurumId={id} />
    </Ekran>
  );
}
