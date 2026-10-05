// Erişim: yalnızca ogretmen
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { Ekran } from '@/components/Ekran';
import { GelisimKaydiFormu } from '@/components/GelisimKaydiFormu';
import { HataMesaji } from '@/components/HataMesaji';
import { Yukleniyor } from '@/components/Yukleniyor';
import { gelisimKaydiEkle, kategorileriGetir } from '@/lib/gelisim';
import { ogrenciGetir } from '@/lib/ogrenciler';
import { useOturum } from '@/lib/oturum';
import type { GelisimKategorisi, Ogrenci } from '@/lib/tipler';

export default function YeniGelisimKaydi() {
  const router = useRouter();
  const { ogrenciId } = useLocalSearchParams<{ ogrenciId: string }>();
  const { kullanici } = useOturum();
  const [ogrenci, setOgrenci] = useState<Ogrenci | null>(null);
  const [kategoriler, setKategoriler] = useState<GelisimKategorisi[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([ogrenciGetir(ogrenciId), kategorileriGetir(true)])
      .then(([o, k]) => {
        setOgrenci(o);
        setKategoriler(k);
      })
      .catch((e: Error) => setHata(e.message));
  }, [ogrenciId]);

  return (
    <Ekran kaydirilabilir>
      <Stack.Screen options={{ title: ogrenci ? `${ogrenci.ad_soyad} · Yeni Kayıt` : 'Yeni Kayıt' }} />

      <HataMesaji mesaj={hata} />
      {ogrenci && kategoriler && kullanici ? (
        <GelisimKaydiFormu
          kategoriler={kategoriler}
          onKaydet={async (girdi) => {
            await gelisimKaydiEkle(ogrenci.kurum_id, ogrenci.id, kullanici.id, girdi);
            router.back();
          }}
        />
      ) : hata ? null : (
        <Yukleniyor />
      )}
    </Ekran>
  );
}
