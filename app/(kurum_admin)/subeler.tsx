// Erişim: yalnızca kök kurumun (müşterinin) kurum_admin'i. Şube admini bu ekrana bağlantı
// görmez; adresle açsa bile RLS ona şube göstermez ve şube eklemesine izin vermez.
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { Ikon } from '@/components/Ikon';
import { Liste } from '@/components/Liste';
import { ListeSatiri } from '@/components/ListeSatiri';
import { OnayButonu } from '@/components/OnayButonu';
import { subeleriGetir, subeSil } from '@/lib/kurumlar';
import { useOturum } from '@/lib/oturum';
import { renkler } from '@/lib/tema';
import type { Kurum } from '@/lib/tipler';

export default function Subeler() {
  const router = useRouter();
  const { kurum } = useOturum();
  const [subeler, setSubeler] = useState<Kurum[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const kurumId = kurum?.id;

  const yenile = useCallback(async () => {
    if (!kurumId) return;
    setHata(null);
    try {
      setSubeler(await subeleriGetir(kurumId));
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
    }
  }, [kurumId]);

  useFocusEffect(
    useCallback(() => {
      yenile();
    }, [yenile]),
  );

  return (
    <Ekran>
      <Stack.Screen options={{ title: 'Şubeler' }} />

      <Liste
        veri={subeler}
        hata={hata}
        anahtar={(s) => s.id}
        bosIkon="business-outline"
        bosBaslik="Henüz şube yok"
        satir={(s) => (
          <ListeSatiri
            baslik={s.ad}
            sol={<Ikon ad="business-outline" boyut={26} renk={renkler.anaParlak} />}
            onPress={() => router.push(`/sube/${s.id}`)}
            sag={
              <OnayButonu
                ikon="trash-outline"
                onOnay={async () => {
                  try {
                    await subeSil(s.id);
                    await yenile();
                  } catch (e) {
                    setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
                  }
                }}
              />
            }
          />
        )}
      />

      <Buton ikon="add" baslik="Yeni Şube Ekle" onPress={() => router.push('/yeni-sube')} />
    </Ekran>
  );
}
