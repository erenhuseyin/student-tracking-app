// Sınıf CRUD. RLS (sinif_kurum_admin politikası) yalnızca kurum_admin'in kendi kurumundaki
// sınıfları yönetmesine izin verir; kurum_id oturumdaki kullanıcıdan alınır.
import { supabase } from '@/lib/supabase';
import type { Sinif } from '@/lib/tipler';

function hataMesajinaCevir(mesaj: string, kod?: string): string {
  if (kod === '23503') return 'Bu sınıfta öğrenci var, önce onları başka bir sınıfa taşıyın veya silin.';
  if (/permission denied|rls/i.test(mesaj)) return 'Bu işlem için yetkiniz yok.';
  if (/network|fetch/i.test(mesaj)) return 'Bağlantı sorunu, lütfen tekrar deneyin.';
  return 'İşlem yapılamadı, lütfen tekrar deneyin.';
}

export async function siniflariGetir(): Promise<Sinif[]> {
  const { data, error } = await supabase.from('sinif').select('*').order('ad');
  if (error) throw new Error(hataMesajinaCevir(error.message));
  return data;
}

export async function sinifGetir(id: string): Promise<Sinif> {
  const { data, error } = await supabase.from('sinif').select('*').eq('id', id).single();
  if (error) throw new Error(hataMesajinaCevir(error.message));
  return data;
}

export async function sinifEkle(kurumId: string, ad: string, donem: string): Promise<Sinif> {
  const temizAd = ad.trim();
  const temizDonem = donem.trim();
  if (!temizAd) throw new Error('Sınıf adı gerekli.');
  if (!temizDonem) throw new Error('Dönem gerekli.');

  const { data, error } = await supabase
    .from('sinif')
    .insert({ kurum_id: kurumId, ad: temizAd, donem: temizDonem })
    .select()
    .single();
  if (error) throw new Error(hataMesajinaCevir(error.message));
  return data;
}

export async function sinifGuncelle(id: string, ad: string, donem: string): Promise<Sinif> {
  const temizAd = ad.trim();
  const temizDonem = donem.trim();
  if (!temizAd) throw new Error('Sınıf adı gerekli.');
  if (!temizDonem) throw new Error('Dönem gerekli.');

  const { data, error } = await supabase
    .from('sinif')
    .update({ ad: temizAd, donem: temizDonem })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(hataMesajinaCevir(error.message));
  return data;
}

export async function sinifSil(id: string): Promise<void> {
  const { error } = await supabase.from('sinif').delete().eq('id', id);
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
}
