// Kurum (müşteri) ve şube işlemleri. Ek yetki kontrolü gerekmez, RLS zaten reddeder:
// kök kurumu yalnızca super_admin ekler (kurum_super_admin politikası); şubeyi kök kurumun
// admini kendi kurumunun altına ekler/siler (kurum_admin_sube_ekle / kurum_admin_sube_sil).
import { supabase } from '@/lib/supabase';
import type { Kurum } from '@/lib/tipler';

// DB'deki kurum_marka_kodu_format kısıtıyla aynı.
const MARKA_KODU_RE = /^[a-z][a-z0-9-]{1,30}$/;

function hataMesajinaCevir(mesaj: string, kod?: string): string {
  if (kod === '23505') return 'Bu marka kodu başka bir kurumda kullanılıyor.';
  if (kod === '23503') return 'Bu şubede kayıt var (sınıf, öğrenci veya kullanıcı); önce onları kaldırın.';
  if (/permission denied|rls/i.test(mesaj)) return 'Bu işlem için yetkiniz yok.';
  if (/network|fetch/i.test(mesaj)) return 'Bağlantı sorunu, lütfen tekrar deneyin.';
  return 'İşlem yapılamadı, lütfen tekrar deneyin.';
}

export async function kurumlariGetir(): Promise<Kurum[]> {
  const { data, error } = await supabase.from('kurum').select('*').order('ad');
  if (error) throw new Error(hataMesajinaCevir(error.message));
  return data;
}

export async function kurumGetir(id: string): Promise<Kurum> {
  const { data, error } = await supabase.from('kurum').select('*').eq('id', id).single();
  if (error) throw new Error(hataMesajinaCevir(error.message));
  return data;
}

// Erişim: yalnızca süper admin (trigger: kurum_korunan_alan_yetki). Müşteriye özel bir özelliği
// (bkz. lib/ozellikler.ts) kök kurumda açar ya da kapatır; diğer bayraklara dokunmaz.
export async function kurumOzelligiAyarla(kurumId: string, ad: string, acik: boolean): Promise<Kurum> {
  const kurum = await kurumGetir(kurumId);
  const mevcut =
    typeof kurum.ozellikler === 'object' && kurum.ozellikler !== null && !Array.isArray(kurum.ozellikler)
      ? kurum.ozellikler
      : {};
  const { data, error } = await supabase
    .from('kurum')
    .update({ ozellikler: { ...mevcut, [ad]: acik } })
    .eq('id', kurumId)
    .select()
    .single();
  if (error) throw new Error(hataMesajinaCevir(error.message));
  return data;
}

// Kök kurum = müşteri. markaKodu müşterinin uygulamasıyla (markalar/<kod>/) eşleşir ve
// sonradan değiştirilemez (bkz. docs/yeni-marka.md).
export async function kurumEkle(ad: string, markaKodu: string): Promise<Kurum> {
  const temizAd = ad.trim();
  const temizKod = markaKodu.trim();
  if (!temizAd) throw new Error('Kurum adı gerekli.');
  if (!MARKA_KODU_RE.test(temizKod)) {
    throw new Error('Marka kodu küçük harfle başlamalı; yalnızca küçük harf, rakam ve tire içerebilir (örn. ugur).');
  }

  const { data, error } = await supabase
    .from('kurum')
    .insert({ ad: temizAd, marka_kodu: temizKod })
    .select()
    .single();
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
  return data;
}

export async function subeleriGetir(ustKurumId: string): Promise<Kurum[]> {
  const { data, error } = await supabase.from('kurum').select('*').eq('ust_kurum_id', ustKurumId).order('ad');
  if (error) throw new Error(hataMesajinaCevir(error.message));
  return data;
}

export async function subeEkle(ustKurumId: string, ad: string): Promise<Kurum> {
  const temizAd = ad.trim();
  if (!temizAd) throw new Error('Şube adı gerekli.');

  const { data, error } = await supabase
    .from('kurum')
    .insert({ ad: temizAd, ust_kurum_id: ustKurumId })
    .select()
    .single();
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
  return data;
}

export async function subeSil(id: string): Promise<void> {
  const { error } = await supabase.from('kurum').delete().eq('id', id);
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
}
