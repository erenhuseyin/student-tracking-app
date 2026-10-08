// Duyuru/etkinlik düzenleme (kurum admini ve öğretmen). Kapsam değiştirilemez; düzeltme yeniden
// bildirilmez. Yetkiyi RLS verir: başkasının duyurusu okunamaz/güncellenemezse hata gösterilir.
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { DuyuruFormu } from '@/components/DuyuruFormu';
import { Ekran } from '@/components/Ekran';
import { HataMesaji } from '@/components/HataMesaji';
import { Yukleniyor } from '@/components/Yukleniyor';
import { duyurudanGirdiye, duyuruGetir, duyuruGuncelle } from '@/lib/duyurular';
import type { Duyuru } from '@/lib/tipler';

export function DuyuruDuzenleEkrani({ id }: { id: string }) {
  const router = useRouter();
  const [duyuru, setDuyuru] = useState<Duyuru | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    duyuruGetir(id)
      .then(setDuyuru)
      .catch((e: Error) => setHata(e.message));
  }, [id]);

  return (
    <Ekran kaydirilabilir>
      <Stack.Screen options={{ title: 'Duyuruyu Düzenle' }} />

      <HataMesaji mesaj={hata} />
      {duyuru ? (
        <DuyuruFormu
          baslangic={duyurudanGirdiye(duyuru)}
          onKaydet={async (girdi) => {
            await duyuruGuncelle(duyuru.id, girdi);
            router.back();
          }}
        />
      ) : hata ? null : (
        <Yukleniyor />
      )}
    </Ekran>
  );
}
