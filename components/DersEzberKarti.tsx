// Ders takibindeki "Ezber" görünümü: sınıfın ezber listesindeki her madde için kaç öğrencinin
// tamamladığı ve devam ettiği (grup başlıklarıyla). Maddeye dokununca sınıfın ezber ekranı o madde
// seçili olarak "maddeye göre" açılır. Erişim: sınıfın öğretmeni ve kurum admini (RLS).
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { HataMesaji } from '@/components/HataMesaji';
import { IlerlemeCubugu } from '@/components/IlerlemeCubugu';
import { Kart } from '@/components/Kart';
import { Yukleniyor } from '@/components/Yukleniyor';
import { ezberGruplari, ezberListesiniGetir, ogrenciEzberleriniGetir } from '@/lib/icerik';
import { ogrencileriGetir } from '@/lib/ogrenciler';
import { type Tema, useTema } from '@/lib/tema';
import type { EzberMaddesi, OgrenciEzber, Sinif } from '@/lib/tipler';

export function DersEzberKarti({ sinif }: { sinif: Sinif }) {
  const router = useRouter();
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const [veri, setVeri] = useState<{ maddeler: EzberMaddesi[]; kayitlar: OgrenciEzber[]; ogrenciSayisi: number } | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let iptalEdildi = false;
      setHata(null);
      (async () => {
        const [maddeler, ogrenciler] = await Promise.all([ezberListesiniGetir(sinif.kademe_id), ogrencileriGetir(sinif.id)]);
        const kayitlar = await ogrenciEzberleriniGetir(ogrenciler.map((o) => o.id));
        if (!iptalEdildi) setVeri({ maddeler, kayitlar, ogrenciSayisi: ogrenciler.length });
      })().catch((e: Error) => {
        if (!iptalEdildi) setHata(e.message);
      });
      return () => {
        iptalEdildi = true;
      };
    }, [sinif.id, sinif.kademe_id]),
  );

  // madde id -> { tamam, devam }
  const sayilar = useMemo(() => {
    const harita = new Map<string, { tamam: number; devam: number }>();
    for (const k of veri?.kayitlar ?? []) {
      const s = harita.get(k.madde_id) ?? { tamam: 0, devam: 0 };
      s[k.durum] += 1;
      harita.set(k.madde_id, s);
    }
    return harita;
  }, [veri]);

  if (hata) return <HataMesaji mesaj={hata} />;
  if (!veri) return <Yukleniyor />;
  if (veri.maddeler.length === 0) return <Text style={tema.yazi.kucuk}>Ezber listesi tanımlanmamış.</Text>;

  const toplamTamam = [...sayilar.values()].reduce((t, s) => t + s.tamam, 0);

  return (
    <>
      <Kart>
        <IlerlemeCubugu tamam={toplamTamam} toplam={veri.maddeler.length * veri.ogrenciSayisi} etiket="Sınıfın ezberi" />
        <Text style={tema.yazi.kucuk}>Maddeye dokunun: sınıfı o madde için işaretleyin.</Text>
      </Kart>
      {ezberGruplari(veri.maddeler).map((g) => (
        <Kart key={g.grup ?? '-'}>
          {g.grup ? <Text style={tema.yazi.bolum}>{g.grup}</Text> : null}
          {g.maddeler.map((m) => {
            const s = sayilar.get(m.id) ?? { tamam: 0, devam: 0 };
            return (
              <Pressable
                key={m.id}
                accessibilityRole="button"
                accessibilityLabel={`${m.ad}: ${s.tamam}/${veri.ogrenciSayisi} tamamladı`}
                onPress={() => router.push({ pathname: '/ezber/[sinifId]', params: { sinifId: sinif.id, madde: m.id } })}
                style={({ pressed }) => [styles.satir, pressed && styles.basili]}
              >
                <Text style={[tema.yazi.govde, styles.ad]}>{m.ad}</Text>
                <Text style={[tema.yazi.kucuk, styles.sayi]}>
                  {s.tamam}/{veri.ogrenciSayisi}
                  {s.devam ? ` · devam ${s.devam}` : ''}
                </Text>
              </Pressable>
            );
          })}
        </Kart>
      ))}
    </>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    satir: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.m,
      minHeight: t.dokunmaAlani.normal,
      paddingVertical: t.bosluk.xs,
    },
    ad: {
      flex: 1,
      minWidth: 0,
    },
    sayi: {
      fontVariant: ['tabular-nums'],
    },
    basili: {
      opacity: 0.7,
    },
  });
}
