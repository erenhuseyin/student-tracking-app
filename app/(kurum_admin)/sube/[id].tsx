// Erişim: yalnızca kök kurumun kurum_admin'i (RLS: şube admini başka şubeyi okuyamaz).
// Kök admin bir şubenin sınıflarını burada yönetir; şubenin yöneticisini ve öğretmenlerini
// "Şube Personeli"nden ekler.
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { HataMesaji } from '@/components/HataMesaji';
import { SinifListesi } from '@/components/SinifListesi';
import { kurumGetir } from '@/lib/kurumlar';

export default function SubeDetay() {
  const router = useRouter();
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
      <Buton
        tur="ikincil"
        ikon="people-outline"
        baslik="Şube Personeli"
        onPress={() => router.push(`/sube-personel/${id}`)}
      />
    </Ekran>
  );
}
