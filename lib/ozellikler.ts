// Müşteriye özel özellik bayrakları. Kaynak: kök kurumun `ozellikler` kolonu (yalnızca süper
// admin yazar). Müşteriye özel ekran/işlev bu bayrağın arkasına yazılır; kod tabanı çatallanmaz.
import { useOturum } from '@/lib/oturum';
import type { Json } from '@/lib/veritabani.tipleri';

// Hoca kendi sınıfını ve öğrencisini açar (varsayılan açık; RLS de bayrağa bakar).
export const OGRETMEN_KAYIT_OZELLIGI = 'ogretmen_kayit';

// Bayrak yazılmamışsa `varsayilan` (çoğu özellik varsayılan kapalı, bazıları açık).
export function ozellikAcikMi(ozellikler: Json | null | undefined, ad: string, varsayilan = false): boolean {
  if (typeof ozellikler !== 'object' || ozellikler === null || Array.isArray(ozellikler)) return varsayilan;
  const deger = ozellikler[ad];
  return typeof deger === 'boolean' ? deger : varsayilan;
}

export function useOzellik(ad: string, varsayilan = false): boolean {
  const { kokKurum } = useOturum();
  return ozellikAcikMi(kokKurum?.ozellikler, ad, varsayilan);
}
