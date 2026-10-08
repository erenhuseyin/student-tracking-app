// Bir sınıfın düzenlenebilir ders programı ekranı (kurum admini ve sınıfın öğretmeni).
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';

import { Ekran } from '@/components/Ekran';
import { SinifProgrami } from '@/components/SinifProgrami';
import { sinifGetir } from '@/lib/siniflar';

export function SinifProgramiEkrani({ sinifId }: { sinifId: string }) {
  const [baslik, setBaslik] = useState('Ders Programı');

  useEffect(() => {
    // Yalnızca başlık için; okunamazsa varsayılan başlık kalır, program kendi hatasını gösterir.
    sinifGetir(sinifId)
      .then((s) => setBaslik(`${s.ad} · Ders Programı`))
      .catch(() => {});
  }, [sinifId]);

  return (
    <Ekran>
      <Stack.Screen options={{ title: baslik }} />
      <SinifProgrami sinifId={sinifId} duzenlenebilir />
    </Ekran>
  );
}
