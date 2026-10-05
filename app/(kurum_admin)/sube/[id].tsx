// Erişim: yalnızca kök kurumun kurum_admin'i (RLS: şube admini başka şubeyi okuyamaz).
// Kök admin bir şubenin sınıflarını burada yönetir.
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Ekran } from '@/components/Ekran';
import { HataMesaji } from '@/components/HataMesaji';
import { SinifListesi } from '@/components/SinifListesi';
import { kurumGetir } from '@/lib/kurumlar';

export default function SubeDetay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ad, setAd] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    let iptalEdildi = false;
    kurumGetir(id)
      .then((sube) => {
        if (!iptalEdildi) setAd(sube.ad);
      })
      .catch((e: Error) => {
        if (!iptalEdildi) setHata(e.message);
      });
    return () => {
      iptalEdildi = true;
    };
  }, [id]);

  return (
    <Ekran>
      <Stack.Screen options={{ title: ad ?? 'Şube' }} />
      {hata ? <HataMesaji mesaj={hata} /> : <SinifListesi kurumId={id} />}
    </Ekran>
  );
}
