// "Bildirimler" ekranı (veli, öğretmen, kurum admini): kullanıcıya gönderilmiş son bildirimler.
// Ekran açılınca hepsi okundu sayılır; satıra dokununca ilgili ekrana gidilir.
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { Ekran } from '@/components/Ekran';
import { Ikon, type IkonAdi } from '@/components/Ikon';
import { Liste } from '@/components/Liste';
import { ListeSatiri } from '@/components/ListeSatiri';
import { bildirimBasligi, bildirimHedefi, bildirimleriGetir, tumBildirimleriOkunduYap } from '@/lib/bildirimMerkezi';
import { etkinlikZamaniniBicimle } from '@/lib/duyurular';
import { useOturum } from '@/lib/oturum';
import { useTema } from '@/lib/tema';
import type { BildirimLog, BildirimTipi } from '@/lib/tipler';

const IKONLAR: Record<BildirimTipi, IkonAdi> = {
  yoklama: 'checkbox-outline',
  gelisim_kaydi: 'trending-up-outline',
  duyuru: 'megaphone-outline',
  basvuru: 'mail-unread-outline',
};

export function BildirimlerEkrani() {
  const router = useRouter();
  const tema = useTema();
  const { kullanici } = useOturum();
  const [bildirimler, setBildirimler] = useState<BildirimLog[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const kullaniciId = kullanici?.id;

  const yenile = useCallback(async () => {
    if (!kullaniciId) return;
    setHata(null);
    try {
      // Okunmamışlar bu açılışta vurgulu görünsün diye önce liste alınır, sonra işaretlenir.
      setBildirimler(await bildirimleriGetir(kullaniciId));
      await tumBildirimleriOkunduYap(kullaniciId);
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Bildirimler alınamadı.');
    }
  }, [kullaniciId]);

  useFocusEffect(
    useCallback(() => {
      yenile();
    }, [yenile]),
  );

  return (
    <Ekran>
      <Stack.Screen options={{ title: 'Bildirimler' }} />
      <Liste
        veri={bildirimler}
        hata={hata}
        onYenile={yenile}
        anahtar={(b) => b.id}
        bosIkon="notifications-off-outline"
        bosBaslik="Henüz bildirim yok"
        bosAciklama="Size gönderilen bildirimler burada listelenir."
        satir={(b) => {
          const hedef = kullanici ? bildirimHedefi(kullanici.rol, b) : null;
          return (
            <ListeSatiri
              baslik={b.metin ?? bildirimBasligi(b)}
              altBaslik={[b.metin ? bildirimBasligi(b) : null, etkinlikZamaniniBicimle(b.gonderim_tarihi)].filter(Boolean).join(' · ')}
              sol={<Ikon ad={IKONLAR[b.tip]} boyut={24} renk={b.okundu_mu ? tema.renkler.metinIkincil : tema.renkler.ana} />}
              sag={b.okundu_mu ? undefined : <Ikon ad="ellipse" boyut={10} renk={tema.renkler.ana} />}
              onPress={hedef ? () => router.push(hedef) : undefined}
            />
          );
        }}
      />
    </Ekran>
  );
}
