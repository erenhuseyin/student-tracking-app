// Haftalık ders programı: sınıfın hangi gün hangi saatte hangi dersi yaptığı. Kurum admini
// (yönettiği kurumlar) ve sınıfın öğretmeni düzenler; veli çocuğunun sınıfınınkini okur
// (RLS: ders_programi_* politikaları). Program tek sürümdür ve bilgilendirme amaçlıdır; yoklama
// günde tek kalır. Program değişince sınıfın ders günleri (lib/dersPlani.ts) programdan güncellenir.
import { dersGunleriniKaydet } from '@/lib/dersPlani';
import { supabase } from '@/lib/supabase';
import type { DersSaati } from '@/lib/tipler';

const SAAT_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DERS_ADI_AZAMI_UZUNLUK = 60;

function hataMesajinaCevir(mesaj: string, kod?: string): string {
  if (kod === '23505') return 'Bu sınıfın o gün aynı saatte başlayan başka bir dersi var.';
  if (kod === 'PGRST116') return 'Ders bulunamadı ya da bu işlem için yetkiniz yok.';
  if (/permission denied|rls|row-level security/i.test(mesaj)) return 'Bu işlem için yetkiniz yok.';
  if (/network|fetch/i.test(mesaj)) return 'Bağlantı sorunu, lütfen tekrar deneyin.';
  return 'İşlem yapılamadı, lütfen tekrar deneyin.';
}

export type DersSaatiGirdisi = { gun: number | null; baslangic: string; bitis: string; dersAdi: string };

// Veritabanı 'SS:DD:SS' döndürür; ekranda 'SS:DD' gösterilir.
export const saatiKisalt = (saat: string) => saat.slice(0, 5);

export function dersSaatindenGirdiye(d: DersSaati): DersSaatiGirdisi {
  return { gun: d.gun, baslangic: saatiKisalt(d.baslangic_saati), bitis: saatiKisalt(d.bitis_saati), dersAdi: d.ders_adi };
}

function girdiyiDogrula(girdi: DersSaatiGirdisi) {
  const dersAdi = girdi.dersAdi.trim();
  const baslangic = girdi.baslangic.trim();
  const bitis = girdi.bitis.trim();
  if (!girdi.gun) throw new Error('Bir gün seçin.');
  if (!dersAdi) throw new Error('Ders adı gerekli.');
  if (dersAdi.length > DERS_ADI_AZAMI_UZUNLUK) throw new Error(`Ders adı en fazla ${DERS_ADI_AZAMI_UZUNLUK} karakter olabilir.`);
  if (!SAAT_RE.test(baslangic) || !SAAT_RE.test(bitis)) throw new Error('Saatleri SS:DD olarak girin (örn. 09:00).');
  if (bitis <= baslangic) throw new Error('Bitiş saati başlangıçtan sonra olmalı.');
  return { gun: girdi.gun, baslangic_saati: baslangic, bitis_saati: bitis, ders_adi: dersAdi };
}

// sinifId verilmezse RLS'in izin verdiği tüm satırlar döner (kurum admini: yönettiği kurumlar,
// öğretmen: atandığı sınıflar). Gün ve saat sırasıyla.
export async function dersProgrami(sinifId?: string): Promise<DersSaati[]> {
  const sorgu = supabase.from('ders_programi').select('*').order('gun').order('baslangic_saati');
  const { data, error } = await (sinifId ? sorgu.eq('sinif_id', sinifId) : sorgu);
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
  return data;
}

export async function dersSaatiGetir(id: string): Promise<DersSaati> {
  const { data, error } = await supabase.from('ders_programi').select('*').eq('id', id).single();
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
  return data;
}

// Programdaki günler sınıfın ders günleri olur (bu haftadan itibaren; geçmiş haftalar değişmez).
// En iyi çabadır: program kaydı başarılıdır, ders günleri yazılamazsa sessizce geçilir. Program
// tamamen boşalırsa ders günlerine dokunulmaz.
async function dersGunleriniEsitle(kurumId: string, sinifId: string): Promise<void> {
  try {
    const gunler = [...new Set((await dersProgrami(sinifId)).map((d) => d.gun))];
    if (gunler.length > 0) await dersGunleriniKaydet(kurumId, sinifId, gunler);
  } catch {
    // bkz. yukarıdaki not
  }
}

// kurumId: sınıfın kurumu (şube sınıfı ise şube).
export async function dersSaatiEkle(kurumId: string, sinifId: string, girdi: DersSaatiGirdisi): Promise<void> {
  const alanlar = girdiyiDogrula(girdi);
  const { error } = await supabase.from('ders_programi').insert({ kurum_id: kurumId, sinif_id: sinifId, ...alanlar });
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
  await dersGunleriniEsitle(kurumId, sinifId);
}

export async function dersSaatiGuncelle(mevcut: DersSaati, girdi: DersSaatiGirdisi): Promise<void> {
  const alanlar = girdiyiDogrula(girdi);
  const { error } = await supabase.from('ders_programi').update(alanlar).eq('id', mevcut.id).select().single();
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
  await dersGunleriniEsitle(mevcut.kurum_id, mevcut.sinif_id);
}

export async function dersSaatiSil(mevcut: DersSaati): Promise<void> {
  const { error } = await supabase.from('ders_programi').delete().eq('id', mevcut.id);
  if (error) throw new Error(hataMesajinaCevir(error.message));
  await dersGunleriniEsitle(mevcut.kurum_id, mevcut.sinif_id);
}

// Form önerileri: çağıranın görebildiği programlarda kullanılmış ders adları (tekrarsız, alfabetik).
export async function kullanilanDersAdlari(): Promise<string[]> {
  const { data, error } = await supabase.from('ders_programi').select('ders_adi').limit(1000);
  if (error) return [];
  return [...new Set(data.map((d) => d.ders_adi))].sort((a, b) => a.localeCompare(b, 'tr'));
}

// Yöneticinin "herkesin programı" görünümü için ders satırı: sınıf, birim ve sınıfın hocaları.
export type ProgramSatiri = DersSaati & { sinif_adi: string; hocalar: { id: string; ad_soyad: string }[] };

// Erişim: kurum_admin (RLS: yönettiği birim ve altı). Genel merkez yöneticisi tüm ağacı görür.
// Program 1000 satırı aşarsa sayfa sayfa okunur.
export async function tumProgramiGetir(): Promise<ProgramSatiri[]> {
  const dersler: DersSaati[] = [];
  for (let bas = 0; ; bas += 1000) {
    const { data, error } = await supabase
      .from('ders_programi')
      .select('*')
      .order('gun')
      .order('baslangic_saati')
      .order('id')
      .range(bas, bas + 999);
    if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
    dersler.push(...data);
    if (data.length < 1000) break;
  }
  const sinifIdleri = [...new Set(dersler.map((d) => d.sinif_id))];
  if (sinifIdleri.length === 0) return [];

  const [siniflar, atamalar] = await Promise.all([
    supabase.from('sinif').select('id, ad').in('id', sinifIdleri),
    supabase.from('ogretmen_sinif').select('sinif_id, ogretmen_id').in('sinif_id', sinifIdleri),
  ]);
  if (siniflar.error) throw new Error(hataMesajinaCevir(siniflar.error.message));
  // Hoca adları okunamazsa program yine gösterilir.
  const hocaIdleri = [...new Set((atamalar.data ?? []).map((a) => a.ogretmen_id))];
  const hocalar = hocaIdleri.length ? await supabase.from('kullanici').select('id, ad_soyad').in('id', hocaIdleri) : null;
  const hocaAdlari = new Map((hocalar?.data ?? []).map((h) => [h.id, h.ad_soyad]));
  const sinifAdlari = new Map(siniflar.data.map((s) => [s.id, s.ad]));
  const sinifHocalari = new Map<string, { id: string; ad_soyad: string }[]>();
  for (const a of atamalar.data ?? []) {
    const ad = hocaAdlari.get(a.ogretmen_id);
    if (ad) sinifHocalari.set(a.sinif_id, [...(sinifHocalari.get(a.sinif_id) ?? []), { id: a.ogretmen_id, ad_soyad: ad }]);
  }
  return dersler.map((d) => ({
    ...d,
    sinif_adi: sinifAdlari.get(d.sinif_id) ?? 'Sınıf',
    hocalar: sinifHocalari.get(d.sinif_id) ?? [],
  }));
}
