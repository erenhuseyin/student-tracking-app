// Edge Function çağrısı: sunucunun `{ hata: '...' }` gövdesindeki Türkçe mesajı Error'a çevirir.
// Yetki kontrolü her zaman sunucudadır; burada yalnızca çağrı yapılır.
import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

export async function edgeFonksiyonuCagir<T = unknown>(
  ad: string,
  istekGovdesi: Record<string, unknown>,
  varsayilanMesaj: string,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(ad, { body: istekGovdesi });
  if (error) {
    let mesaj = varsayilanMesaj;
    if (error instanceof FunctionsHttpError) {
      try {
        const hataGovdesi = await error.context.json();
        if (typeof hataGovdesi?.hata === 'string') mesaj = hataGovdesi.hata;
      } catch {
        // gövde JSON değilse varsayılan mesaj kalır
      }
    }
    throw new Error(mesaj);
  }
  return data as T;
}
