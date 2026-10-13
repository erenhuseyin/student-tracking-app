// Yönetim ekranlarının ortak iskeleti: filtre çubuğu + "Yeni" + sonuçlar + seçilen kaydın paneli.
//
// Masaüstünde (>=1024) sonuçlar tablo olarak solda durur, seçilen kayıt (ya da yeni kayıt formu)
// sağda sabit genişlikte bir panelde açılır; tablo yerinde kalır. Daha dar ekranda sonuçlar kart
// satırlarıdır (`kart`), filtreler bir düğmenin arkasındadır ve panel tam ekran açılır.
//
// İskelet veri çekmez: sorgu, filtre durumu, sıralama ve sayfa ekrana aittir (sunucuda süzülen
// listeler için); burada yalnızca yükleniyor / boş / hata durumları ve yerleşim vardır.
import { Children, useMemo, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BosDurum } from '@/components/BosDurum';
import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { HataMesaji } from '@/components/HataMesaji';
import type { IkonAdi } from '@/components/Ikon';
import { IkonButon } from '@/components/IkonButon';
import { Liste } from '@/components/Liste';
import { Sayfalama } from '@/components/Sayfalama';
import { SkeletonSatir } from '@/components/Skeleton';
import { Tablo, type TabloSiralamasi, type TabloSutunu } from '@/components/Tablo';
import { type Tema, useTema } from '@/lib/tema';

const PANEL_GENISLIGI = 420;

type Props<T> = {
  // Serbest metin araması (her genişlikte görünür).
  arama?: ReactNode;
  // Diğer filtreler (Secim, Secenekler…); dar ekranda "Filtreler" düğmesinin arkasındadır.
  filtreler?: ReactNode;
  // Dar ekranda düğmede gösterilir ("Filtreler (2)").
  etkinFiltreSayisi?: number;
  yeniEtiket?: string;
  onYeni?: () => void;
  // Sonuçların üstündeki kısa bilgi (ör. "124 kullanıcı").
  ozet?: string;

  // null = henüz yüklenmedi.
  veri: T[] | null;
  hata: string | null;
  anahtar: (oge: T) => string;
  sutunlar: TabloSutunu<T>[];
  tabloEnAzGenislik?: number;
  // Dar ekrandaki kart satırı.
  kart: (oge: T) => ReactElement;
  bosIkon: IkonAdi;
  bosBaslik: string;
  bosAciklama?: string;

  seciliAnahtar?: string | null;
  // Verilmezse satırlar tıklanamaz (salt okunur tablo).
  onSec?: (oge: T) => void;
  siralama?: TabloSiralamasi | null;
  onSirala?: (sutunAnahtari: string) => void;
  sayfalama?: { sayfa: number; sayfaBoyutu: number; toplam: number; onDegis: (sayfa: number) => void };
  onYenile?: () => Promise<unknown> | void;

  // Seçilen kaydın (ya da yeni kaydın) formu; null ise panel kapalıdır.
  panel: ReactNode | null;
  panelBasligi?: string;
  onPanelKapat?: () => void;
};

export function VeriEkrani<T>({
  arama,
  filtreler,
  etkinFiltreSayisi = 0,
  yeniEtiket,
  onYeni,
  ozet,
  veri,
  hata,
  anahtar,
  sutunlar,
  tabloEnAzGenislik,
  kart,
  bosIkon,
  bosBaslik,
  bosAciklama,
  seciliAnahtar,
  onSec,
  siralama,
  onSirala,
  sayfalama,
  onYenile,
  panel,
  panelBasligi,
  onPanelKapat,
}: Props<T>) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const kenarlar = useSafeAreaInsets();
  const masaustu = tema.duzen === 'web';
  const [filtrelerAcik, setFiltrelerAcik] = useState(false);

  const yeniDugmesi =
    yeniEtiket && onYeni ? <Buton baslik={yeniEtiket} ikon="add" onPress={onYeni} /> : null;
  const sayfalamaCubugu = sayfalama && sayfalama.toplam > sayfalama.sayfaBoyutu ? <Sayfalama {...sayfalama} /> : null;
  const panelBasi = (
    <View style={styles.panelBasi}>
      <Text style={[tema.yazi.bolum, styles.esnek]} numberOfLines={1}>
        {panelBasligi}
      </Text>
      {onPanelKapat ? <IkonButon ikon="close" etiket="Kapat" onPress={onPanelKapat} /> : null}
    </View>
  );

  if (masaustu) {
    return (
      <Ekran genis>
        <View style={styles.filtreSatiri}>
          {Children.toArray(arama).map((c, i) => (
            <View key={`a${i}`} style={styles.aramaAlani}>
              {c}
            </View>
          ))}
          {Children.toArray(filtreler).map((c, i) => (
            <View key={`f${i}`} style={styles.filtreAlani}>
              {c}
            </View>
          ))}
          {yeniDugmesi ? <View style={styles.yeniAlani}>{yeniDugmesi}</View> : null}
        </View>

        <View style={styles.govde}>
          <ScrollView style={styles.esnek} contentContainerStyle={styles.sonuclar}>
            <HataMesaji mesaj={hata} />
            {ozet && veri ? <Text style={tema.yazi.kucuk}>{ozet}</Text> : null}
            {veri === null ? (
              hata ? null : (
                Array.from({ length: 5 }, (_, i) => <SkeletonSatir key={i} />)
              )
            ) : veri.length === 0 ? (
              hata ? null : (
                <BosDurum ikon={bosIkon} baslik={bosBaslik} aciklama={bosAciklama} />
              )
            ) : (
              <Tablo
                veri={veri}
                // Panel açıkken tabloya kalan yer daralır: ikincil sütunlar gizlenir, ayrıntı panelde.
                sutunlar={panel ? sutunlar.filter((s) => !s.ikincil) : sutunlar}
                anahtar={anahtar}
                onPress={onSec}
                seciliAnahtar={seciliAnahtar}
                siralama={siralama}
                onSirala={onSirala}
                enAzGenislik={panel ? undefined : tabloEnAzGenislik}
              />
            )}
            {sayfalamaCubugu}
          </ScrollView>

          {panel ? (
            <View style={styles.panel}>
              {panelBasi}
              <ScrollView contentContainerStyle={styles.panelIcerigi} keyboardShouldPersistTaps="handled">
                {panel}
              </ScrollView>
            </View>
          ) : null}
        </View>
      </Ekran>
    );
  }

  const filtreSayisi = Children.count(filtreler);
  return (
    <Ekran>
      {arama}
      {filtreSayisi > 0 || yeniDugmesi ? (
        <View style={styles.darEylemler}>
          {filtreSayisi > 0 ? (
            <View style={styles.esnek}>
              <Buton
                tur="ikincil"
                ikon="options-outline"
                baslik={etkinFiltreSayisi > 0 ? `Filtreler (${etkinFiltreSayisi})` : 'Filtreler'}
                onPress={() => setFiltrelerAcik((a) => !a)}
              />
            </View>
          ) : null}
          {yeniDugmesi ? <View style={styles.esnek}>{yeniDugmesi}</View> : null}
        </View>
      ) : null}
      {filtrelerAcik ? <View style={styles.darFiltreler}>{filtreler}</View> : null}

      <Liste
        veri={veri}
        hata={hata}
        anahtar={anahtar}
        satir={kart}
        bosIkon={bosIkon}
        bosBaslik={bosBaslik}
        bosAciklama={bosAciklama}
        ust={ozet ? <Text style={tema.yazi.kucuk}>{ozet}</Text> : undefined}
        alt={sayfalamaCubugu ?? undefined}
        onYenile={onYenile}
      />

      <Modal visible={panel !== null} animationType="slide" onRequestClose={onPanelKapat}>
        <View style={[styles.tamEkranPanel, { paddingTop: kenarlar.top }]}>
          <View style={styles.tamEkranBasi}>{panelBasi}</View>
          <ScrollView
            contentContainerStyle={[styles.panelIcerigi, { paddingBottom: tema.bosluk.l + kenarlar.bottom }]}
            keyboardShouldPersistTaps="handled"
          >
            {panel}
          </ScrollView>
        </View>
      </Modal>
    </Ekran>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    esnek: {
      flex: 1,
    },
    filtreSatiri: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'flex-end',
      gap: t.bosluk.m,
    },
    aramaAlani: {
      flexGrow: 1,
      flexBasis: 220,
      maxWidth: 320,
    },
    filtreAlani: {
      flexGrow: 1,
      flexBasis: 160,
      maxWidth: 230,
    },
    yeniAlani: {
      marginLeft: 'auto',
    },
    govde: {
      flex: 1,
      flexDirection: 'row',
      gap: t.bosluk.l,
      minHeight: 0,
    },
    sonuclar: {
      gap: t.bosluk.m,
      paddingBottom: t.bosluk.l,
    },
    panel: {
      width: PANEL_GENISLIGI,
      backgroundColor: t.renkler.zemin,
      borderWidth: 1,
      borderColor: t.renkler.ayirici,
      borderRadius: t.yaricap.l,
      overflow: 'hidden',
    },
    panelBasi: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.s,
      minHeight: 56,
      paddingLeft: t.bosluk.l,
      paddingRight: t.bosluk.xs,
      backgroundColor: t.renkler.yuzey,
      borderBottomWidth: 1,
      borderBottomColor: t.renkler.ayirici,
    },
    panelIcerigi: {
      gap: t.bosluk.m,
      padding: t.bosluk.l,
    },
    darEylemler: {
      flexDirection: 'row',
      gap: t.bosluk.m,
    },
    darFiltreler: {
      gap: t.bosluk.m,
    },
    tamEkranPanel: {
      flex: 1,
      backgroundColor: t.renkler.zemin,
    },
    tamEkranBasi: {
      backgroundColor: t.renkler.yuzey,
    },
  });
}
