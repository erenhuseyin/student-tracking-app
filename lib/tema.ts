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

export const renkler = {
  zemin: '#F4F6F8',
  yuzey: '#FFFFFF',
  ana: marka.renkler.ana,
  anaUstu: '#FFFFFF',
  anaSoluk: solukTon(marka.renkler.ana),
  metin: '#1F2933',
  metinIkincil: '#616E7C',
  kenarlik: '#CBD2D9',
  ayirici: '#E4E7EB',
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
  etiket: { fontSize: 13, fontWeight: '600', color: renkler.metinIkincil },
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
