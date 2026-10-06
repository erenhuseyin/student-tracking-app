// Öğrenci başına haftalık katılım oranı listesi; katılımı en düşük olan üstte. Alt satırda
// son 4 haftanın (seçili hafta dahil) toplam oranı gösterilir.
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { ListeSatiri } from '@/components/ListeSatiri';
import { Rozet } from '@/components/Rozet';
import { araliktakiler, haftadakiler, katilimHesapla, katilimMetni, yuzdeMetni } from '@/lib/katilim';
import { gunEkle } from '@/lib/tarih';
import { type Tema, useTema } from '@/lib/tema';
import type { Ogrenci } from '@/lib/tipler';
import type { YoklamaKaydi } from '@/lib/yoklama';

export const SON_HAFTA_SAYISI = 4;

type Props = {
  ogrenciler: Ogrenci[];
  // Seçili haftayı ve önceki 3 haftayı kapsayan kayıtlar.
  yoklamalar: YoklamaKaydi[];
  pazartesi: string;
};

export function KatilimListesi({ ogrenciler, yoklamalar, pazartesi }: Props) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);

  const satirlar = ogrenciler
    .map((o) => {
      const kayitlari = yoklamalar.filter((y) => y.ogrenci_id === o.id);
      const sonHaftalar = araliktakiler(kayitlari, gunEkle(pazartesi, -7 * (SON_HAFTA_SAYISI - 1)), gunEkle(pazartesi, 6));
      return { ogrenci: o, hafta: katilimHesapla(haftadakiler(kayitlari, pazartesi)), donem: katilimHesapla(sonHaftalar) };
    })
    // En düşük katılım üstte; bu hafta yoklaması olmayanlar sonda.
    .sort((a, b) => (a.hafta.oran ?? 2) - (b.hafta.oran ?? 2));

  return (
    <View style={styles.liste}>
      {satirlar.map(({ ogrenci, hafta, donem }) => {
        const renk = tema.katilimRengi(hafta.oran);
        return (
          <ListeSatiri
            key={ogrenci.id}
            baslik={ogrenci.ad_soyad}
            altBaslik={`${katilimMetni(hafta) ?? 'Bu hafta yoklama alınmadı'}\nSon ${SON_HAFTA_SAYISI} hafta: ${yuzdeMetni(donem.oran)}`}
            sol={<Avatar ad={ogrenci.ad_soyad} />}
            sag={<Rozet metin={yuzdeMetni(hafta.oran)} renk={renk.renk} zemin={renk.soluk} />}
          />
        );
      })}
    </View>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    liste: {
      gap: t.bosluk.m,
    },
  });
}
