// Erişim: yalnızca kurum_admin (yönettiği kurumların verisi; RLS). Raporlar grubundaki bir raporun
// sorgulama ekranı: /rapor/katilim, /rapor/yoklama, /rapor/ezber, /rapor/kitap (lib/raporlar.ts).
// Tanımlı rolde kapatılan rapor (gorev.kapali_ogeler) ve müşteride içerik takibi kapalıyken
// ezber/kitap raporu açılmaz.
import { Stack, useLocalSearchParams } from 'expo-router';

import { BosDurum } from '@/components/BosDurum';
import { Ekran } from '@/components/Ekran';
import { RaporEkrani } from '@/components/RaporEkrani';
import { ICERIK_OZELLIGI } from '@/lib/icerik';
import { useOturum } from '@/lib/oturum';
import { kapaliOgeleriGenislet } from '@/lib/menu';
import { useOzellik } from '@/lib/ozellikler';
import { RAPOR_TANIMLARI, raporTuruMu } from '@/lib/raporlar';

export default function Rapor() {
  const { tur } = useLocalSearchParams<{ tur: string }>();
  const { kapaliBolumler } = useOturum();
  const icerikAcik = useOzellik(ICERIK_OZELLIGI);
  const tanim = raporTuruMu(tur) ? RAPOR_TANIMLARI[tur] : null;
  const acik =
    tanim !== null && !kapaliOgeleriGenislet(kapaliBolumler).includes(tanim.menuAnahtari) && (!tanim.icerik || icerikAcik);

  if (!tanim || !acik) {
    return (
      <Ekran>
        <Stack.Screen options={{ title: 'Rapor' }} />
        <BosDurum ikon="document-text-outline" baslik="Rapor bulunamadı" aciklama="Bu rapor bu hesapta açık değil." />
      </Ekran>
    );
  }
  return (
    <>
      <Stack.Screen options={{ title: tanim.baslik }} />
      {/* Tür değişince (kenar çubuğundan başka rapora geçiş) süzgeçler sıfırlansın. */}
      <RaporEkrani key={tanim.tur} tanim={tanim} />
    </>
  );
}
