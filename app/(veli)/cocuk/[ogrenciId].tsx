// Erişim: yalnızca veli. Çocuğun gelişim kayıtları ve yoklama geçmişi (ikisi de salt okunur).
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Ekran } from '@/components/Ekran';
import { GelisimZamanCizelgesi } from '@/components/GelisimZamanCizelgesi';
import { Secenekler } from '@/components/Secenekler';
import { YoklamaGecmisi } from '@/components/YoklamaGecmisi';
import { ogrenciGetir } from '@/lib/ogrenciler';

type Gorunum = 'gelisim' | 'yoklama';

const GORUNUMLER: { deger: Gorunum; etiket: string }[] = [
  { deger: 'gelisim', etiket: 'Gelişim' },
  { deger: 'yoklama', etiket: 'Yoklama' },
];

export default function VeliCocukDetayi() {
  const { ogrenciId } = useLocalSearchParams<{ ogrenciId: string }>();
  const [baslik, setBaslik] = useState('Çocuğum');
  const [gorunum, setGorunum] = useState<Gorunum>('gelisim');

  useEffect(() => {
    // Yalnızca başlık için; okunamazsa varsayılan başlık kalır, listeler kendi hatasını gösterir.
    ogrenciGetir(ogrenciId)
      .then((o) => setBaslik(o.ad_soyad))
      .catch(() => {});
  }, [ogrenciId]);

  return (
    <Ekran>
      <Stack.Screen options={{ title: baslik }} />

      <Secenekler secenekler={GORUNUMLER} secili={gorunum} onSec={setGorunum} />
      {gorunum === 'gelisim' ? <GelisimZamanCizelgesi ogrenciId={ogrenciId} /> : <YoklamaGecmisi ogrenciId={ogrenciId} />}
    </Ekran>
  );
}
