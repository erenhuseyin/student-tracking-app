// Erişim: yalnızca kök kurumun (müşterinin) kurum_admin'i; şube admini salt okunur görür (RLS).
// Kademeler (müfredatlar) müşteri düzeyindedir ve şubeler ortak kullanır. Her sınıf bir kademeyi
// izler; dersler ve konular kademenin kendi ekranında tanımlanır. Ezber listesi müşteri
// düzeyinde ortaktır (/ezber-listesi); kademeye özel ek maddeler kademe ekranından girilir.
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { Girdi } from '@/components/Girdi';
import { Ikon } from '@/components/Ikon';
import { Kart } from '@/components/Kart';
import { Liste } from '@/components/Liste';
import { ListeSatiri } from '@/components/ListeSatiri';
import { kademeEkle, kademeleriGetir } from '@/lib/icerik';
import { useOturum } from '@/lib/oturum';
import { useTema } from '@/lib/tema';
import { useToast } from '@/lib/toast';
import type { Kademe } from '@/lib/tipler';

export default function Kademeler() {
  const router = useRouter();
  const tema = useTema();
  const toast = useToast();
  const { kurum } = useOturum();
  const kokKurumMu = kurum !== null && kurum.ust_kurum_id === null;
  const [kademeler, setKademeler] = useState<Kademe[] | null>(null);
  const [ad, setAd] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const yenile = useCallback(async () => {
    try {
      setKademeler(await kademeleriGetir());
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setHata(null);
      yenile();
    }, [yenile]),
  );

  const ekle = async () => {
    if (!kurum) return;
    setGonderiliyor(true);
    setHata(null);
    try {
      await kademeEkle(kurum.id, ad);
      setAd('');
      toast('Kademe eklendi');
      await yenile();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
    } finally {
      setGonderiliyor(false);
    }
  };

  return (
    <Ekran>
      <Stack.Screen options={{ title: 'Kademeler' }} />
      {kokKurumMu ? (
        <Kart>
          <Girdi etiket="Yeni kademe (örn. Kademe I)" value={ad} onChangeText={setAd} editable={!gonderiliyor} maxLength={60} />
          <Buton ikon="add" baslik="Ekle" onPress={ekle} yukleniyor={gonderiliyor} />
        </Kart>
      ) : null}
      <ListeSatiri
        baslik="Ortak ezber listesi"
        altBaslik="Tüm kademelerde kullanılan dualar ve sureler"
        sol={<Ikon ad="list-outline" boyut={24} renk={tema.renkler.anaParlak} />}
        onPress={() => router.push('/ezber-listesi')}
      />
      <Liste
        veri={kademeler}
        hata={hata}
        onYenile={yenile}
        anahtar={(k) => k.id}
        bosIkon="layers-outline"
        bosBaslik="Henüz kademe yok"
        bosAciklama="Kademe, bir sınıfın izlediği müfredattır: dersleri ve konuları vardır."
        satir={(k) => (
          <ListeSatiri
            baslik={k.ad}
            sol={<Ikon ad="layers-outline" boyut={24} renk={tema.renkler.anaParlak} />}
            onPress={() => router.push(`/kademe/${k.id}`)}
          />
        )}
      />
    </Ekran>
  );
}
