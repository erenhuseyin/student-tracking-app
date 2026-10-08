// Tek bir duyuru/etkinlik: tür, kapsam, başlık, (etkinlikse) zaman ve yer, içerik. `eylemler`
// verilirse sağ üstte gösterilir (düzenle/sil).
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Ikon } from '@/components/Ikon';
import { Kart } from '@/components/Kart';
import { Rozet } from '@/components/Rozet';
import { DUYURU_TURU_ETIKETLERI, type DuyuruSatiri, etkinlikZamaniniBicimle, etkinlikZamaniniParcala } from '@/lib/duyurular';
import { tarihiBicimle } from '@/lib/tarih';
import { type Tema, useTema } from '@/lib/tema';

export function DuyuruKarti({ duyuru, eylemler }: { duyuru: DuyuruSatiri; eylemler?: ReactNode }) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const etkinlik = duyuru.tur === 'etkinlik';
  return (
    <Kart>
      <View style={styles.ust}>
        <View style={styles.kunye}>
          <Rozet
            metin={DUYURU_TURU_ETIKETLERI[duyuru.tur]}
            ikon={etkinlik ? 'calendar-outline' : 'megaphone-outline'}
            renk={etkinlik ? tema.renkler.vurguKoyu : tema.renkler.ana}
            zemin={etkinlik ? tema.renkler.vurguSoluk : tema.renkler.anaSoluk}
          />
          <Text style={tema.yazi.kucuk}>
            {[duyuru.sinif_adi ?? 'Tüm kurum', tarihiBicimle(etkinlikZamaniniParcala(duyuru.olusturma_tarihi).tarih)].join(' · ')}
          </Text>
        </View>
        {eylemler ? <View style={styles.eylemler}>{eylemler}</View> : null}
      </View>

      <Text style={tema.yazi.bolum}>{duyuru.baslik}</Text>

      {duyuru.etkinlik_zamani ? (
        <View style={styles.bilgi}>
          <Ikon ad="time-outline" boyut={18} />
          <Text style={styles.bilgiMetni}>{etkinlikZamaniniBicimle(duyuru.etkinlik_zamani)}</Text>
        </View>
      ) : null}
      {duyuru.yer ? (
        <View style={styles.bilgi}>
          <Ikon ad="location-outline" boyut={18} />
          <Text style={styles.bilgiMetni}>{duyuru.yer}</Text>
        </View>
      ) : null}

      <Text style={tema.yazi.govde}>{duyuru.icerik}</Text>
    </Kart>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    ust: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: t.bosluk.s,
    },
    kunye: {
      flex: 1,
      gap: t.bosluk.s,
    },
    eylemler: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'flex-end',
      minHeight: t.dokunmaAlani.normal,
    },
    bilgi: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.s,
    },
    bilgiMetni: {
      ...t.yazi.govde,
      flex: 1,
    },
  });
}
