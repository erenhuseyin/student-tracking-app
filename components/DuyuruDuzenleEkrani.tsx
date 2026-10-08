// Duyuru/etkinlik düzenleme (kurum admini ve öğretmen). Kapsam değiştirilemez; düzeltme yeniden
// bildirilmez. Yetkiyi RLS verir: başkasının duyurusu okunamaz/güncellenemezse hata gösterilir.
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { DuyuruFormu } from '@/components/DuyuruFormu';
import { Ekran } from '@/components/Ekran';
import { HataMesaji } from '@/components/HataMesaji';
import { OnayButonu } from '@/components/OnayButonu';
import { Yukleniyor } from '@/components/Yukleniyor';
import { duyurudanGirdiye, duyuruGetir, duyuruGuncelle, duyuruSil } from '@/lib/duyurular';
import { useToast } from '@/lib/toast';
import type { Duyuru } from '@/lib/tipler';

export function DuyuruDuzenleEkrani({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
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
            toast('Duyuru kaydedildi');
            router.back();
          }}
        />
      ) : hata ? null : (
        <Yukleniyor />
      )}
      {duyuru ? (
        <OnayButonu
          etiket="Duyuruyu Sil"
          onOnay={async () => {
            try {
              await duyuruSil(duyuru.id);
              toast('Duyuru silindi');
              router.back();
            } catch (e) {
              setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
            }
          }}
        />
      ) : null}
    </Ekran>
  );
}
