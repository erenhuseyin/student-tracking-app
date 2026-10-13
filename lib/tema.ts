// Tasarım belirteçleri ("Defter" konsepti, 2026-10-06 yeniden tasarımı). Ekranlar ve bileşenler
// renk, boşluk, yazı ve köşe değerlerini buradan alır; sabit renk kodu ya da ölçü yazmaz.
//
// `useTema()` render içinde çağrılır; kullanıcının tema tercihine (bkz. lib/temaTercihi.tsx —
// açık/karanlık/sistem, cihazda kalıcı) ya da "sistem" ise OS temasına göre tam belirteç setini
// döndürür. Her bileşen kendi stilini `const t = useTema(); const styles = useMemo(() =>
// StyleSheet.create({...}), [t]);` deseniyle render sırasında kurar — React Native'de
// `StyleSheet.create` genelde modül kapsamında (import anında, hook kullanılamayan bir yerde)
// çağrıldığı için gerçek karanlık mod bunu render-içi bir çağrıya taşımayı gerektirir.
import { Platform, useColorScheme, useWindowDimensions } from 'react-native';
import type { Stack } from 'expo-router';
import type { ComponentProps } from 'react';
import type { TextStyle, ViewStyle } from 'react-native';

import { marka } from '@/lib/marka';
import { useTemaTercihi } from '@/lib/temaTercihi';
import type { YoklamaDurumu } from '@/lib/tipler';

// Rengi beyazla karıştırıp opak, soluk bir ton üretir (#RRGGBB bekler). Marka başına ayrı
// soluk renk tanımlamamak için `anaSoluk` bununla türetilir.
function solukTon(hex: string, oran = 0.88): string {
  const sayi = parseInt(hex.slice(1), 16);
  const kanal = (kaydirma: number) => {
    const deger = (sayi >> kaydirma) & 0xff;
    return Math.round(deger + (255 - deger) * oran)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${kanal(16)}${kanal(8)}${kanal(0)}`;
}

const m = marka.renkler;

// Manrope ağırlıkları. Özel fontta `fontWeight` glif değiştirmez — doğru kalınlık için her
// zaman doğru `fontFamily` (ağırlık varyantı) seçilmeli. `app/_layout.tsx` bu dört ağırlığı
// `useFonts` ile yükler; o yüklenene kadar splash ekranı açık kalır.
export const yaziTipi = {
  duzenli: 'Manrope_400Regular',
  orta: 'Manrope_500Medium',
  yariKalin: 'Manrope_600SemiBold',
  kalin: 'Manrope_700Bold',
} as const;

export const bosluk = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const;

// Ekranın yatay kenar boşluğu: mobilde dar, web'de geniş (bkz. Ekran.tsx).
export const kenarBosluklari = { mobil: 20, web: 32 } as const;

export const yaricap = { s: 8, m: 12, l: 16, tam: 999 } as const;

// Asgari dokunma yüksekliği; veli ekranlarında `buyuk` kullanılır.
export const dokunmaAlani = { normal: 48, buyuk: 56 } as const;

// Markadan bağımsız, sabit durum renkleri (2026-10-06 "Defter" paleti).
const DURUM_RENKLERI = {
  basariBg: '#EAF4E8',
  basariFg: '#1E6B2A',
  uyariBg: '#FDF1DC',
  uyariFg: '#A35C00',
  hataBg: '#FBE4E2',
  hataFg: '#B3261E',
  bilgiBg: '#E6EEF5',
  bilgiFg: '#2B5A7E',
} as const;

// Açık tema renkleri — markaya göre değişenler: ana (buton, başlık; üstünde beyaz yazı
// okunmalı), anaParlak (büyük vurgu: ikon, ilerleme çubuğu, grafik — METİN RENGİ OLARAK
// KULLANILMAZ, kontrastı yetmez), anaSoluk (seçili satır, ikon kutusu zemini), vurgu (YALNIZCA
// dekoratif: çizgi, rozet zemini, grafik ikinci serisi — metin olarak kullanılmaz), vurguKoyu
// (vurgu tonunda metin), vurguSoluk (tablo başlığı, ikincil kart zemini), zemin (ekran arka
// planı), ayirici (kenarlık/ayırıcı çizgi, gölgenin yerini alır).
const ACIK: Renkler = {
  zemin: m.zemin ?? '#FAF8F4',
  yuzey: '#FFFFFF',
  ana: m.ana,
  anaUstu: '#FFFFFF',
  anaUzeriMetin: '#FFFFFF',
  anaParlak: m.anaParlak ?? m.ana,
  anaSoluk: m.anaSoluk ?? solukTon(m.ana),
  vurgu: m.vurgu ?? '#CBD2D9',
  vurguKoyu: m.vurguKoyu ?? '#5A5A5A',
  vurguSoluk: m.vurguSoluk ?? '#EEF1F4',
  metin: '#1C241D',
  metinIkincil: '#655F53',
  kenarlik: '#C9C5BC',
  ayirici: m.ayirici ?? '#E4E7EB',
  basari: DURUM_RENKLERI.basariFg,
  basariSoluk: DURUM_RENKLERI.basariBg,
  uyari: DURUM_RENKLERI.uyariFg,
  uyariSoluk: DURUM_RENKLERI.uyariBg,
  hata: DURUM_RENKLERI.hataFg,
  hataSoluk: DURUM_RENKLERI.hataBg,
  bilgi: DURUM_RENKLERI.bilgiFg,
  bilgiSoluk: DURUM_RENKLERI.bilgiBg,
};

// Karanlık tema — sabit değerler (2026-10-06 brief'inden). Ana renk olarak markanın
// `anaParlak`'ı kullanılır (koyu zeminde `ana` genelde çok koyu kalır ve okunmaz).
const KARANLIK: Renkler = {
  zemin: '#121611',
  yuzey: '#1B211A',
  ana: m.anaParlak ?? m.ana,
  anaUstu: '#121611',
  anaUzeriMetin: '#121611',
  anaParlak: m.anaParlak ?? m.ana,
  anaSoluk: '#1F3320',
  vurgu: '#C2AD86',
  vurguKoyu: '#C2AD86',
  vurguSoluk: '#2A261E',
  metin: '#EDEAE3',
  metinIkincil: '#A9A497',
  kenarlik: '#2C3329',
  ayirici: '#2C3329',
  basari: DURUM_RENKLERI.basariFg,
  basariSoluk: DURUM_RENKLERI.basariBg,
  uyari: DURUM_RENKLERI.uyariFg,
  uyariSoluk: DURUM_RENKLERI.uyariBg,
  hata: DURUM_RENKLERI.hataFg,
  hataSoluk: DURUM_RENKLERI.hataBg,
  bilgi: DURUM_RENKLERI.bilgiFg,
  bilgiSoluk: DURUM_RENKLERI.bilgiBg,
};

type Renkler = {
  zemin: string;
  yuzey: string;
  ana: string;
  anaUstu: string;
  anaUzeriMetin: string;
  anaParlak: string;
  anaSoluk: string;
  vurgu: string;
  vurguKoyu: string;
  vurguSoluk: string;
  metin: string;
  metinIkincil: string;
  kenarlik: string;
  ayirici: string;
  basari: string;
  basariSoluk: string;
  uyari: string;
  uyariSoluk: string;
  hata: string;
  hataSoluk: string;
  bilgi: string;
  bilgiSoluk: string;
};

function yaziOlcegi(r: Renkler): Record<string, TextStyle> {
  // bolum/altBaslik aynı stile işaret eder (iki isim de bir geçiş dönemi boyunca birlikte yaşar,
  // bkz. dosya başı notu). `etiket` ve `kucuk` AYNI DEĞİLDİR: `etiket` yalnızca form alanı
  // etiketleri için (vurgu tonunda, brief'in "vurguKoyu: vurgu tonunda metin gerektiğinde"
  // kuralı) — genel ikincil/açıklama metninde kullanılmaz, onun için `kucuk` vardır (nötr).
  const bolum: TextStyle = { fontFamily: yaziTipi.yariKalin, fontSize: 18, color: r.metin };
  return {
    baslik: { fontFamily: yaziTipi.yariKalin, fontSize: 24, color: r.metin },
    bolum,
    altBaslik: bolum,
    govde: { fontFamily: yaziTipi.duzenli, fontSize: 15, lineHeight: 22.5, color: r.metin },
    etiket: { fontFamily: yaziTipi.orta, fontSize: 12, color: r.vurguKoyu },
    kucuk: { fontFamily: yaziTipi.duzenli, fontSize: 13, color: r.metinIkincil },
    metrik: { fontFamily: yaziTipi.kalin, fontSize: 32, color: r.metin, fontVariant: ['tabular-nums'] as TextStyle['fontVariant'] },
  };
}

type StackSecenekleri = Exclude<ComponentProps<typeof Stack>['screenOptions'], undefined | ((...args: never[]) => unknown)>;

// ---------------------------------------------------------------------------
// Render-içi tema — gerçek karanlık mod. bkz. dosya başı notu.
// ---------------------------------------------------------------------------
export type Tema = {
  mod: 'acik' | 'karanlik';
  renkler: Renkler;
  yazi: ReturnType<typeof yaziOlcegi>;
  bosluk: typeof bosluk;
  kenarBosluklari: typeof kenarBosluklari;
  yaricap: typeof yaricap;
  dokunmaAlani: typeof dokunmaAlani;
  yaziTipi: typeof yaziTipi;
  yoklamaRenkleri: Record<YoklamaDurumu, { renk: string; soluk: string }>;
  katilimRengi: (oran: number | null) => { renk: string; soluk: string };
  baslikCubuguSecenekleri: StackSecenekleri;
};

function temaKur(mod: 'acik' | 'karanlik'): Tema {
  const r = mod === 'acik' ? ACIK : KARANLIK;
  const yoklama: Record<YoklamaDurumu, { renk: string; soluk: string }> = {
    geldi: { renk: r.basari, soluk: r.basariSoluk },
    gelmedi: { renk: r.hata, soluk: r.hataSoluk },
    gec: { renk: r.uyari, soluk: r.uyariSoluk },
    mazeretli: { renk: r.metinIkincil, soluk: r.ayirici },
  };
  return {
    mod,
    renkler: r,
    yazi: yaziOlcegi(r),
    bosluk,
    kenarBosluklari,
    yaricap,
    dokunmaAlani,
    yaziTipi,
    yoklamaRenkleri: yoklama,
    katilimRengi: (oran) => {
      if (oran === null) return { renk: r.metinIkincil, soluk: r.ayirici };
      if (oran >= 0.8) return { renk: r.basari, soluk: r.basariSoluk };
      if (oran >= 0.5) return { renk: r.uyari, soluk: r.uyariSoluk };
      return { renk: r.hata, soluk: r.hataSoluk };
    },
    baslikCubuguSecenekleri: {
      headerStyle: { backgroundColor: r.yuzey },
      headerTintColor: r.ana,
      headerTitleStyle: { color: r.metin, fontFamily: yaziTipi.yariKalin, fontSize: 18 },
      headerShadowVisible: false,
      headerBackButtonDisplayMode: 'minimal',
      headerTitleAlign: 'center',
      contentStyle: { backgroundColor: r.zemin },
    },
  };
}

// İki modun belirteç setleri sabit girdilerle kurulur; her çağrı aynı referansı döner
// (modüle özel önbellek) — `useTema()` böylece her render'da yeni nesne üretmez.
const TEMALAR: Record<'acik' | 'karanlik', Tema> = { acik: temaKur('acik'), karanlik: temaKur('karanlik') };

// Geçişi yapılmış bileşenler bunu çağırır: `const t = useTema();` ardından kendi stilini
// `useMemo(() => StyleSheet.create({...}), [t])` ile render içinde kurar. OS teması `light`/
// `dark` dışında bir şey dönerse (`null`, yüklenmeden önce) açık tema kullanılır.
export function useTema(): Tema {
  const sema = useColorScheme();
  const { tercih } = useTemaTercihi();
  const mod = tercih === 'sistem' ? sema : tercih === 'karanlik' ? 'dark' : 'light';
  return TEMALAR[mod === 'dark' ? 'karanlik' : 'acik'];
}

export type Kirilma = 'mobil' | 'tablet' | 'masaustu';

// < 768 mobil (alt gezinme), 768-1023 tablet (daraltılmış sidebar), >= 1024 masaüstü
// (açık sidebar, tablo görünümü, 1200 ortalanmış içerik). Yalnızca web'de anlamlıdır;
// native tarafta pencere genişliği ekran genişliğidir (her zaman `mobil` sayılır).
export function useKirilma(): Kirilma {
  const { width } = useWindowDimensions();
  if (width >= 1024) return 'masaustu';
  if (width >= 768) return 'tablet';
  return 'mobil';
}

// Uygulamanın iki düzeni vardır ve hangisinin çizileceğine yalnızca burada karar verilir:
//   'web'   : tarayıcıda, pencere en az 768 px — kalıcı kenar çubuğu, sayfa başlığı, tablo, dar form
//             sütunu, yan panel (bkz. components/WebKabuk).
//   'mobil' : native uygulamada HER ZAMAN (tablet ve yatay telefon dahil) ve dar tarayıcı
//             penceresinde — alt sekme çubuğu, Menü ekranı, kart listesi, tam ekran panel.
// Gezinme, tablo/kart ve panel kararları buna bağlanır; `useKirilma` yalnızca 'web' düzeninin
// içindeki ince ayarlar (sütun sayısı, daraltılmış kenar çubuğu) içindir.
export type Duzen = 'web' | 'mobil';

export function useDuzen(): Duzen {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= 768 ? 'web' : 'mobil';
}
