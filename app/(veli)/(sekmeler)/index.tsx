// Erişim: yalnızca veli. Çocuklarının özeti (bugünkü yoklama, haftalık katılım, son gelişim
// kaydı) ve yaklaşan etkinlikler. RLS yalnızca velinin bağlı olduğu öğrencileri döndürür.
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';

import { CocukOzetKarti } from '@/components/CocukOzetKarti';
import { DuyuruKarti } from '@/components/DuyuruKarti';
import { Ekran } from '@/components/Ekran';
import { Liste } from '@/components/Liste';
import { useBolumAcik } from '@/lib/menu';
import { useTema } from '@/lib/tema';
import { type CocukOzeti, type VeliOzeti, veliOzetiniGetir } from '@/lib/veliOzet';

export default function VeliAnaSayfa() {
  const router = useRouter();
  const tema = useTema();
  const [ozet, setOzet] = useState<VeliOzeti | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const yoklamaAcik = useBolumAcik('yoklama');
  const gelisimAcik = useBolumAcik('gelisim');
  const duyurularAcik = useBolumAcik('duyurular');

  const yenile = useCallback(async () => {
    setHata(null);
    try {
      setOzet(await veliOzetiniGetir({ yoklama: yoklamaAcik, gelisim: gelisimAcik, duyurular: duyurularAcik }));
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Bilgiler alınamadı.');
    }
  }, [yoklamaAcik, gelisimAcik, duyurularAcik]);

  useFocusEffect(
    useCallback(() => {
      yenile();
    }, [yenile]),
  );

  return (
    <Ekran>
      <Liste<CocukOzeti>
        veri={ozet?.cocuklar ?? null}
        hata={hata}
        onYenile={yenile}
        anahtar={(c) => c.ogrenci.id}
        bosIkon="people-outline"
        bosBaslik="Bağlı bir çocuk bulunamadı"
        bosAciklama="Lütfen kurumunuzun yöneticisiyle iletişime geçin."
        satir={(c) => (
          <CocukOzetKarti
            ozet={c}
            yoklamaAcik={yoklamaAcik}
            gelisimAcik={gelisimAcik}
            onPress={() => router.push(`/cocuk/${c.ogrenci.id}`)}
          />
        )}
        alt={
          ozet && ozet.etkinlikler.length > 0 ? (
            <View style={{ gap: tema.bosluk.m, marginTop: tema.bosluk.m }}>
              <Text style={tema.yazi.bolum}>Yaklaşan etkinlikler</Text>
              {ozet.etkinlikler.map((e) => (
                <DuyuruKarti key={e.id} duyuru={{ ...e, sinif_adi: null }} kapsamiGizle />
              ))}
            </View>
          ) : undefined
        }
      />
    </Ekran>
  );
}
