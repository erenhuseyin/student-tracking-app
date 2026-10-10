// Erişim: yalnızca kurum_admin
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Buton } from '@/components/Buton';
import { Chip } from '@/components/Chip';
import { Ekran } from '@/components/Ekran';
import { Girdi } from '@/components/Girdi';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { OnayButonu } from '@/components/OnayButonu';
import { Yukleniyor } from '@/components/Yukleniyor';
import { ICERIK_OZELLIGI, kademeleriGetir, sinifKademesiniAyarla } from '@/lib/icerik';
import { useOzellik } from '@/lib/ozellikler';
import { sinifGetir, sinifGuncelle, sinifSil } from '@/lib/siniflar';
import { useTema } from '@/lib/tema';
import type { Kademe } from '@/lib/tipler';
import { useToast } from '@/lib/toast';

export default function SinifDuzenle() {
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ad, setAd] = useState('');
  const [donem, setDonem] = useState('');
  const tema = useTema();
  const icerikAcik = useOzellik(ICERIK_OZELLIGI);
  const [kademeler, setKademeler] = useState<Kademe[]>([]);
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

  useEffect(() => {
    if (!icerikAcik) return;
    kademeleriGetir()
      .then(setKademeler)
      .catch(() => {});
  }, [icerikAcik]);

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
          {icerikAcik && kademeler.length > 0 ? (
            <View style={{ gap: tema.bosluk.xs }}>
              <Text style={tema.yazi.etiket}>Kademe (sınıfın izlediği müfredat)</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tema.bosluk.s }}>
                <Chip etiket="Yok" secili={kademeId === null} onPress={() => kademeSec(null)} />
                {kademeler.map((k) => (
                  <Chip key={k.id} etiket={k.ad} secili={kademeId === k.id} onPress={() => kademeSec(k.id)} />
                ))}
              </View>
            </View>
          ) : null}
          <OnayButonu etiket="Sınıfı Sil" onOnay={sil} />
        </Kart>
      )}
    </Ekran>
  );
}
