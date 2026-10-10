// Sınıfın öğrencileri, ezber ya da kitap özetiyle (sınıfın öğretmeni ve kurum admini). Öğrenciye
// dokununca o öğrencinin ezber / kitap ekranı açılır. `tur` hangi özetin gösterileceğini belirler.
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { Avatar } from '@/components/Avatar';
import { Ekran } from '@/components/Ekran';
import { Liste } from '@/components/Liste';
import { ListeSatiri } from '@/components/ListeSatiri';
import { kademeIceriginiGetir, ogrenciEzberleriniGetir } from '@/lib/icerik';
import { kitaplariGetir } from '@/lib/kitaplar';
import { ogrencileriGetir } from '@/lib/ogrenciler';
import { sinifGetir } from '@/lib/siniflar';
import type { Ogrenci } from '@/lib/tipler';

type Satir = { ogrenci: Ogrenci; ozet: string };

async function satirlariGetir(sinifId: string, tur: 'ezber' | 'kitap'): Promise<{ baslik: string; satirlar: Satir[] }> {
  const [sinif, ogrenciler] = await Promise.all([sinifGetir(sinifId), ogrencileriGetir(sinifId)]);
  const idler = ogrenciler.map((o) => o.id);
  if (tur === 'kitap') {
    const kitaplar = await kitaplariGetir(idler);
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
  const [icerik, ezberler] = await Promise.all([
    sinif.kademe_id ? kademeIceriginiGetir(sinif.kademe_id) : null,
    ogrenciEzberleriniGetir(idler),
  ]);
  const maddeSayisi = icerik?.ezberler.length ?? 0;
  return {
    baslik: `${sinif.ad} · Ezber Takibi`,
    satirlar: ogrenciler.map((ogrenci) => {
      const kendi = ezberler.filter((e) => e.ogrenci_id === ogrenci.id);
      const tamam = kendi.filter((e) => e.durum === 'tamam').length;
      const devam = kendi.filter((e) => e.durum === 'devam').length;
      return { ogrenci, ozet: `${tamam}/${maddeSayisi} tamam${devam > 0 ? ` · ${devam} devam ediyor` : ''}` };
    }),
  };
}

export function SinifIcerikListesi({ sinifId, tur }: { sinifId: string; tur: 'ezber' | 'kitap' }) {
  const router = useRouter();
  const [baslik, setBaslik] = useState(tur === 'ezber' ? 'Ezber Takibi' : 'Kitap Takibi');
  const [satirlar, setSatirlar] = useState<Satir[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const yenile = useCallback(async () => {
    setHata(null);
    try {
      const sonuc = await satirlariGetir(sinifId, tur);
      setBaslik(sonuc.baslik);
      setSatirlar(sonuc.satirlar);
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
    }
  }, [sinifId, tur]);

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
            onPress={() => router.push(tur === 'ezber' ? `/ogrenci-ezber/${s.ogrenci.id}` : `/ogrenci-kitap/${s.ogrenci.id}`)}
          />
        )}
      />
    </Ekran>
  );
}
