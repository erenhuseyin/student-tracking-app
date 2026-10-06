// Erişim: yalnızca ogretmen (atandığı sınıf; RLS başka sınıf için yazmayı reddeder).
// Sınıfın haftalık ders günleri. Değişiklik bu haftadan itibaren geçerlidir.
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { GunSecici } from '@/components/GunSecici';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { Yukleniyor } from '@/components/Yukleniyor';
import { dersGunleriniKaydet, dersPlanlariniGetir } from '@/lib/dersPlani';
import { haftaninPlani } from '@/lib/katilim';
import { sinifGetir } from '@/lib/siniflar';
import { bugununTarihi, haftaBaslangici } from '@/lib/tarih';
import { yazi } from '@/lib/tema';
import type { Sinif } from '@/lib/tipler';

export default function DersGunleri() {
  const router = useRouter();
  const { sinifId } = useLocalSearchParams<{ sinifId: string }>();
  const [sinif, setSinif] = useState<Sinif | null>(null);
  const [gunler, setGunler] = useState<number[]>([]);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([sinifGetir(sinifId), dersPlanlariniGetir(sinifId)])
      .then(([s, planlar]) => {
        setSinif(s);
        setGunler(haftaninPlani(planlar, haftaBaslangici(bugununTarihi())) ?? []);
      })
      .catch((e: Error) => setHata(e.message));
  }, [sinifId]);

  const kaydet = async () => {
    if (!sinif) return;
    setGonderiliyor(true);
    setHata(null);
    try {
      await dersGunleriniKaydet(sinif.kurum_id, sinif.id, gunler);
      router.back();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');
      setGonderiliyor(false);
    }
  };

  return (
    <Ekran kaydirilabilir>
      <Stack.Screen options={{ title: sinif ? `${sinif.ad} · Ders Günleri` : 'Ders Günleri' }} />

      {sinif ? (
        <Kart>
          <GunSecici etiket="Bu sınıfın ders yaptığı günler" secililer={gunler} onDegis={setGunler} pasif={gonderiliyor} />
          <Text style={yazi.govde}>
            {gunler.length === 0 ? 'Henüz gün seçilmedi.' : `Haftada ${gunler.length} ders.`}
          </Text>
          <Text style={yazi.kucuk}>
            Değişiklik bu haftadan itibaren geçerlidir; önceki haftaların tablosu ve katılım oranı değişmez.
          </Text>
          <HataMesaji mesaj={hata} />
          <Buton baslik="Kaydet" onPress={kaydet} yukleniyor={gonderiliyor} />
        </Kart>
      ) : hata ? (
        <HataMesaji mesaj={hata} />
      ) : (
        <Yukleniyor />
      )}
    </Ekran>
  );
}
