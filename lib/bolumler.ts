// Menü yetkisi: müşterinin öğretmen ve veliler için kapattığı bölümler (tablo: kapali_bolum).
// Erişim: müşterinin herkesi okur; yalnızca kök kurumun yöneticisi kapatır/açar (RLS).
// Bu bir görünürlük ayarıdır — veriye erişimi değiştirmez.
import type { AyarlanabilirRol } from '@/lib/menu';
import { supabase } from '@/lib/supabase';

function hataMesajinaCevir(mesaj: string): string {
  if (/permission denied|rls|row-level security/i.test(mesaj)) return 'Bu işlem için yetkiniz yok.';
  if (/network|fetch/i.test(mesaj)) return 'Bağlantı sorunu, lütfen tekrar deneyin.';
  return 'İşlem yapılamadı, lütfen tekrar deneyin.';
}

export type KapaliBolum = { rol: AyarlanabilirRol; anahtar: string };

export async function kapaliBolumleriGetir(kokKurumId: string): Promise<KapaliBolum[]> {
  const { data, error } = await supabase.from('kapali_bolum').select('rol, bolum_anahtari').eq('kurum_id', kokKurumId);
  if (error) throw new Error(hataMesajinaCevir(error.message));
  return data.map((s) => ({ rol: s.rol as AyarlanabilirRol, anahtar: s.bolum_anahtari }));
}

// Kapatmak satır eklemek, açmak satırı silmektir (tabloda güncelleme yetkisi yok).
export async function bolumGorunurlugunuAyarla(
  kokKurumId: string,
  rol: AyarlanabilirRol,
  anahtar: string,
  acik: boolean,
): Promise<void> {
  const { error } = acik
    ? await supabase.from('kapali_bolum').delete().eq('kurum_id', kokKurumId).eq('rol', rol).eq('bolum_anahtari', anahtar)
    : await supabase.from('kapali_bolum').insert({ kurum_id: kokKurumId, rol, bolum_anahtari: anahtar });
  // 23505: bölüm zaten kapalı (ör. başka bir yönetici az önce kapattı) — istenen durum sağlanmış.
  if (error && error.code !== '23505') throw new Error(hataMesajinaCevir(error.message));
}

// Rol başına kişi sayısı (yönetilen kurumlar: kendi kurumu + şubeleri; RLS süzer).
export async function rolSayilariniGetir(): Promise<Record<'kurum_admin' | 'ogretmen' | 'veli', number>> {
  const { data, error } = await supabase.from('kullanici').select('rol').eq('aktif', true);
  if (error) throw new Error(hataMesajinaCevir(error.message));
  const sayilar = { kurum_admin: 0, ogretmen: 0, veli: 0 };
  for (const k of data) {
    if (k.rol !== 'super_admin') sayilar[k.rol] += 1;
  }
  return sayilar;
}
