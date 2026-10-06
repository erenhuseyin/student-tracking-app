// Bir sınıfın haftalık yoklama tablosu ve katılım listesi. Öğretmen ve kurum admini ekranlarının
// ortak gövdesi: `onGunSec` (o günün yoklamasını aç) ve `onDersGunleri` (ders günlerini düzenle)
// yalnızca öğretmen ekranında verilir; verilmezse görünüm salt okunurdur.
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BosDurum } from '@/components/BosDurum';
import { Buton } from '@/components/Buton';
import { HaftalikYoklamaTablosu } from '@/components/HaftalikYoklamaTablosu';
import { HaftaSecici } from '@/components/HaftaSecici';
import { HataMesaji } from '@/components/HataMesaji';
import { Ikon } from '@/components/Ikon';
import { KatilimListesi, SON_HAFTA_SAYISI } from '@/components/KatilimListesi';
import { Secenekler } from '@/components/Secenekler';
import { Yukleniyor } from '@/components/Yukleniyor';
import { dersPlanlariniGetir } from '@/lib/dersPlani';
import { haftadakiler, haftaninPlani, haftaSutunlari, islenmemisGunler } from '@/lib/katilim';
import { bugununTarihi, gunBasligi, GUN_KISA_ADLARI, gunEkle, haftaBaslangici } from '@/lib/tarih';
import { bosluk, renkler, yaricap, yazi } from '@/lib/tema';
import type { Ogrenci, SinifDersPlani } from '@/lib/tipler';
import { sinifYoklamalariniGetir, type YoklamaKaydi } from '@/lib/yoklama';

type Gorunum = 'tablo' | 'liste';

const GORUNUMLER: { deger: Gorunum; etiket: string }[] = [
  { deger: 'tablo', etiket: 'Tablo' },
  { deger: 'liste', etiket: 'Katılım listesi' },
];

type Veri = { ogrenciler: Ogrenci[]; yoklamalar: YoklamaKaydi[]; planlar: SinifDersPlani[] };

type Props = {
  sinifId: string;
  onGunSec?: (tarih: string) => void;
  onDersGunleri?: () => void;
};

export function SinifKatilimi({ sinifId, onGunSec, onDersGunleri }: Props) {
  const [pazartesi, setPazartesi] = useState(() => haftaBaslangici(bugununTarihi()));
  const [gorunum, setGorunum] = useState<Gorunum>('tablo');
  const [veri, setVeri] = useState<Veri | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let iptal = false;
      setHata(null);
      // Katılım listesindeki "son 4 hafta" için seçili haftadan 3 hafta geriye kadar okunur.
      Promise.all([
        sinifYoklamalariniGetir(sinifId, gunEkle(pazartesi, -7 * (SON_HAFTA_SAYISI - 1)), gunEkle(pazartesi, 6)),
        dersPlanlariniGetir(sinifId),
      ])
        .then(([yoklama, planlar]) => {
          if (!iptal) setVeri({ ...yoklama, planlar });
        })
        .catch((e: Error) => {
          if (!iptal) setHata(e.message);
        });
      return () => {
        iptal = true;
      };
    }, [sinifId, pazartesi]),
  );

  const planGunleri = veri ? haftaninPlani(veri.planlar, pazartesi) : null;
  const haftaninKayitlari = veri ? haftadakiler(veri.yoklamalar, pazartesi) : [];
  const sutunlar = haftaSutunlari(planGunleri, haftaninKayitlari, pazartesi);
  const islenmemis = islenmemisGunler(planGunleri, haftaninKayitlari, pazartesi, bugununTarihi());

  return (
    <View style={styles.kapsayici}>
      <HaftaSecici pazartesi={pazartesi} onDegis={setPazartesi} />
      <Secenekler secenekler={GORUNUMLER} secili={gorunum} onSec={setGorunum} />
      <HataMesaji mesaj={hata} />

      {veri === null ? (
        hata ? null : (
          <Yukleniyor />
        )
      ) : veri.ogrenciler.length === 0 ? (
        <BosDurum ikon="people-outline" baslik="Bu sınıfta öğrenci yok" />
      ) : (
        <ScrollView style={styles.kaydirma} contentContainerStyle={styles.icerik}>
          {planGunleri ? (
            <Text style={yazi.kucuk}>
              Ders günleri: {planGunleri.map((g) => GUN_KISA_ADLARI[g - 1]).join(' · ')} (haftada {planGunleri.length} ders)
            </Text>
          ) : (
            <View style={styles.bilgi}>
              <Ikon ad="calendar-outline" boyut={20} renk={renkler.vurguKoyu} />
              <Text style={[yazi.kucuk, styles.bilgiMetni]}>
                Bu hafta için ders günleri belirlenmemiş. Tabloda yalnızca yoklaması alınmış günler görünür.
              </Text>
            </View>
          )}
          {/* Plan bu haftadan itibaren geçerli olur; geçmiş haftada buton yanıltıcı olurdu. */}
          {!planGunleri && onDersGunleri && pazartesi === haftaBaslangici(bugununTarihi()) ? (
            <Buton tur="ikincil" ikon="calendar-outline" baslik="Ders Günlerini Belirle" onPress={onDersGunleri} />
          ) : null}

          {islenmemis.length > 0 ? (
            <View style={[styles.bilgi, styles.uyari]}>
              <Ikon ad="alert-circle-outline" boyut={20} renk={renkler.uyari} />
              <Text style={[yazi.kucuk, styles.bilgiMetni, styles.uyariMetni]}>
                {islenmemis.length} ders gününün yoklaması alınmadı: {islenmemis.map(gunBasligi).join(', ')}
              </Text>
            </View>
          ) : null}

          {gorunum === 'liste' ? (
            <KatilimListesi ogrenciler={veri.ogrenciler} yoklamalar={veri.yoklamalar} pazartesi={pazartesi} />
          ) : sutunlar.length === 0 ? (
            <BosDurum
              ikon="calendar-outline"
              baslik="Bu hafta gösterilecek ders yok"
              aciklama="Ders günleri belirlenince ya da yoklama alınınca burada görünür."
            />
          ) : (
            <HaftalikYoklamaTablosu
              ogrenciler={veri.ogrenciler}
              sutunlar={sutunlar}
              yoklamalar={haftaninKayitlari}
              onGunSec={onGunSec}
            />
          )}
          {gorunum === 'tablo' && onGunSec && sutunlar.length > 0 ? (
            <Text style={yazi.kucuk}>Bir günün yoklamasını almak ya da düzeltmek için gün başlığına dokunun.</Text>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  kapsayici: {
    flex: 1,
    gap: bosluk.m,
  },
  kaydirma: {
    flex: 1,
    // Kart gölgeleri kenarda kesilmesin.
    marginHorizontal: -bosluk.xs,
  },
  icerik: {
    gap: bosluk.m,
    paddingHorizontal: bosluk.xs,
    paddingBottom: bosluk.l,
  },
  bilgi: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: bosluk.s,
    padding: bosluk.m,
    borderRadius: yaricap.m,
    backgroundColor: renkler.vurguSoluk,
  },
  bilgiMetni: {
    flex: 1,
  },
  uyari: {
    backgroundColor: renkler.uyariSoluk,
  },
  uyariMetni: {
    color: renkler.uyari,
  },
});
