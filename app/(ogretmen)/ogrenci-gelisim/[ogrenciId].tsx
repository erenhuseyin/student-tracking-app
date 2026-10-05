// Erişim: yalnızca ogretmen. Öğrencinin gelişim kayıtları; öğretmen yalnızca kendi girdiği
// kaydı düzenleyip silebilir (RLS de bunu zorlar), sınıfın diğer öğretmeninin kaydını yalnızca okur.
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { GelisimKaydiKarti } from '@/components/GelisimKaydiKarti';
import { IkonButon } from '@/components/IkonButon';
import { Liste } from '@/components/Liste';
import { OnayButonu } from '@/components/OnayButonu';
import { type GelisimKaydiSatiri, gelisimKaydiSil, gelisimKayitlariniGetir } from '@/lib/gelisim';
import { ogrenciGetir } from '@/lib/ogrenciler';
import { useOturum } from '@/lib/oturum';
import type { Ogrenci } from '@/lib/tipler';

export default function OgrenciGelisimKayitlari() {
  const router = useRouter();
  const { ogrenciId } = useLocalSearchParams<{ ogrenciId: string }>();
  const { kullanici } = useOturum();
  const [ogrenci, setOgrenci] = useState<Ogrenci | null>(null);
  const [kayitlar, setKayitlar] = useState<GelisimKaydiSatiri[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const yenile = useCallback(async () => {
    setHata(null);
    try {
      const [o, k] = await Promise.all([ogrenciGetir(ogrenciId), gelisimKayitlariniGetir(ogrenciId)]);
      setOgrenci(o);
      setKayitlar(k);
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
    }
  }, [ogrenciId]);

  useFocusEffect(
    useCallback(() => {
      yenile();
    }, [yenile]),
  );

  return (
    <Ekran>
      <Stack.Screen options={{ title: ogrenci ? ogrenci.ad_soyad : 'Gelişim Kayıtları' }} />

      <Liste
        veri={kayitlar}
        hata={hata}
        anahtar={(k) => k.id}
        bosIkon="trending-up-outline"
        bosBaslik="Henüz gelişim kaydı yok"
        bosAciklama="İlk kaydı aşağıdaki butonla ekleyebilirsiniz."
        satir={(k) =>
          k.giren_kullanici_id === kullanici?.id ? (
            <GelisimKaydiKarti
              kayit={k}
              eylemler={
                <>
                  <IkonButon
                    ikon="create-outline"
                    etiket="Düzenle"
                    onPress={() => router.push(`/gelisim-kaydi-duzenle/${k.id}`)}
                  />
                  <OnayButonu
                    ikon="trash-outline"
                    onOnay={async () => {
                      try {
                        await gelisimKaydiSil(k.id);
                        await yenile();
                      } catch (e) {
                        setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
                      }
                    }}
                  />
                </>
              }
            />
          ) : (
            <GelisimKaydiKarti kayit={k} altNot="Başka bir öğretmen girdi" />
          )
        }
      />

      <Buton
        ikon="add"
        baslik="Yeni Kayıt"
        onPress={() => router.push({ pathname: '/yeni-gelisim-kaydi', params: { ogrenciId } })}
      />
    </Ekran>
  );
}
