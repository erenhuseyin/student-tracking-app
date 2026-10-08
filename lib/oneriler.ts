// Velinin kuruma tek yönlü öneri/görüş göndermesi. Mesajlaşma değildir: kurum uygulamadan yanıt
// yazmaz. Veli kendi kurumuna yazar ve yalnızca kendi yazdıklarını görür; kurum yöneticisi
// yönettiği kurumlara yazılanları okur ve okundu olarak işaretler (RLS: oneri_*).
import { supabase } from '@/lib/supabase';
import type { Oneri } from '@/lib/tipler';

export const ONERI_AZAMI_UZUNLUK = 1000;

function hataMesajinaCevir(mesaj: string, kod?: string): string {
  if (/Günlük öneri sınırı/i.test(mesaj)) return 'Bugün gönderebileceğiniz öneri sayısına ulaştınız. Lütfen yarın tekrar deneyin.';
  if (kod === '42501' || /permission denied|rls|row-level security/i.test(mesaj)) return 'Bu işlem için yetkiniz yok.';
  if (/network|fetch/i.test(mesaj)) return 'Bağlantı sorunu, lütfen tekrar deneyin.';
  return 'İşlem yapılamadı, lütfen tekrar deneyin.';
}

// Veli: kendi gönderdikleri, en yeni üstte.
export async function onerilerimiGetir(kullaniciId: string): Promise<Oneri[]> {
  const { data, error } = await supabase
    .from('oneri')
    .select('*')
    .eq('giren_kullanici_id', kullaniciId)
    .order('olusturma_tarihi', { ascending: false })
    .limit(30);
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
  return data;
}

export async function oneriGonder(kurumId: string, kullaniciId: string, metin: string): Promise<void> {
  const temiz = metin.trim();
  if (!temiz) throw new Error('Önerinizi yazın.');
  if (temiz.length > ONERI_AZAMI_UZUNLUK) throw new Error(`Öneri en fazla ${ONERI_AZAMI_UZUNLUK} karakter olabilir.`);
  const { error } = await supabase.from('oneri').insert({ kurum_id: kurumId, giren_kullanici_id: kullaniciId, metin: temiz });
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
}

export type OneriSatiri = Oneri & { gonderen: string };

// Kurum yöneticisi: yönettiği kurumlara yazılanlar, gönderenin adıyla (veli hesabının adı
// "… Velisi" biçimindedir). RLS yönetici için velilerin `kullanici` satırını okumaya izin verir.
export async function kurumOnerileriniGetir(): Promise<OneriSatiri[]> {
  const { data, error } = await supabase.from('oneri').select('*').order('olusturma_tarihi', { ascending: false }).limit(100);
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
  const idler = [...new Set(data.map((o) => o.giren_kullanici_id))];
  const { data: gonderenler } = idler.length
    ? await supabase.from('kullanici').select('id, ad_soyad').in('id', idler)
    : { data: [] };
  const adlar = new Map((gonderenler ?? []).map((k) => [k.id, k.ad_soyad]));
  return data.map((o) => ({ ...o, gonderen: adlar.get(o.giren_kullanici_id) ?? 'Veli' }));
}

export async function onerileriOkunduYap(idler: string[]): Promise<void> {
  if (idler.length === 0) return;
  await supabase.from('oneri').update({ okundu: true }).in('id', idler);
}
