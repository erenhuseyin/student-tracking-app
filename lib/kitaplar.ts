// Kitap okuma takibi: öğrenci başına kitap kayıtları. Sınıfın öğretmeni ve kurum admini girer,
// veli çocuğununkini okur (RLS: kitap_okuma_*).
import { supabase } from '@/lib/supabase';
import { bugununTarihi } from '@/lib/tarih';
import type { KitapDurumu, KitapOkuma } from '@/lib/tipler';

export const KITAP_DURUMU_ETIKETLERI: Record<KitapDurumu, string> = {
  baslamadi: 'Başlamadı',
  okuyor: 'Okuyor',
  bitti: 'Bitti',
};

function hataMesajinaCevir(mesaj: string, kod?: string): string {
  if (kod === '42501' || /permission denied|rls|row-level security/i.test(mesaj)) return 'Bu işlem için yetkiniz yok.';
  if (/network|fetch/i.test(mesaj)) return 'Bağlantı sorunu, lütfen tekrar deneyin.';
  return 'İşlem yapılamadı, lütfen tekrar deneyin.';
}

export async function kitaplariGetir(ogrenciIdleri: string[]): Promise<KitapOkuma[]> {
  if (ogrenciIdleri.length === 0) return [];
  const { data, error } = await supabase
    .from('kitap_okuma')
    .select('*')
    .in('ogrenci_id', ogrenciIdleri)
    .order('olusturma_tarihi', { ascending: false });
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
  return data;
}

// kurumId: öğrencinin kurumu. Yeni kitap "okuyor" olarak, bugünün tarihiyle başlar.
export async function kitapEkle(kurumId: string, ogrenciId: string, baslik: string, yazar: string): Promise<void> {
  if (!baslik.trim()) throw new Error('Kitabın adını yazın.');
  const { error } = await supabase.from('kitap_okuma').insert({
    kurum_id: kurumId,
    ogrenci_id: ogrenciId,
    baslik: baslik.trim(),
    yazar: yazar.trim() || null,
    durum: 'okuyor',
    baslama_tarihi: bugununTarihi(),
  });
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
}

// "Bitti" seçilince bitiş tarihi bugün olur; başka duruma dönülürse temizlenir.
export async function kitapDurumunuAyarla(kitap: KitapOkuma, durum: KitapDurumu): Promise<void> {
  const bugun = bugununTarihi();
  const { error } = await supabase
    .from('kitap_okuma')
    .update({
      durum,
      baslama_tarihi: durum === 'baslamadi' ? null : (kitap.baslama_tarihi ?? bugun),
      bitis_tarihi: durum === 'bitti' ? bugun : null,
    })
    .eq('id', kitap.id);
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
}

export async function kitapSil(id: string): Promise<void> {
  const { error } = await supabase.from('kitap_okuma').delete().eq('id', id);
  if (error) throw new Error(hataMesajinaCevir(error.message));
}
