// Erişim: yalnızca veli (kendi çocuğu; RLS). Çocuğun bir gün gelmeyeceğini önceden bildirir;
// öğretmen o günün yoklamasını alırken görür. Bildirim geri alınabilir.
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text } from 'react-native';

import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { Girdi } from '@/components/Girdi';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { ListeSatiri } from '@/components/ListeSatiri';
import { OnayButonu } from '@/components/OnayButonu';
import { TarihGirdisi } from '@/components/TarihGirdisi';
import { devamsizlikBildir, devamsizlikBildiriminiGeriAl, devamsizlikBildirimleriniGetir } from '@/lib/devamsizlik';
import { ogrenciGetir } from '@/lib/ogrenciler';
import { useOturum } from '@/lib/oturum';
import { bugununTarihi, tarihiBicimle } from '@/lib/tarih';
import { useTema } from '@/lib/tema';
import { useToast } from '@/lib/toast';
import type { DevamsizlikBildirimi, Ogrenci } from '@/lib/tipler';

const mesajaCevir = (e: unknown) => (e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');

export default function DevamsizlikBildir() {
  const tema = useTema();
  const toast = useToast();
  const { ogrenciId } = useLocalSearchParams<{ ogrenciId: string }>();
  const { kullanici } = useOturum();
  const [ogrenci, setOgrenci] = useState<Ogrenci | null>(null);
  const [bildirimler, setBildirimler] = useState<DevamsizlikBildirimi[]>([]);
  const [tarih, setTarih] = useState(bugununTarihi());
  const [neden, setNeden] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const yenile = useCallback(async () => {
    try {
      const [o, b] = await Promise.all([ogrenciGetir(ogrenciId), devamsizlikBildirimleriniGetir(ogrenciId)]);
      setOgrenci(o);
      setBildirimler(b);
    } catch (e) {
      setHata(mesajaCevir(e));
    }
  }, [ogrenciId]);

  useFocusEffect(
    useCallback(() => {
      yenile();
    }, [yenile]),
  );

  const bildir = async () => {
    if (!ogrenci || !kullanici) return;
    setGonderiliyor(true);
    setHata(null);
    try {
      await devamsizlikBildir(ogrenci.kurum_id, ogrenci.id, kullanici.id, tarih, neden);
      setNeden('');
      toast('Öğretmene bildirildi');
      await yenile();
    } catch (e) {
      setHata(mesajaCevir(e));
    } finally {
      setGonderiliyor(false);
    }
  };

  return (
    <Ekran kaydirilabilir>
      <Stack.Screen options={{ title: 'Gelmeyeceğini Bildir' }} />

      <Kart>
        <Text style={tema.yazi.govde}>
          {ogrenci ? `${ogrenci.ad_soyad} hangi gün gelmeyecek?` : 'Çocuğunuz hangi gün gelmeyecek?'} Öğretmeni o günün
          yoklamasını alırken bu notu görür.
        </Text>
        <TarihGirdisi etiket="Gün" deger={tarih} onDegis={setTarih} pasif={gonderiliyor} />
        <Girdi
          etiket="Neden (örn. hasta, aile ziyareti)"
          value={neden}
          onChangeText={setNeden}
          editable={!gonderiliyor}
          maxLength={300}
          buyuk
        />
        <HataMesaji mesaj={hata} />
        <Buton baslik="Bildir" onPress={bildir} yukleniyor={gonderiliyor} pasif={!ogrenci} buyuk />
      </Kart>

      {bildirimler.length > 0 ? (
        <Kart>
          <Text style={tema.yazi.bolum}>Bildirdiğiniz günler</Text>
          {bildirimler.map((b) => (
            <ListeSatiri
              key={b.id}
              baslik={tarihiBicimle(b.tarih)}
              altBaslik={b.neden}
              sag={
                <OnayButonu
                  ikon="close-circle-outline"
                  etiket="Bildirimi geri al"
                  soru="Geri alınsın mı?"
                  onayEtiketi="Evet"
                  onOnay={async () => {
                    try {
                      await devamsizlikBildiriminiGeriAl(b.id);
                      await yenile();
                    } catch (e) {
                      setHata(mesajaCevir(e));
                    }
                  }}
                />
              }
            />
          ))}
        </Kart>
      ) : null}
    </Ekran>
  );
}
