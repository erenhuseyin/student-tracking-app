// Haftalık yoklama tablosu (salt okunur): satır = öğrenci, sütun = o haftanın ders günleri,
// son sütun = haftalık katılım oranı. `onGunSec` verilirse bugün ve geçmiş günlerin başlığı
// dokunulabilir olur (o günün yoklama ekranını açmak için). Sütunlar sığmazsa yatay kayar.
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Ikon, type IkonAdi } from '@/components/Ikon';
import { Kart } from '@/components/Kart';
import { katilimHesapla, yuzdeMetni } from '@/lib/katilim';
import { bugununTarihi, GUN_KISA_ADLARI, isoGun } from '@/lib/tarih';
import { type Tema, useTema } from '@/lib/tema';
import { type Ogrenci, YOKLAMA_DURUMLARI, type YoklamaDurumu } from '@/lib/tipler';
import { YOKLAMA_ETIKETLERI, type YoklamaKaydi } from '@/lib/yoklama';

const DURUM_IKONLARI: Record<YoklamaDurumu, IkonAdi> = {
  geldi: 'checkmark',
  gelmedi: 'close',
  gec: 'time-outline',
  mazeretli: 'document-text-outline',
};

const AD_GENISLIGI = 116;
const GUN_GENISLIGI = 40;
const ORAN_GENISLIGI = 52;

type Props = {
  ogrenciler: Ogrenci[];
  // Tablonun gün sütunları (YYYY-AA-GG), tarih sırasıyla.
  sutunlar: string[];
  // Yalnızca bu haftanın kayıtları.
  yoklamalar: YoklamaKaydi[];
  onGunSec?: (tarih: string) => void;
};

export function HaftalikYoklamaTablosu({ ogrenciler, sutunlar, yoklamalar, onGunSec }: Props) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const bugun = bugununTarihi();
  const durumHaritasi = new Map(yoklamalar.map((y) => [`${y.ogrenci_id}|${y.tarih}`, y.durum]));

  return (
    <Kart>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kaydirma}>
        <View style={styles.tablo}>
          <View style={styles.satir}>
            <View style={styles.ad} />
            {sutunlar.map((tarih) => {
              const baslik = (
                <>
                  <Text style={[styles.gunAdi, tarih === bugun && styles.bugun]}>{GUN_KISA_ADLARI[isoGun(tarih) - 1]}</Text>
                  <Text style={[styles.gunSayisi, tarih === bugun && styles.bugun]}>{Number(tarih.slice(8))}</Text>
                </>
              );
              return onGunSec && tarih <= bugun ? (
                <Pressable
                  key={tarih}
                  accessibilityRole="button"
                  accessibilityLabel={`${GUN_KISA_ADLARI[isoGun(tarih) - 1]} ${Number(tarih.slice(8))} yoklamasını aç`}
                  onPress={() => onGunSec(tarih)}
                  style={({ pressed }) => [styles.gunBasligi, styles.dokunulabilir, pressed && styles.basili]}
                >
                  {baslik}
                </Pressable>
              ) : (
                <View key={tarih} style={styles.gunBasligi}>
                  {baslik}
                </View>
              );
            })}
            <View style={styles.oran}>
              <Text style={styles.gunAdi}>Oran</Text>
            </View>
          </View>

          {ogrenciler.map((o) => {
            const kayitlari = yoklamalar.filter((y) => y.ogrenci_id === o.id);
            const { oran } = katilimHesapla(kayitlari);
            return (
              <View key={o.id} style={[styles.satir, styles.ogrenciSatiri]}>
                <Text style={[styles.ad, styles.adMetni]} numberOfLines={2}>
                  {o.ad_soyad}
                </Text>
                {sutunlar.map((tarih) => {
                  const durum = durumHaritasi.get(`${o.id}|${tarih}`);
                  return (
                    <View
                      key={tarih}
                      style={styles.hucre}
                      accessible
                      accessibilityLabel={`${o.ad_soyad}, ${GUN_KISA_ADLARI[isoGun(tarih) - 1]}: ${
                        durum ? YOKLAMA_ETIKETLERI[durum] : 'işaretlenmedi'
                      }`}
                    >
                      {durum ? (
                        <View style={[styles.isaret, { backgroundColor: tema.yoklamaRenkleri[durum].soluk }]}>
                          <Ikon ad={DURUM_IKONLARI[durum]} boyut={16} renk={tema.yoklamaRenkleri[durum].renk} />
                        </View>
                      ) : (
                        <View style={styles.bosIsaret} />
                      )}
                    </View>
                  );
                })}
                <View style={styles.oran}>
                  <Text style={[styles.oranMetni, { color: tema.katilimRengi(oran).renk }]}>{yuzdeMetni(oran)}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.aciklama}>
        {YOKLAMA_DURUMLARI.map((durum) => (
          <View key={durum} style={styles.aciklamaOgesi}>
            <Ikon ad={DURUM_IKONLARI[durum]} boyut={14} renk={tema.yoklamaRenkleri[durum].renk} />
            <Text style={styles.kucuk}>{YOKLAMA_ETIKETLERI[durum]}</Text>
          </View>
        ))}
        <View style={styles.aciklamaOgesi}>
          <View style={styles.bosIsaret} />
          <Text style={styles.kucuk}>İşaretlenmedi</Text>
        </View>
      </View>
    </Kart>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    kaydirma: {
      flexGrow: 1,
    },
    tablo: {
      flexGrow: 1,
    },
    satir: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    ogrenciSatiri: {
      minHeight: 44,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.renkler.ayirici,
    },
    ad: {
      flexGrow: 1,
      flexBasis: AD_GENISLIGI,
      minWidth: AD_GENISLIGI,
      paddingRight: t.bosluk.s,
    },
    adMetni: {
      ...t.yazi.kucuk,
      fontFamily: t.yaziTipi.yariKalin,
      color: t.renkler.metin,
    },
    gunBasligi: {
      width: GUN_GENISLIGI,
      alignItems: 'center',
      paddingVertical: t.bosluk.xs,
      borderRadius: t.yaricap.s,
    },
    dokunulabilir: {
      backgroundColor: t.renkler.anaSoluk,
    },
    basili: {
      opacity: 0.6,
    },
    gunAdi: {
      ...t.yazi.etiket,
    },
    gunSayisi: {
      fontFamily: t.yaziTipi.kalin,
      fontSize: 14,
      color: t.renkler.metin,
    },
    bugun: {
      color: t.renkler.ana,
    },
    hucre: {
      width: GUN_GENISLIGI,
      alignItems: 'center',
      justifyContent: 'center',
    },
    isaret: {
      width: 28,
      height: 28,
      borderRadius: t.yaricap.tam,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bosIsaret: {
      width: 10,
      height: 10,
      borderRadius: t.yaricap.tam,
      borderWidth: 1,
      borderColor: t.renkler.kenarlik,
    },
    oran: {
      width: ORAN_GENISLIGI,
      alignItems: 'flex-end',
    },
    oranMetni: {
      fontFamily: t.yaziTipi.kalin,
      fontSize: 15,
    },
    aciklama: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      columnGap: t.bosluk.l,
      rowGap: t.bosluk.xs,
    },
    aciklamaOgesi: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.xs,
    },
    kucuk: {
      ...t.yazi.kucuk,
    },
  });
}
