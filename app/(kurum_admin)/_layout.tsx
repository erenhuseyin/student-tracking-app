import { Stack } from 'expo-router';

import { useStackSecenekleri, WebKabuk } from '@/components/WebKabuk';
import { useBolumAcik } from '@/lib/menu';

export default function Layout() {
  const secenekler = useStackSecenekleri();
  // Kişinin tanımlı rolünde kapatılan menünün ekranları adresle de açılamaz (bkz.
  // gorev.kapali_ogeler, Roller ekranı). Bu yalnızca görünürlüktür; veriyi RLS korur.
  const ogrencilerAcik = useBolumAcik('ogrenciler');
  const altBirimlerAcik = useBolumAcik('subeler');
  const basvurularAcik = useBolumAcik('basvurular');
  const onerilerAcik = useBolumAcik('oneriler');
  const programAcik = useBolumAcik('kurum-programi');
  const takvimAcik = useBolumAcik('takvim');
  const kademelerAcik = useBolumAcik('kademeler');
  // Rapor ekranları tek rotadır (/rapor/[tur]); hangi raporun açık olduğuna ekranın kendisi bakar.
  const katilimRaporuAcik = useBolumAcik('katilim-raporu');
  const yoklamaRaporuAcik = useBolumAcik('yoklama-raporu');
  const ezberRaporuAcik = useBolumAcik('ezber-raporu');
  const kitapRaporuAcik = useBolumAcik('kitap-raporu');
  const raporAcik = katilimRaporuAcik || yoklamaRaporuAcik || ezberRaporuAcik || kitapRaporuAcik;
  const konuNotlariAcik = useBolumAcik('konu-notlari');
  const dersRaporuAcik = useBolumAcik('ders-raporu');
  const rollerAcik = useBolumAcik('roller');
  const kategorilerAcik = useBolumAcik('gelisim-kategorileri');
  return (
    <WebKabuk>
      <Stack screenOptions={secenekler}>
        {/* Sekmelerin başlık çubuğu kendi içindedir (components/RolSekmeleri). */}
        <Stack.Screen name="(sekmeler)" options={{ headerShown: false }} />
        <Stack.Protected guard={ogrencilerAcik}>
          <Stack.Screen name="ogrenciler" />
        </Stack.Protected>
        <Stack.Protected guard={altBirimlerAcik}>
          <Stack.Screen name="subeler" />
          <Stack.Screen name="sube/[id]" />
          <Stack.Screen name="yeni-sube" />
          <Stack.Screen name="sube-duzenle/[id]" />
          <Stack.Screen name="sube-personel/[id]" />
        </Stack.Protected>
        <Stack.Protected guard={basvurularAcik}>
          <Stack.Screen name="basvurular" />
          <Stack.Screen name="basvuru/[id]" />
        </Stack.Protected>
        <Stack.Protected guard={onerilerAcik}>
          <Stack.Screen name="oneriler" />
        </Stack.Protected>
        <Stack.Protected guard={takvimAcik}>
          <Stack.Screen name="takvim" />
        </Stack.Protected>
        <Stack.Protected guard={programAcik}>
          <Stack.Screen name="kurum-programi" />
        </Stack.Protected>
        <Stack.Protected guard={kademelerAcik}>
          <Stack.Screen name="kademeler" />
          <Stack.Screen name="kademe/[id]" />
          <Stack.Screen name="ezber-listesi" />
        </Stack.Protected>
        <Stack.Protected guard={konuNotlariAcik}>
          <Stack.Screen name="konu-notlari" />
        </Stack.Protected>
        <Stack.Protected guard={dersRaporuAcik}>
          <Stack.Screen name="ders-raporu" />
        </Stack.Protected>
        <Stack.Protected guard={raporAcik}>
          <Stack.Screen name="rapor/[tur]" />
        </Stack.Protected>
        <Stack.Protected guard={rollerAcik}>
          <Stack.Screen name="roller" />
        </Stack.Protected>
        <Stack.Protected guard={kategorilerAcik}>
          <Stack.Screen name="gelisim-kategorileri" />
        </Stack.Protected>
      </Stack>
    </WebKabuk>
  );
}
