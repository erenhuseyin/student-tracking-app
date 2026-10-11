// Erişim: kurum_admin; `ustId` kendi kurumu ya da altındaki bir birim olmalı (RLS:
// kurum_admin_alt_ekle). 4. seviyenin altına birim açılamaz (trigger).
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { Girdi } from '@/components/Girdi';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { altKurumEkle } from '@/lib/kurumlar';
import { useOturum } from '@/lib/oturum';
import { seviyeAdi } from '@/lib/seviye';
import { useToast } from '@/lib/toast';
import { useKurum } from '@/lib/useKurum';

export default function YeniBirim() {
  const router = useRouter();
  const toast = useToast();
  const { kurum: kendiKurumu } = useOturum();
  const { ustId: ustParam } = useLocalSearchParams<{ ustId?: string }>();
  const ustId = ustParam ?? kendiKurumu?.id;
  const { kurum: ust, hata: ustHatasi } = useKurum(ustId);
  const [ad, setAd] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const seviye = seviyeAdi((ust?.seviye ?? 1) + 1);

  const kaydet = async () => {
    if (!ustId) {
      setHata('Kurum bilgisi bulunamadı.');
      return;
    }
    setGonderiliyor(true);
    setHata(null);
    try {
      await altKurumEkle(ustId, ad);
      toast(`${seviye} eklendi`);
      router.back();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');
    } finally {
      setGonderiliyor(false);
    }
  };

  return (
    <Ekran kaydirilabilir>
      <Stack.Screen options={{ title: ust ? `Yeni ${seviye}` : '' }} />

      <Kart>
        <Girdi
          etiket={ust ? `${seviye} adı` : 'Ad'}
          value={ad}
          onChangeText={setAd}
          editable={!gonderiliyor}
          onSubmitEditing={kaydet}
          autoFocus
        />
        <HataMesaji mesaj={hata ?? ustHatasi} />
        <Buton baslik="Kaydet" onPress={kaydet} yukleniyor={gonderiliyor} />
      </Kart>
    </Ekran>
  );
}
