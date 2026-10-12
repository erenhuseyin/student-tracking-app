// Erişim: kurum_admin, yalnızca kendi altındaki birimler için (RLS: yönetici kendi biriminin adını
// değiştiremez, kendi birimini silemez). Birimin adını değiştirir ya da birimi siler.
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { Girdi } from '@/components/Girdi';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { OnayButonu } from '@/components/OnayButonu';
import { Secim } from '@/components/Secim';
import { IL_SECENEKLERI } from '@/lib/iller';
import { Yukleniyor } from '@/components/Yukleniyor';
import { altKurumSil, kurumAdiniGuncelle, kurumGetir } from '@/lib/kurumlar';
import { seviyeAdi } from '@/lib/seviye';
import { useTema } from '@/lib/tema';
import { useToast } from '@/lib/toast';

const mesajaCevir = (e: unknown) => (e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');

export default function SubeDuzenle() {
  const router = useRouter();
  const tema = useTema();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ad, setAd] = useState('');
  const [seviye, setSeviye] = useState('Birim');
  const [il, setIl] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    let iptalEdildi = false;
    kurumGetir(id)
      .then((sube) => {
        if (iptalEdildi) return;
        setAd(sube.ad);
        setSeviye(seviyeAdi(sube.seviye));
        setIl(sube.il_kodu ? String(sube.il_kodu) : null);
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
      await kurumAdiniGuncelle(id, ad, il ? Number(il) : null);
      toast(`${seviye} kaydedildi`);
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
      await altKurumSil(id);
      toast(`${seviye} silindi`);
      router.back();
    } catch (e) {
      setHata(mesajaCevir(e));
    }
  };

  return (
    <Ekran kaydirilabilir>
      <Stack.Screen options={{ title: yukleniyor ? '' : `${seviye} Düzenle` }} />

      {yukleniyor ? (
        <Yukleniyor />
      ) : (
        <Kart>
          <Girdi etiket={`${seviye} adı`} value={ad} onChangeText={setAd} editable={!gonderiliyor} onSubmitEditing={kaydet} />
          <Secim
            etiket="İl (isteğe bağlı)"
            secenekler={IL_SECENEKLERI}
            secili={il}
            onSec={setIl}
            bosEtiket="Üst birimin ili"
            pasif={gonderiliyor}
          />
          <Text style={tema.yazi.kucuk}>İl, panodaki haritada kullanılır; altındaki birimler için de geçerlidir.</Text>
          <HataMesaji mesaj={hata} />
          <Buton baslik="Kaydet" onPress={kaydet} yukleniyor={gonderiliyor} />
          <Text style={tema.yazi.kucuk}>Alt birimi, sınıfı, öğrencisi ya da personeli olan birim silinemez; önce onlar kaldırılmalı.</Text>
          <OnayButonu etiket="Sil" onOnay={sil} />
        </Kart>
      )}
    </Ekran>
  );
}
