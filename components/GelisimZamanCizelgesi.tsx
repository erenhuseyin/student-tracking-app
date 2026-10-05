// Bir öğrencinin gelişim kayıtları (salt okunur, en yeni üstte): üstte kategori başına kayıt
// sayısı, altında kayıtlar. Veli ekranında kullanılır.
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { GelisimKaydiKarti } from '@/components/GelisimKaydiKarti';
import { Liste } from '@/components/Liste';
import { Rozet } from '@/components/Rozet';
import { type GelisimKaydiSatiri, gelisimKayitlariniGetir } from '@/lib/gelisim';
import { bosluk, renkler } from '@/lib/tema';

// Kategori adı -> kayıt sayısı, ilk görülme sırasıyla (kayıtlar en yeniden eskiye gelir).
function kategoriSayilari(kayitlar: GelisimKaydiSatiri[]): [string, number][] {
  const sayilar = new Map<string, number>();
  for (const k of kayitlar) sayilar.set(k.kategori_adi, (sayilar.get(k.kategori_adi) ?? 0) + 1);
  return [...sayilar];
}

export function GelisimZamanCizelgesi({ ogrenciId }: { ogrenciId: string }) {
  const [kayitlar, setKayitlar] = useState<GelisimKaydiSatiri[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setHata(null);
      // RLS (gelisim_kaydi_veli_oku) yalnızca velinin kendi çocuğunun kayıtlarını döndürür.
      gelisimKayitlariniGetir(ogrenciId)
        .then(setKayitlar)
        .catch((e: Error) => setHata(e.message));
    }, [ogrenciId]),
  );

  return (
    <Liste
      veri={kayitlar}
      hata={hata}
      anahtar={(k) => k.id}
      bosIkon="trending-up-outline"
      bosBaslik="Henüz gelişim kaydı yok"
      bosAciklama="Öğretmeni bir kayıt girdiğinde burada görünür."
      ust={
        <View style={styles.ozet}>
          {kategoriSayilari(kayitlar ?? []).map(([ad, adet]) => (
            <Rozet key={ad} metin={`${ad} · ${adet}`} renk={renkler.vurguKoyu} zemin={renkler.vurguSoluk} />
          ))}
        </View>
      }
      satir={(k) => <GelisimKaydiKarti kayit={k} />}
    />
  );
}

const styles = StyleSheet.create({
  ozet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: bosluk.s,
    marginBottom: bosluk.m,
  },
});
