// Erişim: yalnızca kurum_admin (yönettiği kurumların sınıfı; RLS). Bir sınıfa Excel'den
// yapıştırılan listeyle toplu öğrenci ekler. `kurumId` sınıfın kurumudur (şube sınıfıysa şube).
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { Girdi } from '@/components/Girdi';
import { HataMesaji } from '@/components/HataMesaji';
import { Ikon } from '@/components/Ikon';
import { Kart } from '@/components/Kart';
import { ogrencileriTopluEkle, type TopluEklemeSonucu } from '@/lib/ogrenciler';
import { useOturum } from '@/lib/oturum';
import { tarihiBicimle } from '@/lib/tarih';
import { type Tema, useTema } from '@/lib/tema';
import { type AktarmaSatiri, aktarmaMetniniAyristir, TOPLU_AKTARMA_SINIRI } from '@/lib/topluAktarma';

export default function TopluOgrenci() {
  const router = useRouter();
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const { sinifId, kurumId } = useLocalSearchParams<{ sinifId: string; kurumId?: string }>();
  const { kullanici } = useOturum();
  const hedefKurumId = kurumId ?? kullanici?.kurum_id;

  const [metin, setMetin] = useState('');
  const [satirlar, setSatirlar] = useState<AktarmaSatiri[] | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [sonuc, setSonuc] = useState<TopluEklemeSonucu | null>(null);

  const hataliSayisi = satirlar?.filter((s) => s.hata).length ?? 0;

  const onizle = () => {
    setHata(null);
    const ayristirilan = aktarmaMetniniAyristir(metin);
    if (ayristirilan.length === 0) {
      setHata('Liste boş. Her satıra bir öğrenci yazın ya da Excel\'den yapıştırın.');
      return;
    }
    if (ayristirilan.length > TOPLU_AKTARMA_SINIRI) {
      setHata(`Bir seferde en fazla ${TOPLU_AKTARMA_SINIRI} öğrenci eklenebilir; listeyi bölün.`);
      return;
    }
    setSatirlar(ayristirilan);
  };

  const ekle = async () => {
    if (!satirlar || !hedefKurumId) return;
    setGonderiliyor(true);
    setHata(null);
    try {
      setSonuc(await ogrencileriTopluEkle(hedefKurumId, sinifId, satirlar));
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Öğrenciler eklenemedi, lütfen tekrar deneyin.');
    } finally {
      setGonderiliyor(false);
    }
  };

  return (
    <Ekran kaydirilabilir>
      <Stack.Screen options={{ title: 'Toplu Öğrenci Ekle' }} />

      {sonuc ? (
        <Kart>
          <HataMesaji tur="basari" mesaj={`${sonuc.eklenen} öğrenci eklendi.`} />
          {sonuc.hesaplar.length > 0 ? (
            <>
              <Text style={tema.yazi.govde}>
                Veli girişleri açıldı. Velilere çocuklarının kullanıcı adını iletin; ilk PIN herkes için &quot;1234&quot;tür ve
                veli ilk girişte yenisini belirler. Kullanıcı adları Raporlar &gt; Öğrenci listesinde de yer alır.
              </Text>
              {sonuc.hesaplar.map((h) => (
                <View key={h.kullaniciAdi} style={styles.hesap}>
                  <Text style={[tema.yazi.govde, styles.satirMetinleri]}>{h.adSoyad}</Text>
                  <Text style={[tema.yazi.govde, { fontFamily: tema.yaziTipi.yariKalin }]} selectable>
                    {h.kullaniciAdi}
                  </Text>
                </View>
              ))}
            </>
          ) : null}
          {sonuc.veliHatalari.length > 0 ? (
            <>
              <Text style={tema.yazi.govde}>
                Şu öğrenciler eklendi ama veli girişleri açılamadı; öğrencinin kendi ekranından &quot;Veli Girişini Aç&quot; ile
                açabilirsiniz:
              </Text>
              {sonuc.veliHatalari.map((h, i) => (
                <Text key={`${h.adSoyad}-${i}`} style={tema.yazi.kucuk}>
                  {h.adSoyad}: {h.mesaj}
                </Text>
              ))}
            </>
          ) : null}
          <Buton baslik="Sınıfa Dön" onPress={() => router.back()} />
        </Kart>
      ) : satirlar ? (
        <>
          <Kart>
            <Text style={tema.yazi.bolum}>
              {satirlar.length} satır{hataliSayisi > 0 ? ` · ${hataliSayisi} hatalı` : ''}
            </Text>
            {satirlar.map((s) => (
              <View key={s.satirNo} style={styles.satir}>
                <Ikon
                  ad={s.hata ? 'alert-circle' : 'checkmark-circle'}
                  boyut={20}
                  renk={s.hata ? tema.renkler.hata : tema.renkler.basari}
                />
                <View style={styles.satirMetinleri}>
                  <Text style={tema.yazi.govde}>{s.adSoyad || '(ad yok)'}</Text>
                  <Text style={[tema.yazi.kucuk, s.hata ? { color: tema.renkler.hata } : null]}>
                    {s.hata ?? tarihiBicimle(s.dogumTarihi)}
                  </Text>
                </View>
              </View>
            ))}
          </Kart>
          <HataMesaji mesaj={hataliSayisi > 0 ? 'Hatalı satırları düzeltmeden ekleme yapılamaz. Listeye dönüp düzeltin.' : hata} />
          <Buton
            baslik={`${satirlar.length} Öğrenciyi Ekle`}
            onPress={ekle}
            yukleniyor={gonderiliyor}
            pasif={hataliSayisi > 0}
          />
          <Buton tur="ikincil" baslik="Listeyi Düzenle" onPress={() => setSatirlar(null)} pasif={gonderiliyor} />
        </>
      ) : (
        <Kart>
          <Text style={tema.yazi.govde}>
            Her satıra bir öğrenci yazın ya da Excel&apos;den iki sütunu kopyalayıp yapıştırın:
          </Text>
          <Text style={styles.ornek}>Ad Soyad · Doğum tarihi</Text>
          <Text style={tema.yazi.kucuk}>
            Örnek: Elif Kaya; 03.03.2019 — her öğrenci için veli girişi de açılır (kullanıcı adı addan üretilir, ilk PIN 1234).
          </Text>
          <Girdi
            etiket="Öğrenci listesi"
            value={metin}
            onChangeText={setMetin}
            multiline
            autoCapitalize="words"
            autoCorrect={false}
            textAlignVertical="top"
            style={styles.liste}
          />
          <HataMesaji mesaj={hata} />
          <Buton baslik="Önizle" onPress={onizle} />
        </Kart>
      )}
    </Ekran>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    hesap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.m,
    },
    satir: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.m,
    },
    satirMetinleri: {
      flex: 1,
    },
    ornek: {
      ...t.yazi.govde,
      fontFamily: t.yaziTipi.yariKalin,
    },
    liste: {
      minHeight: 200,
    },
  });
}
