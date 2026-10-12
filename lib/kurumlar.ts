// Kurum ağacı işlemleri (kök kurum = müşteri; altında en fazla 3 seviye birim). Ek yetki kontrolü
// gerekmez, RLS zaten reddeder: kök kurumu yalnızca super_admin ekler (kurum_super_admin
// politikası); yönetici kendi düğümünün altına birim ekler/siler (kurum_admin_alt_ekle / _sil).
import { supabase } from '@/lib/supabase';
import type { Kurum } from '@/lib/tipler';

// DB'deki kurum_marka_kodu_format kısıtıyla aynı.
const MARKA_KODU_RE = /^[a-z][a-z0-9-]{1,30}$/;

function hataMesajinaCevir(mesaj: string, kod?: string): string {
  if (kod === '23505') return 'Bu marka kodu başka bir kurumda kullanılıyor.';
  if (kod === '23503') return 'Bu birimde kayıt var (alt birim, sınıf, öğrenci veya kullanıcı); önce onları kaldırın.';
  if (kod === '23514') return 'Bu birimin altına yeni birim açılamaz.';
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

// Bir düğümün doğrudan altındaki birimler (kökün bölgeleri, bölgenin ilçeleri …).
export async function altKurumlariGetir(ustKurumId: string): Promise<Kurum[]> {
  const { data, error } = await supabase.from('kurum').select('*').eq('ust_kurum_id', ustKurumId).order('ad');
  if (error) throw new Error(hataMesajinaCevir(error.message));
  return data;
}

export type KurumOzeti = Pick<Kurum, 'id' | 'ad' | 'yol' | 'seviye'>;

// Çağıranın okuyabildiği tüm kurumların adları (yönetici: kendi düğümü, üstleri ve altındaki
// tüm düğümler). Listelerde birim yolunu göstermek için.
export async function kurumAdlariniGetir(): Promise<KurumOzeti[]> {
  const { data, error } = await supabase.from('kurum').select('id, ad, yol, seviye').order('ad');
  if (error) throw new Error(hataMesajinaCevir(error.message));
  return data;
}

// "İstanbul › Küçükçekmece › İkitelli": `baslangic` düğümünden (hariç) hedefe kadar. Adı
// okunamayan düğüm atlanır.
export function kurumYolu(
  kurumlar: Pick<Kurum, 'id' | 'ad' | 'yol'>[],
  kurumId: string,
  baslangicKurumId?: string,
): string {
  const adlar = new Map(kurumlar.map((k) => [k.id, k.ad]));
  const yol = kurumlar.find((k) => k.id === kurumId)?.yol ?? [];
  const bas = baslangicKurumId ? yol.indexOf(baslangicKurumId) + 1 : 0;
  return yol
    .slice(bas)
    .map((id) => adlar.get(id))
    .filter(Boolean)
    .join(' › ');
}

// Erişim: düğümün üstündeki bir yönetici (RLS + kurum_ad_degisikligi trigger'ı); yönetici kendi
// kurumunun adını değiştiremez.
// `ilKodu` verilirse (null dahil) birimin ili de yazılır; verilmezse dokunulmaz.
export async function kurumAdiniGuncelle(id: string, ad: string, ilKodu?: number | null): Promise<void> {
  const temizAd = ad.trim();
  if (!temizAd) throw new Error('Ad gerekli.');
  const { data, error } = await supabase
    .from('kurum')
    .update(ilKodu === undefined ? { ad: temizAd } : { ad: temizAd, il_kodu: ilKodu })
    .eq('id', id)
    .select('id');
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
  if (data.length === 0) throw new Error('Bu işlem için yetkiniz yok.');
}

// Erişim: `ustKurumId` çağıranın kendi düğümü ya da altındaki bir düğüm olmalı (RLS:
// kurum_admin_alt_ekle); 4. seviyenin altına açılamaz (trigger).
export async function altKurumEkle(ustKurumId: string, ad: string, ilKodu: number | null = null): Promise<Kurum> {
  const temizAd = ad.trim();
  if (!temizAd) throw new Error('Ad gerekli.');

  const { data, error } = await supabase
    .from('kurum')
    .insert({ ad: temizAd, ust_kurum_id: ustKurumId, il_kodu: ilKodu })
    .select()
    .single();
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
  return data;
}

export async function altKurumSil(id: string): Promise<void> {
  const { data, error } = await supabase.from('kurum').delete().eq('id', id).select('id');
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
  if (data.length === 0) throw new Error('Bu işlem için yetkiniz yok.');
}

// Filtre ve form seçim kutuları için: `kokId` düğümü ve altındaki birimler, yol adıyla ve ağaç
// sırasında ("İstanbul", "İstanbul › Küçükçekmece", …). Kök düğümün kendisi yalnızca adıyla gelir.
export function birimSecenekleri(kurumlar: KurumOzeti[], kokId: string): { deger: string; etiket: string }[] {
  return kurumlar
    .filter((k) => k.yol.includes(kokId))
    .map((k) => ({ deger: k.id, etiket: k.id === kokId ? k.ad : kurumYolu(kurumlar, k.id, kokId) }))
    .sort((a, b) => (a.deger === kokId ? -1 : b.deger === kokId ? 1 : a.etiket.localeCompare(b.etiket, 'tr')));
}
