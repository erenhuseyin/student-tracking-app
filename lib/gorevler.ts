// Görev tanımları ("rol tanımlama"). Müşteri kendi görevlerini tanımlar (ör. İstişare üyesi, Abi);
// her görev bir temel role (yönetici ya da öğretmen) bağlıdır ve o görevdeki kişilere gizlenen
// menü öğelerini tutar. Bu bir görünürlük ayarıdır: veriye erişimi temel rol ve kişinin bağlı
// olduğu kurum belirler (RLS), görev belirlemez.
// Erişim: görevleri müşterinin herkesi okur; tanımlar ve menü yetkisini yalnızca kök kurumun
// (genel merkezin) yöneticisi değiştirir; görevi her yönetici kendi kapsamındaki kişiye atar.
import { supabase } from '@/lib/supabase';
import type { Gorev } from '@/lib/tipler';

export type GorevTemelRolu = 'kurum_admin' | 'ogretmen';

export const TEMEL_ROL_ETIKETLERI: Record<GorevTemelRolu, string> = {
  kurum_admin: 'Yönetici',
  ogretmen: 'Öğretmen',
};

function hataMesajinaCevir(mesaj: string, kod?: string): string {
  if (kod === '23505') return 'Bu adda bir görev zaten var.';
  if (kod === '23503') return 'Bu görevde kişiler var; önce onların görevini değiştirin.';
  if (kod === '23514') return 'Görev bu kişinin rolüne uygun değil.';
  if (/permission denied|rls|row-level security|kendi görevini/i.test(mesaj)) return 'Bu işlem için yetkiniz yok.';
  if (/network|fetch/i.test(mesaj)) return 'Bağlantı sorunu, lütfen tekrar deneyin.';
  return 'İşlem yapılamadı, lütfen tekrar deneyin.';
}

export async function gorevleriGetir(): Promise<Gorev[]> {
  const { data, error } = await supabase.from('gorev').select('*').order('ad');
  if (error) throw new Error(hataMesajinaCevir(error.message));
  return data;
}

// Görev başına kişi sayısı (çağıranın görebildiği aktif kişiler; RLS süzer).
export async function gorevKisiSayilariniGetir(): Promise<Map<string, number>> {
  const { data, error } = await supabase.from('kullanici').select('gorev_id').not('gorev_id', 'is', null).eq('aktif', true);
  if (error) throw new Error(hataMesajinaCevir(error.message));
  const sayilar = new Map<string, number>();
  for (const k of data) {
    if (k.gorev_id) sayilar.set(k.gorev_id, (sayilar.get(k.gorev_id) ?? 0) + 1);
  }
  return sayilar;
}

export async function gorevEkle(
  kokKurumId: string,
  girdi: { ad: string; temelRol: GorevTemelRolu; aciklama: string },
): Promise<Gorev> {
  const ad = girdi.ad.trim();
  if (!ad) throw new Error('Görev adı gerekli.');
  const { data, error } = await supabase
    .from('gorev')
    .insert({ kurum_id: kokKurumId, ad, temel_rol: girdi.temelRol, aciklama: girdi.aciklama.trim() || null })
    .select()
    .single();
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
  return data;
}

// Temel rol sonradan değiştirilemez (o görevdeki kişilerin rolüyle çelişirdi).
export async function gorevGuncelle(id: string, girdi: { ad: string; aciklama: string }): Promise<void> {
  const ad = girdi.ad.trim();
  if (!ad) throw new Error('Görev adı gerekli.');
  const { data, error } = await supabase
    .from('gorev')
    .update({ ad, aciklama: girdi.aciklama.trim() || null })
    .eq('id', id)
    .select('id');
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
  if (data.length === 0) throw new Error('Bu işlem için yetkiniz yok.');
}

// Görevin menü yetkisi: gizlenen öğe anahtarlarının tamamı yazılır (lib/menu.ts).
export async function gorevKapaliOgeleriAyarla(id: string, kapaliOgeler: string[]): Promise<void> {
  const { data, error } = await supabase.from('gorev').update({ kapali_ogeler: kapaliOgeler }).eq('id', id).select('id');
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
  if (data.length === 0) throw new Error('Bu işlem için yetkiniz yok.');
}

export async function gorevSil(id: string): Promise<void> {
  const { data, error } = await supabase.from('gorev').delete().eq('id', id).select('id');
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
  if (data.length === 0) throw new Error('Bu işlem için yetkiniz yok.');
}

// Kişiye görev atar ya da (null) görevini kaldırır. Kimse kendi görevini değiştiremez (trigger).
export async function gorevAta(kullaniciId: string, gorevId: string | null): Promise<void> {
  const { data, error } = await supabase.from('kullanici').update({ gorev_id: gorevId }).eq('id', kullaniciId).select('id');
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
  if (data.length === 0) throw new Error('Bu işlem için yetkiniz yok.');
}
