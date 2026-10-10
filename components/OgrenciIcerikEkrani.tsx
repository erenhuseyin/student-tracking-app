// Bir öğrencinin ezber ya da kitap ekranı (sınıfın öğretmeni ve kurum admini; düzenlenebilir).
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';

import { Ekran } from '@/components/Ekran';
import { OgrenciEzber } from '@/components/OgrenciEzber';
import { OgrenciKitaplari } from '@/components/OgrenciKitaplari';
import { ogrenciGetir } from '@/lib/ogrenciler';

export function OgrenciIcerikEkrani({ ogrenciId, tur }: { ogrenciId: string; tur: 'ezber' | 'kitap' }) {
  const [ad, setAd] = useState<string | null>(null);

  useEffect(() => {
    // Yalnızca başlık için; okunamazsa varsayılan başlık kalır.
    ogrenciGetir(ogrenciId)
      .then((o) => setAd(o.ad_soyad))
      .catch(() => {});
  }, [ogrenciId]);

  const konu = tur === 'ezber' ? 'Ezber' : 'Kitaplar';
  return (
    <Ekran>
      <Stack.Screen options={{ title: ad ? `${ad} · ${konu}` : konu }} />
      {tur === 'ezber' ? <OgrenciEzber ogrenciId={ogrenciId} duzenlenebilir /> : <OgrenciKitaplari ogrenciId={ogrenciId} duzenlenebilir />}
    </Ekran>
  );
}
