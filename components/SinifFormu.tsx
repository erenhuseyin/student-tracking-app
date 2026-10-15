// Sınıf düzenleme formu: ad, dönem, kademe ve (yalnızca yönetici) silme.
// Erişim: kurum_admin (yönettiği kurumların sınıfları) ve öğretmen (atandığı sınıflar, ogretmen_kayit
// bayrağı açıksa; silemez). Yetkiyi RLS belirler; `silinebilir` yalnızca düğmeyi gösterir.
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { Buton } from '@/components/Buton';
import { Girdi } from '@/components/Girdi';
import { HataMesaji } from '@/components/HataMesaji';
import { KademeSecimi } from '@/components/KademeSecimi';
import { Kart } from '@/components/Kart';
import { OnayButonu } from '@/components/OnayButonu';
import { Yukleniyor } from '@/components/Yukleniyor';
import { sinifKademesiniAyarla } from '@/lib/icerik';
import { sinifGetir, sinifGuncelle, sinifSil } from '@/lib/siniflar';
import { useToast } from '@/lib/toast';

type Props = {
  id: string;
  silinebilir: boolean;
  // Verilmezse kaydetme ve silmeden sonra önceki ekrana dönülür.
  onDegisti?: () => void;
  onSilindi?: () => void;
};

export function SinifFormu({ id, silinebilir, onDegisti, onSilindi }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [ad, setAd] = useState('');
  const [donem, setDonem] = useState('');
  const [kademeId, setKademeId] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    let iptalEdildi = false;
    sinifGetir(id)
      .then((s) => {
        if (iptalEdildi) return;
        setAd(s.ad);
        setDonem(s.donem);
        setKademeId(s.kademe_id);
      })
      .catch((e: Error) => {
        if (!iptalEdildi) setHata(e.message);
      })
      .finally(() => {
        if (!iptalEdildi) setYukleniyor(false);
      });
    return () => {
      iptalEdildi = true;
    };
  }, [id]);

  const kademeSec = async (yeni: string | null) => {
    setHata(null);
    try {
      await sinifKademesiniAyarla(id, yeni);
      setKademeId(yeni);
      toast('Kademe kaydedildi');
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');
    }
  };

  const kaydet = async () => {
    setGonderiliyor(true);
    setHata(null);
    try {
      await sinifGuncelle(id, ad, donem);
      toast('Sınıf kaydedildi');
      if (onDegisti) onDegisti();
      else router.back();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');
    } finally {
      setGonderiliyor(false);
    }
  };

  const sil = async () => {
    setHata(null);
    try {
      await sinifSil(id);
      toast('Sınıf silindi');
      if (onSilindi) onSilindi();
      else router.back();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');
    }
  };

  if (yukleniyor) return <Yukleniyor />;

  return (
    <Kart>
      <Girdi etiket="Sınıf adı" value={ad} onChangeText={setAd} editable={!gonderiliyor} />
      <Girdi etiket="Dönem" value={donem} onChangeText={setDonem} editable={!gonderiliyor} onSubmitEditing={kaydet} />
      <HataMesaji mesaj={hata} />
      <Buton baslik="Kaydet" onPress={kaydet} yukleniyor={gonderiliyor} />
      <KademeSecimi secili={kademeId} onSec={kademeSec} />
      {silinebilir ? <OnayButonu etiket="Sınıfı Sil" onOnay={sil} /> : null}
    </Kart>
  );
}
