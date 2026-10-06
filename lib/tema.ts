// Tasarım belirteçleri. Ekranlar ve bileşenler renk, boşluk, yazı ve köşe değerlerini buradan
// alır; sabit renk kodu ya da ölçü yazmaz. `ana` renk markaya göre değişir (bkz. lib/marka.ts).
// Yalnızca açık tema var (app.config.ts > userInterfaceStyle: 'light').
import type { Stack } from 'expo-router';
import type { ComponentProps } from 'react';
import type { TextStyle, ViewStyle } from 'react-native';

import { marka } from '@/lib/marka';
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

// Markaya göre değişenler: ana (buton, başlık; üstünde beyaz yazı okunmalı), anaParlak (büyük
// vurgu: ikon, rozet — küçük metinde kullanılmaz, kontrastı yetmez), vurgu (süsleme, ayraç),
// vurguKoyu (etiket gibi küçük metin vurgusu), zemin ve soluk tonlar. Metin ve durum renkleri ortaktır.
export const renkler = {
  zemin: m.zemin ?? '#F4F6F8',
  yuzey: '#FFFFFF',
  ana: m.ana,
  anaUstu: '#FFFFFF',
  anaParlak: m.anaParlak ?? m.ana,
  anaSoluk: m.anaSoluk ?? solukTon(m.ana),
  vurgu: m.vurgu ?? '#CBD2D9',
  vurguKoyu: m.vurguKoyu ?? '#5A5A5A',
  vurguSoluk: m.vurguSoluk ?? '#EEF1F4',
  metin: '#1F1F1F',
  metinIkincil: '#5A5A5A',
  kenarlik: '#C9C5BC',
  ayirici: m.ayirici ?? '#E4E7EB',
  hata: '#C62828',
  hataSoluk: '#FDECEC',
  basari: '#2E7D32',
  basariSoluk: '#E8F5E9',
  uyari: '#B26A00',
  uyariSoluk: '#FFF4E0',
} as const;

export const bosluk = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const;

export const yaricap = { s: 8, m: 12, l: 16, tam: 999 } as const;

// Asgari dokunma yüksekliği; veli ekranlarında `buyuk` kullanılır.
export const dokunmaAlani = { normal: 48, buyuk: 56 } as const;

export const yazi = {
  baslik: { fontSize: 24, fontWeight: '700', color: renkler.metin },
  altBaslik: { fontSize: 18, fontWeight: '600', color: renkler.metin },
  govde: { fontSize: 16, color: renkler.metin },
  kucuk: { fontSize: 14, color: renkler.metinIkincil },
  etiket: { fontSize: 13, fontWeight: '600', color: renkler.vurguKoyu },
} as const satisfies Record<string, TextStyle>;

export const golge: ViewStyle = {
  shadowColor: '#000000',
  shadowOpacity: 0.06,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
};

export const yoklamaRenkleri: Record<YoklamaDurumu, { renk: string; soluk: string }> = {
  geldi: { renk: renkler.basari, soluk: renkler.basariSoluk },
  gelmedi: { renk: renkler.hata, soluk: renkler.hataSoluk },
  gec: { renk: renkler.uyari, soluk: renkler.uyariSoluk },
};

// Katılım oranı (0-1) rengi: %80 ve üstü iyi, %50 ve üstü dikkat, altı sorunlu. Oran yoksa nötr.
export function katilimRengi(oran: number | null): { renk: string; soluk: string } {
  if (oran === null) return { renk: renkler.metinIkincil, soluk: renkler.ayirici };
  if (oran >= 0.8) return { renk: renkler.basari, soluk: renkler.basariSoluk };
  if (oran >= 0.5) return { renk: renkler.uyari, soluk: renkler.uyariSoluk };
  return { renk: renkler.hata, soluk: renkler.hataSoluk };
}

type StackSecenekleri = Exclude<ComponentProps<typeof Stack>['screenOptions'], undefined | ((...args: never[]) => unknown)>;

// Rol gruplarının `_layout.tsx` dosyalarında ortak başlık çubuğu görünümü.
export const baslikCubuguSecenekleri: StackSecenekleri = {
  headerStyle: { backgroundColor: renkler.yuzey },
  headerTintColor: renkler.ana,
  headerTitleStyle: { color: renkler.metin, fontWeight: '600' },
  headerShadowVisible: false,
  headerBackButtonDisplayMode: 'minimal',
  headerTitleAlign: 'center',
  contentStyle: { backgroundColor: renkler.zemin },
};
