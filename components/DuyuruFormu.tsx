// Duyuru/etkinlik ekleme ve düzenleme formu. Doğrulama ve kayıt `onKaydet`'tedir
// (lib/duyurular.ts); fırlatılan hata burada gösterilir. `kapsamlar` yalnızca yeni duyuruda
// verilir — kapsam (kurum/sınıf) sonradan değiştirilemez. `baslangic` yalnızca ilk çizimde okunur.
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Buton } from '@/components/Buton';
import { Chip } from '@/components/Chip';
import { Girdi } from '@/components/Girdi';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { Secenekler } from '@/components/Secenekler';
import { TarihGirdisi } from '@/components/TarihGirdisi';
import { DUYURU_TURU_ETIKETLERI, type DuyuruGirdisi } from '@/lib/duyurular';
import { type Tema, useTema } from '@/lib/tema';
import { DUYURU_TURLERI, type DuyuruTuru } from '@/lib/tipler';

// sinifId null: kurum geneli.
export type DuyuruKapsami = { sinifId: string | null; etiket: string };

type Props = {
  kapsamlar?: DuyuruKapsami[];
  baslangic?: DuyuruGirdisi;
  onKaydet: (girdi: DuyuruGirdisi, kapsam: DuyuruKapsami | null) => Promise<void>;
};

const TUR_SECENEKLERI = DUYURU_TURLERI.map((t) => ({ deger: t, etiket: DUYURU_TURU_ETIKETLERI[t] }));

export function DuyuruFormu({ kapsamlar, baslangic, onKaydet }: Props) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const [kapsam, setKapsam] = useState<DuyuruKapsami | null>(kapsamlar?.length === 1 ? kapsamlar[0] : null);
  const [tur, setTur] = useState<DuyuruTuru>(baslangic?.tur ?? 'duyuru');
  const [baslik, setBaslik] = useState(baslangic?.baslik ?? '');
  const [icerik, setIcerik] = useState(baslangic?.icerik ?? '');
  const [etkinlikTarihi, setEtkinlikTarihi] = useState(baslangic?.etkinlikTarihi ?? '');
  const [etkinlikSaati, setEtkinlikSaati] = useState(baslangic?.etkinlikSaati ?? '');
  const [yer, setYer] = useState(baslangic?.yer ?? '');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const kaydet = async () => {
    if (kapsamlar && !kapsam) {
      setHata('Duyurunun kime gideceğini seçin.');
      return;
    }
    setGonderiliyor(true);
    setHata(null);
    try {
      await onKaydet({ tur, baslik, icerik, etkinlikTarihi, etkinlikSaati, yer }, kapsam);
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');
      setGonderiliyor(false);
    }
  };

  return (
    <Kart>
      {kapsamlar ? (
        <View style={styles.alan}>
          <Text style={tema.yazi.etiket}>Kime</Text>
          <View style={styles.cipler}>
            {kapsamlar.map((k) => (
              <Chip
                key={k.sinifId ?? 'kurum'}
                etiket={k.etiket}
                secili={kapsam?.sinifId === k.sinifId && kapsam !== null}
                onPress={() => setKapsam(k)}
                pasif={gonderiliyor}
              />
            ))}
          </View>
        </View>
      ) : null}
      <Secenekler etiket="Tür" secenekler={TUR_SECENEKLERI} secili={tur} onSec={setTur} pasif={gonderiliyor} />
      <Girdi etiket="Başlık" value={baslik} onChangeText={setBaslik} editable={!gonderiliyor} maxLength={120} />
      {tur === 'etkinlik' ? (
        <>
          <TarihGirdisi etiket="Etkinlik tarihi" deger={etkinlikTarihi} onDegis={setEtkinlikTarihi} pasif={gonderiliyor} />
          <Girdi
            etiket="Saat (örn. 14:30)"
            value={etkinlikSaati}
            onChangeText={setEtkinlikSaati}
            editable={!gonderiliyor}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
          />
          <Girdi etiket="Yer (isteğe bağlı)" value={yer} onChangeText={setYer} editable={!gonderiliyor} maxLength={120} />
        </>
      ) : null}
      <Girdi
        etiket="İçerik"
        value={icerik}
        onChangeText={setIcerik}
        editable={!gonderiliyor}
        multiline
        maxLength={4000}
        textAlignVertical="top"
        style={styles.icerik}
      />
      {baslangic ? null : <Text style={tema.yazi.kucuk}>Kaydedince kapsamdaki kişilere bildirim gider.</Text>}
      <HataMesaji mesaj={hata} />
      <Buton baslik={baslangic ? 'Kaydet' : 'Yayınla'} onPress={kaydet} yukleniyor={gonderiliyor} />
    </Kart>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    alan: {
      gap: t.bosluk.xs,
    },
    cipler: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: t.bosluk.s,
    },
    icerik: {
      minHeight: 140,
    },
  });
}
