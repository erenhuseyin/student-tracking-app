// Yeni duyuru/etkinlik (kurum admini ve öğretmen). Kapsam seçenekleri role göre: kurum admini
// kendi kurumunun tamamına ya da bir sınıfına, öğretmen yalnızca atandığı sınıflara yazar.
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { DuyuruFormu, type DuyuruKapsami } from '@/components/DuyuruFormu';
import { Ekran } from '@/components/Ekran';
import { HataMesaji } from '@/components/HataMesaji';
import { Yukleniyor } from '@/components/Yukleniyor';
import { duyuruEkle } from '@/lib/duyurular';
import { useToast } from '@/lib/toast';
import { useOturum } from '@/lib/oturum';
import { EN_FAZLA_SEVIYE, seviyeAdiKucuk } from '@/lib/seviye';
import { siniflariGetir } from '@/lib/siniflar';
import type { Sinif } from '@/lib/tipler';

// Yöneticinin kurumuna yazdığı genel duyuru altındaki tüm birimleri de kapsar.
function kapsamEtiketi(seviye: number): string {
  const ad = seviyeAdiKucuk(seviye);
  return seviye < EN_FAZLA_SEVIYE ? `Tüm ${ad} (alt birimler dahil)` : `Tüm ${ad}`;
}

export function YeniDuyuruEkrani() {
  const router = useRouter();
  const toast = useToast();
  const { kullanici, kurum } = useOturum();
  const [siniflar, setSiniflar] = useState<Sinif[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const yonetici = kullanici?.rol === 'kurum_admin';
  const kurumId = kurum?.id;

  useEffect(() => {
    if (!kurumId) return;
    // Yönetici kendi kurumunun sınıflarını, öğretmen RLS'in döndürdüğü (atandığı) sınıfları seçer.
    siniflariGetir(yonetici ? kurumId : undefined)
      .then(setSiniflar)
      .catch((e: Error) => setHata(e.message));
  }, [kurumId, yonetici]);

  const kapsamlar: DuyuruKapsami[] | null = siniflar
    ? [
        ...(yonetici ? [{ sinifId: null, etiket: kurum ? kapsamEtiketi(kurum.seviye) : '' }] : []),
        ...siniflar.map((s) => ({ sinifId: s.id, etiket: s.ad })),
      ]
    : null;

  return (
    <Ekran kaydirilabilir>
      <Stack.Screen options={{ title: 'Yeni Duyuru' }} />

      <HataMesaji mesaj={hata} />
      {kapsamlar && kullanici && kurum ? (
        kapsamlar.length === 0 ? (
          <HataMesaji mesaj="Size atanmış sınıf yok; duyuru yazabilmek için bir sınıfa atanmanız gerekir." />
        ) : (
          <DuyuruFormu
            kapsamlar={kapsamlar}
            onKaydet={async (girdi, kapsam) => {
              // Sınıfa özel duyuru sınıfın kurumunda durur (bileşik FK); kurum geneli yazanın kurumunda.
              const sinif = siniflar?.find((s) => s.id === kapsam?.sinifId);
              await duyuruEkle(sinif?.kurum_id ?? kurum.id, sinif?.id ?? null, kullanici.id, girdi);
              toast('Duyuru yayınlandı');
              router.back();
            }}
          />
        )
      ) : hata ? null : (
        <Yukleniyor />
      )}
    </Ekran>
  );
}
