// Erişim: yalnızca kurum_admin (yönettiği kurumların verisi; RLS). Raporları Excel'in açtığı
// CSV dosyası olarak indirir. Yalnızca web'de çalışır; telefonda bilgilendirme gösterilir.
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { BosDurum } from '@/components/BosDurum';
import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { disaAktarmaDestekleniyor, RAPORLAR, type RaporTuru, raporuIndir } from '@/lib/disaAktar';
import { ICERIK_OZELLIGI } from '@/lib/icerik';
import { useOzellik } from '@/lib/ozellikler';
import { useTema } from '@/lib/tema';
import { useToast } from '@/lib/toast';

export default function Raporlar() {
  const tema = useTema();
  const toast = useToast();
  const icerikAcik = useOzellik(ICERIK_OZELLIGI);
  const [calisan, setCalisan] = useState<RaporTuru | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const indir = async (tur: RaporTuru) => {
    setCalisan(tur);
    setHata(null);
    try {
      const satir = await raporuIndir(tur);
      toast(`${satir} satır indirildi`);
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Rapor hazırlanamadı.');
    } finally {
      setCalisan(null);
    }
  };

  return (
    <Ekran kaydirilabilir>
      <Stack.Screen options={{ title: 'Raporlar' }} />
      {disaAktarmaDestekleniyor ? (
        <>
          <Text style={tema.yazi.kucuk}>
            Dosyalar Excel&apos;de doğrudan açılır. Raporlar yönettiğiniz tüm kurumları kapsar.
          </Text>
          <HataMesaji mesaj={hata} />
          {RAPORLAR.filter((r) => !r.icerik || icerikAcik).map((r) => (
            <Kart key={r.tur}>
              <Text style={tema.yazi.bolum}>{r.baslik}</Text>
              <Text style={tema.yazi.kucuk}>{r.aciklama}</Text>
              <Buton
                tur="ikincil"
                ikon="download-outline"
                baslik="Excel'e Aktar"
                onPress={() => indir(r.tur)}
                yukleniyor={calisan === r.tur}
                pasif={calisan !== null}
              />
            </Kart>
          ))}
        </>
      ) : (
        <BosDurum
          ikon="desktop-outline"
          baslik="Raporlar bilgisayardan alınır"
          aciklama="Excel'e aktarma için uygulamayı bilgisayarınızın tarayıcısından açın."
        />
      )}
    </Ekran>
  );
}
