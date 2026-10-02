// Müşteriye özel özellik bayrakları. Kaynak: kök kurumun `ozellikler` kolonu (yalnızca süper
// admin yazar). Müşteriye özel ekran/işlev bu bayrağın arkasına yazılır; kod tabanı çatallanmaz.
import { useOturum } from '@/lib/oturum';

export function useOzellik(ad: string): boolean {
  const { kokKurum } = useOturum();
  const ozellikler = kokKurum?.ozellikler;
  if (typeof ozellikler !== 'object' || ozellikler === null || Array.isArray(ozellikler)) return false;
  return ozellikler[ad] === true;
}
