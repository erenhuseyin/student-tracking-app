// Yoklama: öğretmen girer/günceller, veli okur. RLS (yoklama_ogretmen_yaz/guncelle/oku,
// yoklama_veli_oku politikaları) yetkiyi zaten sınırlıyor.
import { supabase } from '@/lib/supabase';
import type { Ogrenci, Yoklama, YoklamaDurumu } from '@/lib/tipler';

function hataMesajinaCevir(mesaj: string, kod?: string): string {
  if (kod === '23505') return 'Bu öğrenci için bugüne ait kayıt zaten var.';
  if (/permission denied|rls/i.test(mesaj)) return 'Bu işlem için yetkiniz yok.';
  if (/network|fetch/i.test(mesaj)) return 'Bağlantı sorunu, lütfen tekrar deneyin.';
  return 'İşlem yapılamadı, lütfen tekrar deneyin.';
}

// Bugünün tarihi, yerel saatle YYYY-AA-GG (Date.toISOString() UTC kullandığı için gece
// yarısına yakın saatlerde yanlış günü verebilir; bu yüzden yerel bileşenlerden kurulur).
export function bugununTarihi(): string {
  const d = new Date();
  const yil = d.getFullYear();
  const ay = String(d.getMonth() + 1).padStart(2, '0');
  const gun = String(d.getDate()).padStart(2, '0');
  return `${yil}-${ay}-${gun}`;
}

export type OgrenciYoklamaSatiri = Ogrenci & { yoklama_durumu: YoklamaDurumu | null };

// Sınıftaki öğrencileri, bugüne ait yoklama durumlarıyla birlikte getirir.
// İki ayrı sorgu + client-side birleştirme: tip güvenliği join'e göre daha basit.
export async function bugununYoklamasiniGetir(sinifId: string): Promise<OgrenciYoklamaSatiri[]> {
  const { data: ogrenciler, error: ogrenciHatasi } = await supabase
    .from('ogrenci')
    .select('*')
    .eq('sinif_id', sinifId)
    .order('ad_soyad');
  if (ogrenciHatasi) throw new Error(hataMesajinaCevir(ogrenciHatasi.message));

  const tarih = bugununTarihi();
  const { data: yoklamalar, error: yoklamaHatasi } = await supabase
    .from('yoklama')
    .select('ogrenci_id, durum')
    .eq('tarih', tarih)
    .in(
      'ogrenci_id',
      ogrenciler.map((o) => o.id),
    );
  if (yoklamaHatasi) throw new Error(hataMesajinaCevir(yoklamaHatasi.message));

  const durumHaritasi = new Map(yoklamalar.map((y) => [y.ogrenci_id, y.durum]));
  return ogrenciler.map((o) => ({ ...o, yoklama_durumu: durumHaritasi.get(o.id) ?? null }));
}

export async function yoklamaKaydet(
  kurumId: string,
  ogrenciId: string,
  girenKullaniciId: string,
  durum: YoklamaDurumu,
): Promise<Yoklama> {
  const { data, error } = await supabase
    .from('yoklama')
    .upsert(
      { kurum_id: kurumId, ogrenci_id: ogrenciId, tarih: bugununTarihi(), durum, giren_kullanici_id: girenKullaniciId },
      { onConflict: 'ogrenci_id,tarih' },
    )
    .select()
    .single();
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
  return data;
}

export async function veliYoklamalariGetir(ogrenciId: string): Promise<Yoklama[]> {
  const { data, error } = await supabase
    .from('yoklama')
    .select('*')
    .eq('ogrenci_id', ogrenciId)
    .order('tarih', { ascending: false });
  if (error) throw new Error(hataMesajinaCevir(error.message));
  return data;
}
