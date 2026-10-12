// Sınıfın öğrencileri, kitap özetiyle (sınıfın öğretmeni ve kurum admini). Öğrenciye dokununca o
// öğrencinin kitap ekranı açılır. Ezber takibinin sınıf ekranı ayrıdır: components/SinifEzberi.
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { Avatar } from '@/components/Avatar';
import { Ekran } from '@/components/Ekran';
import { Liste } from '@/components/Liste';
import { ListeSatiri } from '@/components/ListeSatiri';
import { kitaplariGetir } from '@/lib/kitaplar';
import { ogrencileriGetir } from '@/lib/ogrenciler';
import { sinifGetir } from '@/lib/siniflar';
import type { Ogrenci } from '@/lib/tipler';

type Satir = { ogrenci: Ogrenci; ozet: string };

async function satirlariGetir(sinifId: string): Promise<{ baslik: string; satirlar: Satir[] }> {
  const [sinif, ogrenciler] = await Promise.all([sinifGetir(sinifId), ogrencileriGetir(sinifId)]);
  const kitaplar = await kitaplariGetir(ogrenciler.map((o) => o.id));
  return {
    baslik: `${sinif.ad} · Kitap Takibi`,
    satirlar: ogrenciler.map((ogrenci) => {
      const kendi = kitaplar.filter((k) => k.ogrenci_id === ogrenci.id);
      const bitti = kendi.filter((k) => k.durum === 'bitti').length;
      const okuyor = kendi.filter((k) => k.durum === 'okuyor').length;
      return { ogrenci, ozet: kendi.length === 0 ? 'Kitap kaydı yok' : `${bitti} bitti · ${okuyor} okuyor` };
    }),
  };
}

export function SinifIcerikListesi({ sinifId }: { sinifId: string }) {
  const router = useRouter();
  const [baslik, setBaslik] = useState('Kitap Takibi');
  const [satirlar, setSatirlar] = useState<Satir[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const yenile = useCallback(async () => {
    setHata(null);
    try {
      const sonuc = await satirlariGetir(sinifId);
      setBaslik(sonuc.baslik);
      setSatirlar(sonuc.satirlar);
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
    }
  }, [sinifId]);

  useFocusEffect(
    useCallback(() => {
      yenile();
    }, [yenile]),
  );

  return (
    <Ekran>
      <Stack.Screen options={{ title: baslik }} />
      <Liste
        veri={satirlar}
        hata={hata}
        onYenile={yenile}
        anahtar={(s) => s.ogrenci.id}
        bosIkon="people-outline"
        bosBaslik="Bu sınıfta öğrenci yok"
        satir={(s) => (
          <ListeSatiri
            baslik={s.ogrenci.ad_soyad}
            altBaslik={s.ozet}
            sol={<Avatar ad={s.ogrenci.ad_soyad} />}
            onPress={() => router.push(`/ogrenci-kitap/${s.ogrenci.id}`)}
          />
        )}
      />
    </Ekran>
  );
}
