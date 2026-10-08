// Erişim: yalnızca kök kurumun (müşterinin) kurum_admin'i (RLS: şube admini kendi şubesinin adını
// değiştiremez, şube silemez). Şubenin adını değiştirir ya da şubeyi siler.
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { Girdi } from '@/components/Girdi';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { OnayButonu } from '@/components/OnayButonu';
import { Yukleniyor } from '@/components/Yukleniyor';
import { kurumGetir, subeAdiniGuncelle, subeSil } from '@/lib/kurumlar';
import { useTema } from '@/lib/tema';
import { useToast } from '@/lib/toast';

const mesajaCevir = (e: unknown) => (e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');

export default function SubeDuzenle() {
  const router = useRouter();
  const tema = useTema();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ad, setAd] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    let iptalEdildi = false;
    kurumGetir(id)
      .then((sube) => {
        if (!iptalEdildi) setAd(sube.ad);
      })
      .catch((e) => {
        if (!iptalEdildi) setHata(mesajaCevir(e));
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
      await subeAdiniGuncelle(id, ad);
      toast('Şube kaydedildi');
      router.back();
    } catch (e) {
      setHata(mesajaCevir(e));
    } finally {
      setGonderiliyor(false);
    }
  };

  const sil = async () => {
    setHata(null);
    try {
      await subeSil(id);
      toast('Şube silindi');
      router.back();
    } catch (e) {
      setHata(mesajaCevir(e));
    }
  };

  return (
    <Ekran kaydirilabilir>
      <Stack.Screen options={{ title: 'Şubeyi Düzenle' }} />

      {yukleniyor ? (
        <Yukleniyor />
      ) : (
        <Kart>
          <Girdi etiket="Şube adı" value={ad} onChangeText={setAd} editable={!gonderiliyor} onSubmitEditing={kaydet} />
          <HataMesaji mesaj={hata} />
          <Buton baslik="Kaydet" onPress={kaydet} yukleniyor={gonderiliyor} />
          <Text style={tema.yazi.kucuk}>Sınıfı, öğrencisi ya da personeli olan şube silinemez; önce onlar kaldırılmalı.</Text>
          <OnayButonu etiket="Şubeyi Sil" onOnay={sil} />
        </Kart>
      )}
    </Ekran>
  );
}
