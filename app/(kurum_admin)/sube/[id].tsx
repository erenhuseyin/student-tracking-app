// Erişim: kurum_admin, yalnızca kendi altındaki birimler için (RLS: başka daldaki ya da üstteki
// birimin verisi okunamaz). Üst yönetici bir alt birimin sınıflarını burada yönetir; birimin
// yöneticisini ve öğretmenlerini "Personel"den ekler, altındaki birimlere buradan iner.
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from 'react-native';

import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { HataMesaji } from '@/components/HataMesaji';
import { SinifListesi } from '@/components/SinifListesi';
import { altBirimAcabilir, seviyeAdi, seviyeAdiCogul } from '@/lib/seviye';
import { useTema } from '@/lib/tema';
import { useKurum } from '@/lib/useKurum';

export default function BirimDetay() {
  const router = useRouter();
  const tema = useTema();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { kurum, yol, hata } = useKurum(id, true);

  return (
    <Ekran>
      <Stack.Screen options={{ title: kurum?.ad ?? '' }} />
      {kurum ? <Text style={tema.yazi.kucuk}>{[seviyeAdi(kurum.seviye), yol].filter(Boolean).join(' · ')}</Text> : null}
      {hata ? <HataMesaji mesaj={hata} /> : <SinifListesi kurumId={id} />}
      {altBirimAcabilir(kurum) && kurum ? (
        <Buton
          tur="ikincil"
          ikon="business-outline"
          baslik={seviyeAdiCogul(kurum.seviye + 1)}
          onPress={() => router.push(`/subeler?ustId=${id}`)}
        />
      ) : null}
      <Buton tur="ikincil" ikon="people-outline" baslik="Personel" onPress={() => router.push(`/sube-personel/${id}`)} />
    </Ekran>
  );
}
