// Ekran iskeleti: zemin rengi, kenar boşlukları ve güvenli alan. Formlarda `kaydirilabilir`
// verilir (kaydırma + klavye kaçınması). Başlık çubuğu olmayan ekranlar (giriş, durum
// ekranları) `baslikCubugusuz` ile üst güvenli alanı da kendisi bırakır. `ortala` (tek kart,
// ör. giriş ekranları) dar bir genişlikte kalır; normal ekranlar masaüstünde (>=1024) tablo/
// bento grid için daha geniş bir alana (1200) yayılır. 'web' düzeninde içerik sola yaslanır (kenar
// çubuğunun yanında) ve formlar dar bir sütunda kalır: girdiler ekran boyunca gerilmez.
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TamGenislikliButon } from '@/components/Buton';
import { type Tema, useKirilma, useTema } from '@/lib/tema';

type Props = {
  children: ReactNode;
  kaydirilabilir?: boolean;
  baslikCubugusuz?: boolean;
  ortala?: boolean;
  // Tablo + yan panel gibi yatayda yer isteyen ekranlar (bkz. VeriEkrani).
  genis?: boolean;
};

const DAR_GENISLIK = 560;
const FORM_GENISLIGI = 720;
const GENIS_GENISLIK = 1200;
const EN_GENIS_GENISLIK = 1600;

export function Ekran({ children, kaydirilabilir = false, baslikCubugusuz = false, ortala = false, genis = false }: Props) {
  const tema = useTema();
  const kirilma = useKirilma();
  const kenarlar = useSafeAreaInsets();
  const styles = useMemo(() => olustur(tema), [tema]);
  const yatayGenislik = tema.duzen === 'web' ? tema.kenarBosluklari.web : tema.kenarBosluklari.mobil;
  const web = tema.duzen === 'web';
  const genislikSinirlamasi = ortala
    ? DAR_GENISLIK
    : web && kaydirilabilir && !genis
      ? FORM_GENISLIGI
      : kirilma === 'masaustu'
        ? genis
          ? EN_GENIS_GENISLIK
          : GENIS_GENISLIK
        : undefined;

  const dolgu = {
    paddingTop: tema.bosluk.l + (baslikCubugusuz ? kenarlar.top : 0),
    paddingBottom: tema.bosluk.l + kenarlar.bottom,
    paddingHorizontal: yatayGenislik,
  };
  const genislikStili = genislikSinirlamasi
    ? { maxWidth: genislikSinirlamasi + 2 * yatayGenislik, ...(web && !ortala ? { alignSelf: 'flex-start' as const } : null) }
    : null;

  if (!kaydirilabilir) {
    return (
      <View style={[styles.kok, styles.icerik, styles.doldur, genislikStili, ortala && styles.ortala, dolgu]}>
        <TamGenislikliButon.Provider value={ortala}>{children}</TamGenislikliButon.Provider>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.kok} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.icerik, styles.kaydirmaIcerigi, genislikStili, ortala && styles.ortala, dolgu]}
        keyboardShouldPersistTaps="handled"
      >
        <TamGenislikliButon.Provider value={ortala}>{children}</TamGenislikliButon.Provider>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    kok: {
      flex: 1,
      backgroundColor: t.renkler.zemin,
    },
    doldur: {
      flex: 1,
    },
    icerik: {
      gap: t.bosluk.m,
      width: '100%',
      alignSelf: 'center',
    },
    kaydirmaIcerigi: {
      flexGrow: 1,
    },
    ortala: {
      justifyContent: 'center',
    },
  });
}
