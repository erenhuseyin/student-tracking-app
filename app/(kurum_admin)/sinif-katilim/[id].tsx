// Erişim: yalnızca kurum_admin. Sınıfın haftalık yoklama tablosu ve katılım oranları (salt okunur;
// yoklamayı ve ders günlerini öğretmen girer).
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Ekran } from '@/components/Ekran';
import { SinifKatilimi } from '@/components/SinifKatilimi';
import { sinifGetir } from '@/lib/siniflar';

export default function SinifKatilimEkrani() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [baslik, setBaslik] = useState('Katılım');

  useEffect(() => {
    // Yalnızca başlık için; okunamazsa varsayılan başlık kalır, gövde kendi hatasını gösterir.
    sinifGetir(id)
      .then((s) => setBaslik(`${s.ad} · Katılım`))
      .catch(() => {});
  }, [id]);

  return (
    <Ekran>
      <Stack.Screen options={{ title: baslik }} />

      <SinifKatilimi sinifId={id} />
    </Ekran>
  );
}
