// Sınıf CRUD. RLS (sinif_kurum_admin politikası) kurum_admin'in yalnızca yönettiği kurumlardaki
// (kendi kurumu + şubeleri) sınıfları yönetmesine izin verir. Kök admin birden çok kurumun
// sınıfını görebildiği için liste ve ekleme hangi kurum için yapıldığını açıkça alır.
import { supabase } from '@/lib/supabase';
import type { Sinif } from '@/lib/tipler';

function hataMesajinaCevir(mesaj: string, kod?: string): string {
  if (kod === '23503') return 'Bu sınıfta öğrenci var, önce onları başka bir sınıfa taşıyın veya silin.';
  if (/permission denied|rls/i.test(mesaj)) return 'Bu işlem için yetkiniz yok.';
  if (/network|fetch/i.test(mesaj)) return 'Bağlantı sorunu, lütfen tekrar deneyin.';
  return 'İşlem yapılamadı, lütfen tekrar deneyin.';
}

// kurumId verilmezse RLS'in izin verdiği tüm sınıflar döner (öğretmen: atandığı sınıflar).
export async function siniflariGetir(kurumId?: string): Promise<Sinif[]> {
  const sorgu = supabase.from('sinif').select('*').order('ad');
  const { data, error } = await (kurumId ? sorgu.eq('kurum_id', kurumId) : sorgu);
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
