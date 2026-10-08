// Erişim: yalnızca kurum_admin. Velilerin yönettiği kurumlara yazdığı öneriler (ana kurum
// yöneticisinde şubeler dahil; RLS). Tek yönlüdür: uygulamadan yanıt yazılmaz. Ekran açılınca
// okunmamışlar okundu sayılır.
import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Ekran } from '@/components/Ekran';
import { Kart } from '@/components/Kart';
import { Liste } from '@/components/Liste';
import { Rozet } from '@/components/Rozet';
import { etkinlikZamaniniBicimle } from '@/lib/duyurular';
import { kurumOnerileriniGetir, onerileriOkunduYap, type OneriSatiri } from '@/lib/oneriler';
import { type Tema, useTema } from '@/lib/tema';

export default function Oneriler() {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const [oneriler, setOneriler] = useState<OneriSatiri[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const yenile = useCallback(async () => {
    setHata(null);
    try {
      const liste = await kurumOnerileriniGetir();
      // Okunmamışlar bu açılışta "Yeni" rozetiyle görünsün diye önce gösterilir, sonra işaretlenir.
      setOneriler(liste);
      await onerileriOkunduYap(liste.filter((o) => !o.okundu).map((o) => o.id));
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      yenile();
    }, [yenile]),
  );

  return (
    <Ekran>
      <Stack.Screen options={{ title: 'Veli Önerileri' }} />
      <Liste
        veri={oneriler}
        hata={hata}
        onYenile={yenile}
        anahtar={(o) => o.id}
        bosIkon="chatbox-ellipses-outline"
        bosBaslik="Henüz öneri yok"
        bosAciklama="Veliler Menü > Öneri Gönder ile yönetime görüş iletebilir. Uygulamadan yanıt yazılmaz."
        satir={(o) => (
          <Kart>
            <View style={styles.ust}>
              <Text style={[tema.yazi.kucuk, styles.kunye]}>
                {o.gonderen} · {etkinlikZamaniniBicimle(o.olusturma_tarihi)}
              </Text>
              {o.okundu ? null : <Rozet metin="Yeni" ikon="ellipse" renk={tema.renkler.ana} zemin={tema.renkler.anaSoluk} />}
            </View>
            <Text style={tema.yazi.govde}>{o.metin}</Text>
          </Kart>
        )}
      />
    </Ekran>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    ust: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.s,
    },
    kunye: {
      flex: 1,
    },
  });
}
