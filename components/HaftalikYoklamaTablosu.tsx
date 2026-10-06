// Haftalık yoklama tablosu (salt okunur): satır = öğrenci, sütun = o haftanın ders günleri,
// son sütun = haftalık katılım oranı. `onGunSec` verilirse bugün ve geçmiş günlerin başlığı
// dokunulabilir olur (o günün yoklama ekranını açmak için). Sütunlar sığmazsa yatay kayar.
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Ikon, type IkonAdi } from '@/components/Ikon';
import { Kart } from '@/components/Kart';
import { katilimHesapla, yuzdeMetni } from '@/lib/katilim';
import { bugununTarihi, GUN_KISA_ADLARI, isoGun } from '@/lib/tarih';
import { bosluk, katilimRengi, renkler, yaricap, yazi, yoklamaRenkleri } from '@/lib/tema';
import { type Ogrenci, YOKLAMA_DURUMLARI, type YoklamaDurumu } from '@/lib/tipler';
import { YOKLAMA_ETIKETLERI, type YoklamaKaydi } from '@/lib/yoklama';

const DURUM_IKONLARI: Record<YoklamaDurumu, IkonAdi> = {
  geldi: 'checkmark',
  gelmedi: 'close',
  gec: 'time-outline',
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
                <Text style={[yazi.kucuk, styles.ad, styles.adMetni]} numberOfLines={2}>
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
                        <View style={[styles.isaret, { backgroundColor: yoklamaRenkleri[durum].soluk }]}>
                          <Ikon ad={DURUM_IKONLARI[durum]} boyut={16} renk={yoklamaRenkleri[durum].renk} />
                        </View>
                      ) : (
                        <View style={styles.bosIsaret} />
                      )}
                    </View>
                  );
                })}
                <View style={styles.oran}>
                  <Text style={[styles.oranMetni, { color: katilimRengi(oran).renk }]}>{yuzdeMetni(oran)}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.aciklama}>
        {YOKLAMA_DURUMLARI.map((durum) => (
          <View key={durum} style={styles.aciklamaOgesi}>
            <Ikon ad={DURUM_IKONLARI[durum]} boyut={14} renk={yoklamaRenkleri[durum].renk} />
            <Text style={yazi.kucuk}>{YOKLAMA_ETIKETLERI[durum]}</Text>
          </View>
        ))}
        <View style={styles.aciklamaOgesi}>
          <View style={styles.bosIsaret} />
          <Text style={yazi.kucuk}>İşaretlenmedi</Text>
        </View>
      </View>
    </Kart>
  );
}

const styles = StyleSheet.create({
  // Sütunlar dar ekranda sığmazsa kayar, sığarsa tablo kartı doldurur.
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
    borderTopColor: renkler.ayirici,
  },
  ad: {
    flexGrow: 1,
    flexBasis: AD_GENISLIGI,
    minWidth: AD_GENISLIGI,
    paddingRight: bosluk.s,
  },
  adMetni: {
    color: renkler.metin,
    fontWeight: '600',
  },
  gunBasligi: {
    width: GUN_GENISLIGI,
    alignItems: 'center',
    paddingVertical: bosluk.xs,
    borderRadius: yaricap.s,
  },
  dokunulabilir: {
    backgroundColor: renkler.anaSoluk,
  },
  basili: {
    opacity: 0.6,
  },
  gunAdi: {
    fontSize: 12,
    fontWeight: '600',
    color: renkler.vurguKoyu,
  },
  gunSayisi: {
    fontSize: 14,
    fontWeight: '700',
    color: renkler.metin,
  },
  bugun: {
    color: renkler.ana,
  },
  hucre: {
    width: GUN_GENISLIGI,
    alignItems: 'center',
    justifyContent: 'center',
  },
  isaret: {
    width: 28,
    height: 28,
    borderRadius: yaricap.tam,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bosIsaret: {
    width: 10,
    height: 10,
    borderRadius: yaricap.tam,
    borderWidth: 1,
    borderColor: renkler.kenarlik,
  },
  oran: {
    width: ORAN_GENISLIGI,
    alignItems: 'flex-end',
  },
  oranMetni: {
    fontSize: 15,
    fontWeight: '700',
  },
  aciklama: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: bosluk.l,
    rowGap: bosluk.xs,
  },
  aciklamaOgesi: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: bosluk.xs,
  },
});
