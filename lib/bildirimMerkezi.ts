// Uygulama içi bildirim listesi: kullanıcıya gönderilmiş bildirimler (yoklama, gelişim, duyuru,
// başvuru) ve okundu durumu. Satırları sunucudaki fonksiyonlar yazar; kullanıcı yalnızca kendi
// satırlarını okur ve okundu olarak işaretler (RLS: bildirim_log_veli_oku, _alici_guncelle).
// Sorgular alıcıya göre süzülür: yönetici RLS gereği kurumunun tüm satırlarını görebilir ama
// burada yalnızca kendisine gönderilenler istenir.
import type { Href } from 'expo-router';

import { supabase } from '@/lib/supabase';
import type { BildirimLog, BildirimTipi, Rol } from '@/lib/tipler';

const LISTE_SINIRI = 50;

const VARSAYILAN_BASLIKLAR: Record<BildirimTipi, string> = {
  yoklama: 'Yoklama',
  gelisim_kaydi: 'Gelişim Kaydı',
  duyuru: 'Duyuru',
  basvuru: 'Yeni Başvuru',
};

export const bildirimBasligi = (b: Pick<BildirimLog, 'baslik' | 'tip'>) => b.baslik ?? VARSAYILAN_BASLIKLAR[b.tip];

export async function bildirimleriGetir(kullaniciId: string): Promise<BildirimLog[]> {
  const { data, error } = await supabase
    .from('bildirim_log')
    .select('*')
    .eq('alici_kullanici_id', kullaniciId)
    .order('gonderim_tarihi', { ascending: false })
    .limit(LISTE_SINIRI);
  if (error) throw new Error(/network|fetch/i.test(error.message) ? 'Bağlantı sorunu, lütfen tekrar deneyin.' : 'Bildirimler alınamadı.');
  return data;
}

// Zil rozetindeki sayı. Okunamazsa 0 (rozet gösterilmez).
export async function okunmamisBildirimSayisi(kullaniciId: string): Promise<number> {
  const { count, error } = await supabase
    .from('bildirim_log')
    .select('id', { count: 'exact', head: true })
    .eq('alici_kullanici_id', kullaniciId)
    .eq('okundu_mu', false);
  return error ? 0 : (count ?? 0);
}

export async function tumBildirimleriOkunduYap(kullaniciId: string): Promise<void> {
  await supabase.from('bildirim_log').update({ okundu_mu: true }).eq('alici_kullanici_id', kullaniciId).eq('okundu_mu', false);
}

// Bildirime (listede ya da telefondaki push'a) dokununca açılacak ekran. Rolün o ekranı yoksa null.
export function bildirimHedefi(
  rol: Rol,
  bildirim: { tip: string; ogrenci_id?: string | null },
): Href | null {
  if (bildirim.tip === 'yoklama' || bildirim.tip === 'gelisim_kaydi') {
    return rol === 'veli' && bildirim.ogrenci_id ? `/cocuk/${bildirim.ogrenci_id}` : null;
  }
  if (bildirim.tip === 'duyuru') return rol === 'super_admin' ? null : '/duyurular';
  if (bildirim.tip === 'basvuru') return rol === 'kurum_admin' ? '/basvurular' : null;
  return null;
}
