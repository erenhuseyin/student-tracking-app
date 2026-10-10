// Bir öğrencinin ezber durumu: sınıfının kademesindeki maddeler ve her birinin durumu.
// `duzenlenebilir` (sınıfın öğretmeni, kurum admini) verilirse durum değiştirilir; veli salt
// okunur görür. Kendi kaydırmasını yapar: kaydırmasız bir `Ekran` içinde kullanılır.
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BosDurum } from '@/components/BosDurum';
import { HataMesaji } from '@/components/HataMesaji';
import { IlerlemeCubugu } from '@/components/IlerlemeCubugu';
import { Kart } from '@/components/Kart';
import { Rozet } from '@/components/Rozet';
import { Secenekler } from '@/components/Secenekler';
import { Yukleniyor } from '@/components/Yukleniyor';
import { EZBER_ETIKETLERI, ezberDurumunuAyarla, kademeIceriginiGetir, ogrenciEzberleriniGetir } from '@/lib/icerik';
import { ogrenciGetir } from '@/lib/ogrenciler';
import { sinifGetir } from '@/lib/siniflar';
import { type Tema, useTema } from '@/lib/tema';
import type { EzberDurumu, EzberMaddesi, Ogrenci } from '@/lib/tipler';

type Durum = EzberDurumu | 'baslamadi';
const SECENEKLER: { deger: Durum; etiket: string }[] = (['baslamadi', 'devam', 'tamam'] as const).map((d) => ({
  deger: d,
  etiket: EZBER_ETIKETLERI[d],
}));

export function OgrenciEzber({ ogrenciId, duzenlenebilir = false }: { ogrenciId: string; duzenlenebilir?: boolean }) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const [ogrenci, setOgrenci] = useState<Ogrenci | null>(null);
  const [maddeler, setMaddeler] = useState<EzberMaddesi[] | null>(null);
  const [durumlar, setDurumlar] = useState<Map<string, EzberDurumu>>(new Map());
  const [degisen, setDegisen] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let iptalEdildi = false;
      setHata(null);
      (async () => {
        const o = await ogrenciGetir(ogrenciId);
        const sinif = await sinifGetir(o.sinif_id);
        const [icerik, kayitlar] = await Promise.all([
          sinif.kademe_id ? kademeIceriginiGetir(sinif.kademe_id) : null,
          ogrenciEzberleriniGetir([ogrenciId]),
        ]);
        if (iptalEdildi) return;
        setOgrenci(o);
        setMaddeler(icerik?.ezberler ?? []);
        setDurumlar(new Map(kayitlar.map((k) => [k.madde_id, k.durum])));
      })().catch((e: Error) => {
        if (!iptalEdildi) setHata(e.message);
      });
      return () => {
        iptalEdildi = true;
      };
    }, [ogrenciId]),
  );

  const ayarla = async (maddeId: string, durum: Durum) => {
    if (!ogrenci) return;
    setDegisen(maddeId);
    setHata(null);
    try {
      await ezberDurumunuAyarla(ogrenci.kurum_id, ogrenci.id, maddeId, durum);
      setDurumlar((mevcut) => {
        const yeni = new Map(mevcut);
        if (durum === 'baslamadi') yeni.delete(maddeId);
        else yeni.set(maddeId, durum);
        return yeni;
      });
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
    } finally {
      setDegisen(null);
    }
  };

  if (hata && !maddeler) return <HataMesaji mesaj={hata} />;
  if (!maddeler) return <Yukleniyor />;
  if (maddeler.length === 0) {
    return <BosDurum ikon="list-outline" baslik="Ezber listesi yok" aciklama="Bu sınıfın kademesinde ezber maddesi tanımlanmamış." />;
  }

  const tamam = [...durumlar.values()].filter((d) => d === 'tamam').length;

  return (
    <ScrollView style={styles.kaydirma} contentContainerStyle={styles.icerik}>
      <HataMesaji mesaj={hata} />
      <Kart>
        <IlerlemeCubugu tamam={tamam} toplam={maddeler.length} etiket="Tamamlanan" />
      </Kart>
      {maddeler.map((m, i) => {
        const durum: Durum = durumlar.get(m.id) ?? 'baslamadi';
        return (
          <Kart key={m.id}>
            <View style={styles.ust}>
              <Text style={styles.ad}>
                {i + 1}. {m.ad}
              </Text>
              {duzenlenebilir ? null : (
                <Rozet
                  metin={EZBER_ETIKETLERI[durum]}
                  ikon={durum === 'tamam' ? 'checkmark-circle' : durum === 'devam' ? 'time-outline' : 'ellipse-outline'}
                  renk={durum === 'tamam' ? tema.renkler.basari : durum === 'devam' ? tema.renkler.uyari : tema.renkler.metinIkincil}
                  zemin={durum === 'tamam' ? tema.renkler.basariSoluk : durum === 'devam' ? tema.renkler.uyariSoluk : tema.renkler.ayirici}
                />
              )}
            </View>
            {duzenlenebilir ? (
              <Secenekler secenekler={SECENEKLER} secili={durum} onSec={(d) => ayarla(m.id, d)} pasif={degisen !== null} />
            ) : null}
          </Kart>
        );
      })}
    </ScrollView>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    kaydirma: {
      flex: 1,
    },
    icerik: {
      gap: t.bosluk.m,
      paddingBottom: t.bosluk.l,
    },
    ust: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.s,
    },
    ad: {
      ...t.yazi.govde,
      flex: 1,
    },
  });
}
