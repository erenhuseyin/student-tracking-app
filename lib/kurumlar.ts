// Kurum listeleme/ekleme. RLS (kurum_super_admin politikası) yalnızca super_admin'in
// insert/select yapmasına izin verir; bu yüzden servis fonksiyonuna ek yetki kontrolü
// gerekmez — RLS zaten reddeder.
import { supabase } from '@/lib/supabase';
import type { Kurum } from '@/lib/tipler';

function hataMesajinaCevir(mesaj: string): string {
  if (/permission denied|rls/i.test(mesaj)) return 'Bu işlem için yetkiniz yok.';
  if (/network|fetch/i.test(mesaj)) return 'Bağlantı sorunu, lütfen tekrar deneyin.';
  return 'İşlem yapılamadı, lütfen tekrar deneyin.';
}

export async function kurumlariGetir(): Promise<Kurum[]> {
  const { data, error } = await supabase.from('kurum').select('*').order('ad');
  if (error) throw new Error(hataMesajinaCevir(error.message));
  return data;
}

export async function kurumEkle(ad: string): Promise<Kurum> {
  const temizAd = ad.trim();
  if (!temizAd) throw new Error('Kurum adı gerekli.');

  const { data, error } = await supabase.from('kurum').insert({ ad: temizAd }).select().single();
  if (error) throw new Error(hataMesajinaCevir(error.message));
  return data;
}
