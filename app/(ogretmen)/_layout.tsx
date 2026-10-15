import { Stack } from 'expo-router';

import { useStackSecenekleri, WebKabuk } from '@/components/WebKabuk';
import { useBolumAcik } from '@/lib/menu';
import { OGRETMEN_KAYIT_OZELLIGI, useOzellik } from '@/lib/ozellikler';

export default function Layout() {
  const secenekler = useStackSecenekleri();
  // Kurumun öğretmenler için kapattığı bölümün ekranları adresle de açılamaz (bkz. kapali_bolum).
  const yoklamaAcik = useBolumAcik('yoklama');
  const gelisimAcik = useBolumAcik('gelisim');
  const duyurularAcik = useBolumAcik('duyurular');
  const programAcik = useBolumAcik('program');
  const icerikAcik = useBolumAcik('icerik');
  // Müşteri hocanın sınıf/öğrenci açmasını kapattıysa (süper admin) bu ekranlar da kapanır; RLS de reddeder.
  const kayitAcik = useOzellik(OGRETMEN_KAYIT_OZELLIGI, true);
  return (
    <WebKabuk>
      <Stack screenOptions={secenekler}>
        {/* Sekmelerin başlık çubuğu kendi içindedir (components/RolSekmeleri). */}
        <Stack.Screen name="(sekmeler)" options={{ headerShown: false }} />
        <Stack.Protected guard={yoklamaAcik}>
          <Stack.Screen name="yoklama/[sinifId]" />
          <Stack.Screen name="haftalik-yoklama/[sinifId]" />
          <Stack.Screen name="ders-gunleri/[sinifId]" />
        </Stack.Protected>
        <Stack.Protected guard={gelisimAcik}>
          <Stack.Screen name="ogrenci-gelisim/[ogrenciId]" />
          <Stack.Screen name="yeni-gelisim-kaydi" />
          <Stack.Screen name="gelisim-kaydi-duzenle/[id]" />
        </Stack.Protected>
        <Stack.Protected guard={duyurularAcik}>
          <Stack.Screen name="yeni-duyuru" />
          <Stack.Screen name="takvim" />
          <Stack.Screen name="duyuru-duzenle/[id]" />
        </Stack.Protected>
        <Stack.Protected guard={programAcik}>
          <Stack.Screen name="ders-programi/[sinifId]" />
          <Stack.Screen name="ders-saati" />
        </Stack.Protected>
        <Stack.Protected guard={icerikAcik}>
          <Stack.Screen name="ders-takibi/[sinifId]" />
          <Stack.Screen name="ezber/[sinifId]" />
          <Stack.Screen name="ogrenci-ezber/[ogrenciId]" />
          <Stack.Screen name="kitap/[sinifId]" />
          <Stack.Screen name="ogrenci-kitap/[ogrenciId]" />
        </Stack.Protected>
        <Stack.Protected guard={kayitAcik}>
          <Stack.Screen name="yeni-sinif" />
          <Stack.Screen name="sinif-duzenle/[id]" />
          <Stack.Screen name="yeni-ogrenci" />
          <Stack.Screen name="ogrenci-duzenle/[id]" />
        </Stack.Protected>
      </Stack>
    </WebKabuk>
  );
}
