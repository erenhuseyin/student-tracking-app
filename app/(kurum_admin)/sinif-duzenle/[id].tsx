// Erişim: yalnızca kurum_admin
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { Girdi } from '@/components/Girdi';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { OnayButonu } from '@/components/OnayButonu';
import { Yukleniyor } from '@/components/Yukleniyor';
import { sinifGetir, sinifGuncelle, sinifSil } from '@/lib/siniflar';
import { useToast } from '@/lib/toast';

export default function SinifDuzenle() {
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ad, setAd] = useState('');
  const [donem, setDonem] = useState('');
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

  const kaydet = async () => {
    setGonderiliyor(true);
    setHata(null);
    try {
      await sinifGuncelle(id, ad, donem);
      toast('Sınıf kaydedildi');
      router.back();
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
      router.back();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');
    }
  };

  return (
    <Ekran kaydirilabilir>
      <Stack.Screen options={{ title: 'Sınıfı Düzenle' }} />

      {yukleniyor ? (
        <Yukleniyor />
      ) : (
        <Kart>
          <Girdi etiket="Sınıf adı" value={ad} onChangeText={setAd} editable={!gonderiliyor} />
          <Girdi etiket="Dönem" value={donem} onChangeText={setDonem} editable={!gonderiliyor} onSubmitEditing={kaydet} />
          <HataMesaji mesaj={hata} />
          <Buton baslik="Kaydet" onPress={kaydet} yukleniyor={gonderiliyor} />
          <OnayButonu etiket="Sınıfı Sil" onOnay={sil} />
        </Kart>
      )}
    </Ekran>
  );
}
