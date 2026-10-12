// Türkiye il haritası (yalnızca web): iller seçilen ölçüye (katılım oranı ya da öğrenci sayısı)
// göre tek tonlu sıralı ölçekle renklenir; verisi olmayan il nötr kalır. Verisi olan ile
// tıklanınca `onIlSec` çağrılır; üzerine gelince il adı ve değerleri üstte yazılır. Lejant her
// zaman görünür. İl sınırları: assets/harita/turkiye-iller.ts (kaynak ve lisans orada).
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { HARITA_GORUNUM_KUTUSU, IL_YOLLARI } from '@/assets/harita/turkiye-iller';
import type { TurkiyeHaritasiProps } from '@/components/TurkiyeHaritasi';
import {
  BASAMAK_SAYISI,
  basamakRengi,
  ilBasamagi,
  KATILIM_BASAMAK_ETIKETLERI,
  ogrenciBasamakEtiketleri,
  veriYokRengi,
} from '@/lib/haritaRenkleri';
import { ilAdi } from '@/lib/iller';
import { oran, type PanoIli } from '@/lib/pano';
import { type Tema, useTema } from '@/lib/tema';

const PLAKALAR = Object.keys(IL_YOLLARI).map(Number);

function ilAciklamasi(il: PanoIli): string {
  const o = oran(il.katildi, il.gelmedi);
  return `${ilAdi(il.il_kodu)}: ${il.ogrenci} öğrenci · katılım ${o === null ? '—' : `%${Math.round(o * 100)}`}`;
}

export function TurkiyeHaritasi({ iller, olcu, seciliIl, onIlSec }: TurkiyeHaritasiProps) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const [uzerinde, setUzerinde] = useState<number | null>(null);
  const veri = useMemo(() => new Map(iller.map((i) => [i.il_kodu, i])), [iller]);
  const enCokOgrenci = Math.max(0, ...iller.map((i) => i.ogrenci));
  const etiketler = olcu === 'katilim' ? KATILIM_BASAMAK_ETIKETLERI : ogrenciBasamakEtiketleri(enCokOgrenci);
  // İl sınırı kartın zemin rengindedir: komşu iller arasında ince bir boşluk gibi görünür.
  const sinir = tema.renkler.yuzey;

  const uzerindeki = uzerinde ? veri.get(uzerinde) : undefined;
  const ipucu = uzerinde
    ? uzerindeki
      ? ilAciklamasi(uzerindeki)
      : `${ilAdi(uzerinde)}: birim yok`
    : 'Bir ilin üzerine gelin; birimi olan ile tıklayınca o il seçilir.';

  return (
    <View style={styles.kapsayici}>
      <Text style={tema.yazi.kucuk}>{ipucu}</Text>
      <svg viewBox={HARITA_GORUNUM_KUTUSU} role="group" aria-label="Türkiye il haritası" style={{ width: '100%', height: 'auto' }}>
        {PLAKALAR.map((plaka) => {
          const il = veri.get(plaka);
          const basamak = il ? ilBasamagi(il, olcu, enCokOgrenci) : null;
          const secili = seciliIl === plaka;
          const etkin = uzerinde === plaka;
          return (
            <path
              key={plaka}
              d={IL_YOLLARI[plaka]}
              fill={basamak === null ? veriYokRengi(tema) : basamakRengi(tema, basamak)}
              stroke={secili || etkin ? tema.renkler.metin : sinir}
              strokeWidth={secili ? 2.5 : etkin ? 1.5 : 1}
              strokeLinejoin="round"
              style={{ cursor: il ? 'pointer' : 'default', outline: 'none' }}
              role={il ? 'button' : undefined}
              tabIndex={il ? 0 : undefined}
              aria-label={il ? ilAciklamasi(il) : undefined}
              onMouseEnter={() => setUzerinde(plaka)}
              onMouseLeave={() => setUzerinde(null)}
              onFocus={() => setUzerinde(plaka)}
              onBlur={() => setUzerinde(null)}
              onClick={il ? () => onIlSec(il) : undefined}
              onKeyDown={il ? (e) => (e.key === 'Enter' || e.key === ' ') && onIlSec(il) : undefined}
            />
          );
        })}
      </svg>
      <View style={styles.lejant}>
        {Array.from({ length: BASAMAK_SAYISI }, (_, i) => (
          <View key={i} style={styles.lejantOgesi}>
            <View style={[styles.kutu, { backgroundColor: basamakRengi(tema, i) }]} />
            <Text style={tema.yazi.kucuk}>{etiketler[i]}</Text>
          </View>
        ))}
        <View style={styles.lejantOgesi}>
          <View style={[styles.kutu, { backgroundColor: veriYokRengi(tema), borderColor: tema.renkler.kenarlik, borderWidth: 1 }]} />
          <Text style={tema.yazi.kucuk}>Veri yok</Text>
        </View>
      </View>
    </View>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    kapsayici: {
      gap: t.bosluk.s,
    },
    lejant: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      columnGap: t.bosluk.l,
      rowGap: t.bosluk.xs,
    },
    lejantOgesi: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.xs,
    },
    kutu: {
      width: 14,
      height: 14,
      borderRadius: 3,
    },
  });
}
