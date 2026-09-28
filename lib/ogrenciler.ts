// Öğrenci CRUD. RLS (ogrenci_kurum_admin politikası) yalnızca kurum_admin'in kendi
// kurumundaki öğrencileri yönetmesine izin verir; kurum_id oturumdaki kullanıcıdan alınır.
// dogum_tarihi biçimi: YYYY-AA-GG (native tarih seçici bu adımda kapsam dışı).
import { supabase } from '@/lib/supabase';
import type { Ogrenci } from '@/lib/tipler';

const TARIH_RE = /^\d{4}-\d{2}-\d{2}$/;

function hataMesajinaCevir(mesaj: string, kod?: string): string {
  if (kod === '23503') return 'Seçilen sınıf bulunamadı.';
  if (/permission denied|rls/i.test(mesaj)) return 'Bu işlem için yetkiniz yok.';
  if (/network|fetch/i.test(mesaj)) return 'Bağlantı sorunu, lütfen tekrar deneyin.';
  return 'İşlem yapılamadı, lütfen tekrar deneyin.';
}

function girdiyiDogrula(adSoyad: string, dogumTarihi: string): { ad_soyad: string; dogum_tarihi: string } {
  const temizAd = adSoyad.trim();
  const temizTarih = dogumTarihi.trim();
  if (!temizAd) throw new Error('Ad soyad gerekli.');
  if (!TARIH_RE.test(temizTarih)) throw new Error('Doğum tarihi YYYY-AA-GG biçiminde olmalı (örn. 2015-09-20).');
  return { ad_soyad: temizAd, dogum_tarihi: temizTarih };
}

export async function ogrencileriGetir(sinifId: string): Promise<Ogrenci[]> {
  const { data, error } = await supabase.from('ogrenci').select('*').eq('sinif_id', sinifId).order('ad_soyad');
  if (error) throw new Error(hataMesajinaCevir(error.message));
  return data;
}

// Veli, RLS (ogrenci_veli_oku politikası) sayesinde yalnızca kendi çocuklarını görür;
// bu yüzden ek bir veli_id filtresi gerekmez.
export async function veliCocuklariniGetir(): Promise<Ogrenci[]> {
  const { data, error } = await supabase.from('ogrenci').select('*').order('ad_soyad');
  if (error) throw new Error(hataMesajinaCevir(error.message));
  return data;
}

export async function ogrenciGetir(id: string): Promise<Ogrenci> {
  const { data, error } = await supabase.from('ogrenci').select('*').eq('id', id).single();
  if (error) throw new Error(hataMesajinaCevir(error.message));
  return data;
}

export async function ogrenciEkle(
  kurumId: string,
  sinifId: string,
  adSoyad: string,
  dogumTarihi: string,
): Promise<Ogrenci> {
  const girdi = girdiyiDogrula(adSoyad, dogumTarihi);
  const { data, error } = await supabase
    .from('ogrenci')
    .insert({ kurum_id: kurumId, sinif_id: sinifId, ...girdi })
    .select()
    .single();
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
  return data;
}

export async function ogrenciGuncelle(id: string, adSoyad: string, dogumTarihi: string): Promise<Ogrenci> {
  const girdi = girdiyiDogrula(adSoyad, dogumTarihi);
  const { data, error } = await supabase.from('ogrenci').update(girdi).eq('id', id).select().single();
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
  return data;
}

export async function ogrenciSil(id: string): Promise<void> {
  const { error } = await supabase.from('ogrenci').delete().eq('id', id);
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
}
