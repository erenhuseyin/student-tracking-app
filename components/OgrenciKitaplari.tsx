// Bir öğrencinin okuduğu kitaplar. `duzenlenebilir` (sınıfın öğretmeni, kurum admini) verilirse
// kitap eklenir, durumu değiştirilir ve silinir; veli salt okunur görür. Kendi kaydırmasını yapar.
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BosDurum } from '@/components/BosDurum';
import { Buton } from '@/components/Buton';
import { Girdi } from '@/components/Girdi';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { OnayButonu } from '@/components/OnayButonu';
import { Rozet } from '@/components/Rozet';
import { Secenekler } from '@/components/Secenekler';
import { Yukleniyor } from '@/components/Yukleniyor';
import { KITAP_DURUMU_ETIKETLERI, kitapDurumunuAyarla, kitapEkle, kitaplariGetir, kitapSil } from '@/lib/kitaplar';
import { ogrenciGetir } from '@/lib/ogrenciler';
import { tarihiBicimle } from '@/lib/tarih';
import { type Tema, useTema } from '@/lib/tema';
import { KITAP_DURUMLARI, type KitapDurumu, type KitapOkuma, type Ogrenci } from '@/lib/tipler';

const SECENEKLER = KITAP_DURUMLARI.map((d) => ({ deger: d, etiket: KITAP_DURUMU_ETIKETLERI[d] }));
const mesajaCevir = (e: unknown) => (e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');

export function OgrenciKitaplari({ ogrenciId, duzenlenebilir = false }: { ogrenciId: string; duzenlenebilir?: boolean }) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const [ogrenci, setOgrenci] = useState<Ogrenci | null>(null);
  const [kitaplar, setKitaplar] = useState<KitapOkuma[] | null>(null);
  const [baslik, setBaslik] = useState('');
  const [yazar, setYazar] = useState('');
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const yenile = useCallback(async () => {
    try {
      const [o, k] = await Promise.all([ogrenciGetir(ogrenciId), kitaplariGetir([ogrenciId])]);
      setOgrenci(o);
      setKitaplar(k);
    } catch (e) {
      setHata(mesajaCevir(e));
    }
  }, [ogrenciId]);

  useFocusEffect(
    useCallback(() => {
      setHata(null);
      yenile();
    }, [yenile]),
  );

  const calistir = async (islem: () => Promise<void>) => {
    setMesgul(true);
    setHata(null);
    try {
      await islem();
      await yenile();
    } catch (e) {
      setHata(mesajaCevir(e));
    } finally {
      setMesgul(false);
    }
  };

  const ekle = () =>
    calistir(async () => {
      if (!ogrenci) return;
      await kitapEkle(ogrenci.kurum_id, ogrenci.id, baslik, yazar);
      setBaslik('');
      setYazar('');
    });

  if (!kitaplar) return hata ? <HataMesaji mesaj={hata} /> : <Yukleniyor />;

  const rozetRengi = (d: KitapDurumu) =>
    d === 'bitti'
      ? { renk: tema.renkler.basari, zemin: tema.renkler.basariSoluk, ikon: 'checkmark-circle' as const }
      : d === 'okuyor'
        ? { renk: tema.renkler.ana, zemin: tema.renkler.anaSoluk, ikon: 'book-outline' as const }
        : { renk: tema.renkler.metinIkincil, zemin: tema.renkler.ayirici, ikon: 'ellipse-outline' as const };

  return (
    <ScrollView style={styles.kaydirma} contentContainerStyle={styles.icerik} keyboardShouldPersistTaps="handled">
      {duzenlenebilir ? (
        <Kart>
          <Girdi etiket="Kitabın adı" value={baslik} onChangeText={setBaslik} editable={!mesgul} maxLength={160} />
          <Girdi etiket="Yazar (isteğe bağlı)" value={yazar} onChangeText={setYazar} editable={!mesgul} maxLength={120} />
          <Buton ikon="add" baslik="Kitap Ekle" onPress={ekle} yukleniyor={mesgul} />
        </Kart>
      ) : null}
      <HataMesaji mesaj={hata} />

      {kitaplar.length === 0 ? <BosDurum ikon="book-outline" baslik="Henüz kitap kaydı yok" /> : null}

      {kitaplar.map((k) => (
        <Kart key={k.id}>
          <View style={styles.ust}>
            <View style={styles.kunye}>
              <Text style={tema.yazi.bolum}>{k.baslik}</Text>
              {k.yazar ? <Text style={tema.yazi.kucuk}>{k.yazar}</Text> : null}
            </View>
            {duzenlenebilir ? null : <Rozet metin={KITAP_DURUMU_ETIKETLERI[k.durum]} {...rozetRengi(k.durum)} />}
          </View>
          <Text style={tema.yazi.kucuk}>
            {[
              k.baslama_tarihi ? `Başladı: ${tarihiBicimle(k.baslama_tarihi)}` : null,
              k.bitis_tarihi ? `Bitirdi: ${tarihiBicimle(k.bitis_tarihi)}` : null,
            ]
              .filter(Boolean)
              .join(' · ') || 'Henüz başlamadı'}
          </Text>
          {duzenlenebilir ? (
            <>
              <Secenekler secenekler={SECENEKLER} secili={k.durum} onSec={(d) => calistir(() => kitapDurumunuAyarla(k, d))} pasif={mesgul} />
              <OnayButonu etiket="Kaydı Sil" onOnay={() => calistir(() => kitapSil(k.id))} />
            </>
          ) : null}
        </Kart>
      ))}
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
      alignItems: 'flex-start',
      gap: t.bosluk.s,
    },
    kunye: {
      flex: 1,
      gap: t.bosluk.xs,
    },
  });
}
