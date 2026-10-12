// Bir öğrencinin ezber durumu: sınıfının ezber listesi (müşterinin ortak listesi + kademeye özel
// ekler), gruplara ayrılmış, madde başına tek satır. `duzenlenebilir` (sınıfın öğretmeni, kurum
// admini) verilirse durum satırdaki düğmelerle değiştirilir; veli salt okunur görür. Kendi
// kaydırmasını yapar: kaydırmasız bir `Ekran` içinde kullanılır.
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BosDurum } from '@/components/BosDurum';
import { EzberDurumDugmeleri, type EzberSecimi } from '@/components/EzberDurumDugmeleri';
import { HataMesaji } from '@/components/HataMesaji';
import { IlerlemeCubugu } from '@/components/IlerlemeCubugu';
import { Kart } from '@/components/Kart';
import { Rozet } from '@/components/Rozet';
import { Secenekler } from '@/components/Secenekler';
import { Yukleniyor } from '@/components/Yukleniyor';
import { EZBER_ETIKETLERI, ezberDurumunuAyarla, ezberGruplari, ezberListesiniGetir, ogrenciEzberleriniGetir } from '@/lib/icerik';
import { ogrenciGetir } from '@/lib/ogrenciler';
import { sinifGetir } from '@/lib/siniflar';
import { type Tema, useTema } from '@/lib/tema';
import type { EzberDurumu, EzberMaddesi, Ogrenci } from '@/lib/tipler';

type Suzgec = 'tumu' | 'kalan';
const SUZGECLER: { deger: Suzgec; etiket: string }[] = [
  { deger: 'tumu', etiket: 'Tümü' },
  { deger: 'kalan', etiket: 'Kalanlar' },
];

export function OgrenciEzber({ ogrenciId, duzenlenebilir = false }: { ogrenciId: string; duzenlenebilir?: boolean }) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const [ogrenci, setOgrenci] = useState<Ogrenci | null>(null);
  const [maddeler, setMaddeler] = useState<EzberMaddesi[] | null>(null);
  const [durumlar, setDurumlar] = useState<Map<string, EzberDurumu>>(new Map());
  const [suzgec, setSuzgec] = useState<Suzgec>('tumu');
  // Kaydı süren maddeler; diğer satırlar bu sırada işaretlenebilir.
  const [kaydedilen, setKaydedilen] = useState<Set<string>>(new Set());
  const [hata, setHata] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let iptalEdildi = false;
      setHata(null);
      (async () => {
        const o = await ogrenciGetir(ogrenciId);
        const sinif = await sinifGetir(o.sinif_id);
        const [liste, kayitlar] = await Promise.all([ezberListesiniGetir(sinif.kademe_id), ogrenciEzberleriniGetir([ogrenciId])]);
        if (iptalEdildi) return;
        setOgrenci(o);
        setMaddeler(liste);
        setDurumlar(new Map(kayitlar.map((k) => [k.madde_id, k.durum])));
      })().catch((e: Error) => {
        if (!iptalEdildi) setHata(e.message);
      });
      return () => {
        iptalEdildi = true;
      };
    }, [ogrenciId]),
  );

  const yaz = (maddeId: string, durum: EzberSecimi) =>
    setDurumlar((mevcut) => {
      const yeni = new Map(mevcut);
      if (durum === 'baslamadi') yeni.delete(maddeId);
      else yeni.set(maddeId, durum);
      return yeni;
    });

  // Ekran hemen güncellenir; kayıt başarısız olursa önceki duruma dönülür.
  const ayarla = async (maddeId: string, durum: EzberSecimi) => {
    if (!ogrenci) return;
    const onceki: EzberSecimi = durumlar.get(maddeId) ?? 'baslamadi';
    setHata(null);
    yaz(maddeId, durum);
    setKaydedilen((k) => new Set(k).add(maddeId));
    try {
      await ezberDurumunuAyarla(ogrenci.kurum_id, ogrenci.id, maddeId, durum);
    } catch (e) {
      yaz(maddeId, onceki);
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
    } finally {
      setKaydedilen((k) => {
        const yeni = new Set(k);
        yeni.delete(maddeId);
        return yeni;
      });
    }
  };

  if (hata && !maddeler) return <HataMesaji mesaj={hata} />;
  if (!maddeler) return <Yukleniyor />;
  if (maddeler.length === 0) {
    return <BosDurum ikon="list-outline" baslik="Ezber listesi yok" aciklama="Kurumun ezber listesi henüz tanımlanmamış." />;
  }

  const durumu = (m: EzberMaddesi): EzberSecimi => durumlar.get(m.id) ?? 'baslamadi';
  const tamamSayisi = (liste: EzberMaddesi[]) => liste.filter((m) => durumu(m) === 'tamam').length;
  const gruplar = ezberGruplari(maddeler);
  const baslikli = gruplar.length > 1 || gruplar[0].grup !== null;

  return (
    <ScrollView style={styles.kaydirma} contentContainerStyle={styles.icerik}>
      <HataMesaji mesaj={hata} />
      <Kart>
        <IlerlemeCubugu tamam={tamamSayisi(maddeler)} toplam={maddeler.length} etiket="Tamamlanan" />
        <Secenekler secenekler={SUZGECLER} secili={suzgec} onSec={setSuzgec} />
      </Kart>
      {gruplar.map((g) => {
        const gorunen = suzgec === 'kalan' ? g.maddeler.filter((m) => durumu(m) !== 'tamam') : g.maddeler;
        if (gorunen.length === 0) return null;
        return (
          <Kart key={g.grup ?? '__grupsuz__'}>
            {baslikli ? (
              <View style={styles.grupBasligi}>
                <Text style={[tema.yazi.bolum, styles.esnek]}>{g.grup ?? 'Diğer'}</Text>
                <Text style={tema.yazi.kucuk}>
                  {tamamSayisi(g.maddeler)}/{g.maddeler.length} tamam
                </Text>
              </View>
            ) : null}
            {gorunen.map((m, i) => {
              const durum = durumu(m);
              return (
                <View key={m.id} style={[styles.satir, i > 0 && styles.ayiricili]}>
                  <Text style={styles.ad}>{m.ad}</Text>
                  {duzenlenebilir ? (
                    <EzberDurumDugmeleri ad={m.ad} durum={durum} onSec={(d) => ayarla(m.id, d)} pasif={kaydedilen.has(m.id)} />
                  ) : (
                    <Rozet
                      metin={EZBER_ETIKETLERI[durum]}
                      ikon={durum === 'tamam' ? 'checkmark-circle' : durum === 'devam' ? 'time-outline' : 'ellipse-outline'}
                      renk={durum === 'tamam' ? tema.renkler.basari : durum === 'devam' ? tema.renkler.uyari : tema.renkler.metinIkincil}
                      zemin={durum === 'tamam' ? tema.renkler.basariSoluk : durum === 'devam' ? tema.renkler.uyariSoluk : tema.renkler.ayirici}
                    />
                  )}
                </View>
              );
            })}
          </Kart>
        );
      })}
      {suzgec === 'kalan' && tamamSayisi(maddeler) === maddeler.length ? (
        <Text style={tema.yazi.kucuk}>Listedeki tüm maddeler tamamlandı.</Text>
      ) : null}
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
    esnek: {
      flex: 1,
    },
    grupBasligi: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: t.bosluk.s,
    },
    satir: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.s,
      minHeight: t.dokunmaAlani.normal,
      paddingVertical: t.bosluk.xs,
    },
    ayiricili: {
      borderTopWidth: 1,
      borderTopColor: t.renkler.ayirici,
    },
    ad: {
      ...t.yazi.govde,
      flex: 1,
    },
  });
}
