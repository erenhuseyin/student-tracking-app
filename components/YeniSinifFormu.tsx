// Yeni sınıf formu: ad, dönem ve (içerik takibi açıksa) kademe. Kaydı çağıran ekran yapar:
// yönetici `sinifEkle` ile seçtiği birime, öğretmen `ogretmenSinifAc` ile kendi birimine açar.
import { useState } from 'react';

import { Buton } from '@/components/Buton';
import { Girdi } from '@/components/Girdi';
import { HataMesaji } from '@/components/HataMesaji';
import { KademeSecimi } from '@/components/KademeSecimi';
import { Kart } from '@/components/Kart';

type Props = {
  onKaydet: (ad: string, donem: string, kademeId: string | null) => Promise<void>;
};

export function YeniSinifFormu({ onKaydet }: Props) {
  const [ad, setAd] = useState('');
  const [donem, setDonem] = useState('');
  const [kademeId, setKademeId] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const kaydet = async () => {
    setGonderiliyor(true);
    setHata(null);
    try {
      await onKaydet(ad, donem, kademeId);
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');
    } finally {
      setGonderiliyor(false);
    }
  };

  return (
    <Kart>
      <Girdi etiket="Sınıf adı" placeholder="örn. 3-A" value={ad} onChangeText={setAd} editable={!gonderiliyor} autoFocus />
      <Girdi
        etiket="Dönem"
        placeholder="örn. 2026-2027"
        value={donem}
        onChangeText={setDonem}
        editable={!gonderiliyor}
        onSubmitEditing={kaydet}
      />
      <KademeSecimi secili={kademeId} onSec={setKademeId} pasif={gonderiliyor} />
      <HataMesaji mesaj={hata} />
      <Buton baslik="Kaydet" onPress={kaydet} yukleniyor={gonderiliyor} />
    </Kart>
  );
}
