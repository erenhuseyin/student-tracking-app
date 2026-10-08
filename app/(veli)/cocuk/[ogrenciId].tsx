// Erişim: yalnızca veli. Çocuğun gelişim kayıtları ve yoklama geçmişi (ikisi de salt okunur).
// Kurumun veliler için kapattığı bölüm gösterilmez (bkz. lib/menu.ts > useBolumAcik).
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { BosDurum } from '@/components/BosDurum';
import { Ekran } from '@/components/Ekran';
import { GelisimZamanCizelgesi } from '@/components/GelisimZamanCizelgesi';
import { Secenekler } from '@/components/Secenekler';
import { YoklamaGecmisi } from '@/components/YoklamaGecmisi';
import { useBolumAcik } from '@/lib/menu';
import { ogrenciGetir } from '@/lib/ogrenciler';

type Gorunum = 'gelisim' | 'yoklama';

const GORUNUMLER: { deger: Gorunum; etiket: string }[] = [
  { deger: 'gelisim', etiket: 'Gelişim' },
  { deger: 'yoklama', etiket: 'Yoklama' },
];

export default function VeliCocukDetayi() {
  const { ogrenciId } = useLocalSearchParams<{ ogrenciId: string }>();
  const [baslik, setBaslik] = useState('Çocuğum');
  const [secilen, setSecilen] = useState<Gorunum>('gelisim');
  const gelisimAcik = useBolumAcik('gelisim');
  const yoklamaAcik = useBolumAcik('yoklama');
  const gorunumler = GORUNUMLER.filter((g) => (g.deger === 'gelisim' ? gelisimAcik : yoklamaAcik));
  const gorunum = gorunumler.some((g) => g.deger === secilen) ? secilen : gorunumler[0]?.deger;

  useEffect(() => {
    // Yalnızca başlık için; okunamazsa varsayılan başlık kalır, listeler kendi hatasını gösterir.
    ogrenciGetir(ogrenciId)
      .then((o) => setBaslik(o.ad_soyad))
      .catch(() => {});
  }, [ogrenciId]);

  return (
    <Ekran>
      <Stack.Screen options={{ title: baslik }} />

      {gorunumler.length > 1 && gorunum ? (
        <Secenekler secenekler={gorunumler} secili={gorunum} onSec={setSecilen} />
      ) : null}
      {gorunum === 'gelisim' ? <GelisimZamanCizelgesi ogrenciId={ogrenciId} /> : null}
      {gorunum === 'yoklama' ? <YoklamaGecmisi ogrenciId={ogrenciId} /> : null}
      {gorunum ? null : (
        <BosDurum
          ikon="eye-off-outline"
          baslik="Gösterilecek bölüm yok"
          aciklama="Kurumunuz bu bilgileri uygulamada paylaşmıyor. Lütfen kurumunuzla iletişime geçin."
        />
      )}
    </Ekran>
  );
}
