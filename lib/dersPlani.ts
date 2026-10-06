// Sınıfın haftalık ders planı (hangi günler ders var). Öğretmen atandığı sınıf için belirler;
// kurum admini ve veli okur (RLS: sinif_ders_plani_* politikaları).
//
// Plan "şu haftadan itibaren geçerli" olarak saklanır: ders günleri değişince bu hafta için
// yeni satır yazılır, önceki haftaların planı ve dolayısıyla geçmiş tabloları değişmez.
// Bir haftanın planını seçmek için bkz. lib/katilim.ts > haftaninPlani.
import { supabase } from '@/lib/supabase';
import { bugununTarihi, haftaBaslangici } from '@/lib/tarih';
import type { SinifDersPlani } from '@/lib/tipler';

function hataMesajinaCevir(mesaj: string): string {
  if (/permission denied|rls|row-level security/i.test(mesaj)) return 'Bu işlem için yetkiniz yok.';
  if (/network|fetch/i.test(mesaj)) return 'Bağlantı sorunu, lütfen tekrar deneyin.';
  return 'İşlem yapılamadı, lütfen tekrar deneyin.';
}

// Sınıfın tüm planları, en yeni üstte.
export async function dersPlanlariniGetir(sinifId: string): Promise<SinifDersPlani[]> {
  const { data, error } = await supabase
    .from('sinif_ders_plani')
    .select('*')
    .eq('sinif_id', sinifId)
    .order('baslangic_tarihi', { ascending: false });
  if (error) throw new Error(hataMesajinaCevir(error.message));
  return data;
}

// Ders günlerini bu haftadan itibaren geçerli olacak şekilde kaydeder.
// Bilerek upsert kullanılmadı: istemcinin yalnızca `ders_gunleri` kolonunu güncelleme yetkisi
// var, PostgREST upsert'i ise çakışmada gönderilen tüm kolonları yazmaya çalışır (42501).
export async function dersGunleriniKaydet(kurumId: string, sinifId: string, gunler: number[]): Promise<void> {
  const dersGunleri = [...new Set(gunler)].sort((a, b) => a - b);
  if (dersGunleri.length === 0) throw new Error('En az bir ders günü seçin.');
  const baslangic = haftaBaslangici(bugununTarihi());

  const { data: mevcut, error: okumaHatasi } = await supabase
    .from('sinif_ders_plani')
    .select('id')
    .eq('sinif_id', sinifId)
    .eq('baslangic_tarihi', baslangic)
    .maybeSingle();
  if (okumaHatasi) throw new Error(hataMesajinaCevir(okumaHatasi.message));

  const { error } = mevcut
    ? await supabase.from('sinif_ders_plani').update({ ders_gunleri: dersGunleri }).eq('id', mevcut.id)
    : await supabase
        .from('sinif_ders_plani')
        .insert({ kurum_id: kurumId, sinif_id: sinifId, baslangic_tarihi: baslangic, ders_gunleri: dersGunleri });
  if (error) throw new Error(hataMesajinaCevir(error.message));
}
