// Yöneticinin ders raporu: kapsamındaki her sınıfın kademesi, hocaları, işlenen / toplam konu
// sayısı, son işlenme tarihi ve okunmamış konu notu sayısı. Sayılar sunucuda toplanır
// (public.ders_raporu, security invoker: hangi sınıfların geleceğini RLS belirler).
// Erişim: yalnızca kurum_admin; öğretmen ve veli boş liste alır.
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/veritabani.tipleri';

export type DersRaporuSatiri = Database['public']['Functions']['ders_raporu']['Returns'][number];

export async function dersRaporunuGetir(): Promise<DersRaporuSatiri[]> {
  const { data, error } = await supabase.rpc('ders_raporu');
  if (error) {
    if (/network|fetch/i.test(error.message)) throw new Error('Bağlantı sorunu, lütfen tekrar deneyin.');
    if (/ders_raporu|PGRST202/i.test(`${error.code} ${error.message}`)) throw new Error('Ders raporu henüz kurulmamış.');
    throw new Error('Ders raporu alınamadı, lütfen tekrar deneyin.');
  }
  return data ?? [];
}

export const ilerlemeOrani = (s: Pick<DersRaporuSatiri, 'islenen_konu' | 'toplam_konu'>) =>
  s.toplam_konu === 0 ? null : s.islenen_konu / s.toplam_konu;

export const hocaAdlari = (s: Pick<DersRaporuSatiri, 'hocalar'>) => (s.hocalar ? s.hocalar.split(', ') : []);
