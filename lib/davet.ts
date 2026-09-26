import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

// Davet edilebilecek roller (süper admin API'den verilmez).
export type DavetRolu = 'kurum_admin' | 'ogretmen' | 'veli';

export type DavetIstegi = {
  email: string;
  ad_soyad: string;
  rol: DavetRolu;
  // Yalnızca süper admin için zorunlu; kurum admini için sunucu kendi kurumunu kullanır.
  kurum_id?: string;
  // Yalnızca rol = 'ogretmen'
  sinif_idleri?: string[];
  // Yalnızca rol = 'veli'
  ogrenci_idleri?: string[];
};

// Erişim: yalnızca süper admin (kurum_admin daveti) ve kurum admini (kendi kurumuna).
// Yetki kontrolü sunucudadır (supabase/functions/davet-gonder); burada yalnızca çağrı yapılır.
export async function davetGonder(istek: DavetIstegi): Promise<{ kullanici_id: string }> {
  const { data, error } = await supabase.functions.invoke<{ kullanici_id: string }>('davet-gonder', {
    body: istek,
  });

  if (error) {
    let mesaj = 'Davet gönderilemedi.';
    if (error instanceof FunctionsHttpError) {
      try {
        const govde = await error.context.json();
        if (typeof govde?.hata === 'string') mesaj = govde.hata;
      } catch {
        // gövde JSON değilse varsayılan mesaj kalır
      }
    }
    throw new Error(mesaj);
  }
  if (!data) throw new Error('Davet gönderilemedi.');
  return data;
}
