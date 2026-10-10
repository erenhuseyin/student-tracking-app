// Erişim: yalnızca veli. Çocuğun gelişim kayıtları, yoklama geçmişi ve sınıfının ders programı
// ve — kurumda açıksa — ezber ve kitap takibi (hepsi salt okunur).
// Kurumun veliler için kapattığı bölüm gösterilmez (bkz. lib/menu.ts > useBolumAcik).
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { View } from 'react-native';

import { BosDurum } from '@/components/BosDurum';
import { Buton } from '@/components/Buton';
import { Chip } from '@/components/Chip';
import { Ekran } from '@/components/Ekran';
import { GelisimZamanCizelgesi } from '@/components/GelisimZamanCizelgesi';
import { OgrenciEzber } from '@/components/OgrenciEzber';
import { OgrenciKitaplari } from '@/components/OgrenciKitaplari';
import { SinifProgrami } from '@/components/SinifProgrami';
import { YoklamaGecmisi } from '@/components/YoklamaGecmisi';
import { ICERIK_OZELLIGI } from '@/lib/icerik';
import { useBolumAcik } from '@/lib/menu';
import { ogrenciGetir } from '@/lib/ogrenciler';
import { useOzellik } from '@/lib/ozellikler';
import { useTema } from '@/lib/tema';

type Gorunum = 'gelisim' | 'yoklama' | 'program' | 'ezber' | 'kitap';

const GORUNUMLER: { deger: Gorunum; etiket: string }[] = [
  { deger: 'gelisim', etiket: 'Gelişim' },
  { deger: 'yoklama', etiket: 'Yoklama' },
  { deger: 'program', etiket: 'Program' },
  { deger: 'ezber', etiket: 'Ezber' },
  { deger: 'kitap', etiket: 'Kitap' },
];

export default function VeliCocukDetayi() {
  const router = useRouter();
  const { ogrenciId } = useLocalSearchParams<{ ogrenciId: string }>();
  const [baslik, setBaslik] = useState('Çocuğum');
  const [sinifId, setSinifId] = useState<string | null>(null);
  const [secilen, setSecilen] = useState<Gorunum>('gelisim');
  const gelisimAcik = useBolumAcik('gelisim');
  const yoklamaAcik = useBolumAcik('yoklama');
  const programAcik = useBolumAcik('program');
  const icerikBolumu = useBolumAcik('icerik');
  const icerikAcik = useOzellik(ICERIK_OZELLIGI) && icerikBolumu;
  const tema = useTema();
  const acik: Record<Gorunum, boolean> = {
    gelisim: gelisimAcik,
    yoklama: yoklamaAcik,
    program: programAcik,
    ezber: icerikAcik,
    kitap: icerikAcik,
  };
  const gorunumler = GORUNUMLER.filter((g) => acik[g.deger]);
  const gorunum = gorunumler.some((g) => g.deger === secilen) ? secilen : gorunumler[0]?.deger;

  useEffect(() => {
    // Başlık ve program için; okunamazsa varsayılan başlık kalır, listeler kendi hatasını gösterir.
    ogrenciGetir(ogrenciId)
      .then((o) => {
        setBaslik(o.ad_soyad);
        setSinifId(o.sinif_id);
      })
      .catch(() => {});
  }, [ogrenciId]);

  return (
    <Ekran>
      <Stack.Screen options={{ title: baslik }} />

      {gorunumler.length > 1 && gorunum ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tema.bosluk.s }}>
          {gorunumler.map((g) => (
            <Chip key={g.deger} etiket={g.etiket} secili={g.deger === gorunum} onPress={() => setSecilen(g.deger)} />
          ))}
        </View>
      ) : null}
      {gorunum === 'gelisim' ? <GelisimZamanCizelgesi ogrenciId={ogrenciId} /> : null}
      {gorunum === 'yoklama' ? (
        <>
          <Buton
            tur="ikincil"
            ikon="calendar-clear-outline"
            baslik="Gelmeyeceğini Bildir"
            onPress={() => router.push({ pathname: '/devamsizlik-bildir', params: { ogrenciId } })}
          />
          <YoklamaGecmisi ogrenciId={ogrenciId} />
        </>
      ) : null}
      {gorunum === 'program' && sinifId ? <SinifProgrami sinifId={sinifId} /> : null}
      {gorunum === 'ezber' ? <OgrenciEzber ogrenciId={ogrenciId} /> : null}
      {gorunum === 'kitap' ? <OgrenciKitaplari ogrenciId={ogrenciId} /> : null}
      {gorunum ? null : (
        <BosDurum
          ikon="eye-off-outline"
          baslik="Gösterilecek bölüm yok"
          aciklama="Kurumunuz bu bilgileri uygulamada paylaşmıyor. Lütfen kurumunuzla iletişime geçin."
        />
      )}
    </Ekran>
  );
}
