// Yoklama: öğretmen girer/günceller, veli okur. RLS (yoklama_ogretmen_yaz/guncelle/oku,
// yoklama_veli_oku politikaları) yetkiyi zaten sınırlıyor.
import { supabase } from '@/lib/supabase';
import { bugununTarihi } from '@/lib/tarih';
import type { Ogrenci, Yoklama, YoklamaDurumu } from '@/lib/tipler';

function hataMesajinaCevir(mesaj: string, kod?: string): string {
  if (kod === '23505') return 'Bu öğrenci için bu güne ait kayıt zaten var.';
  if (/permission denied|rls/i.test(mesaj)) return 'Bu işlem için yetkiniz yok.';
  if (/network|fetch/i.test(mesaj)) return 'Bağlantı sorunu, lütfen tekrar deneyin.';
  return 'İşlem yapılamadı, lütfen tekrar deneyin.';
}

export const YOKLAMA_ETIKETLERI: Record<YoklamaDurumu, string> = {
  geldi: 'Geldi',
  gelmedi: 'Gelmedi',
  gec: 'Geç',
};

export type OgrenciYoklamaSatiri = Ogrenci & { yoklama_durumu: YoklamaDurumu | null };

// Sınıftaki öğrencileri, verilen güne ait yoklama durumlarıyla birlikte getirir.
// İki ayrı sorgu + client-side birleştirme: tip güvenliği join'e göre daha basit.
export async function gununYoklamasiniGetir(sinifId: string, tarih: string): Promise<OgrenciYoklamaSatiri[]> {
  const { data: ogrenciler, error: ogrenciHatasi } = await supabase
    .from('ogrenci')
    .select('*')
    .eq('sinif_id', sinifId)
    .order('ad_soyad');
  if (ogrenciHatasi) throw new Error(hataMesajinaCevir(ogrenciHatasi.message));

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

export type YoklamaKaydi = Pick<Yoklama, 'ogrenci_id' | 'tarih' | 'durum'>;

// Sınıfın öğrencileri ve [baslangic, bitis] aralığındaki (uçlar dahil) yoklama kayıtları.
// Haftalık tablo ve katılım oranı bunun üzerinden istemcide hesaplanır (bkz. lib/katilim.ts).
export async function sinifYoklamalariniGetir(
  sinifId: string,
  baslangic: string,
  bitis: string,
): Promise<{ ogrenciler: Ogrenci[]; yoklamalar: YoklamaKaydi[] }> {
  const { data: ogrenciler, error: ogrenciHatasi } = await supabase
    .from('ogrenci')
    .select('*')
    .eq('sinif_id', sinifId)
    .order('ad_soyad');
  if (ogrenciHatasi) throw new Error(hataMesajinaCevir(ogrenciHatasi.message));
  if (ogrenciler.length === 0) return { ogrenciler, yoklamalar: [] };

  const { data: yoklamalar, error: yoklamaHatasi } = await supabase
    .from('yoklama')
    .select('ogrenci_id, tarih, durum')
    .gte('tarih', baslangic)
    .lte('tarih', bitis)
    .in(
      'ogrenci_id',
      ogrenciler.map((o) => o.id),
    );
  if (yoklamaHatasi) throw new Error(hataMesajinaCevir(yoklamaHatasi.message));

  return { ogrenciler, yoklamalar };
}

export async function yoklamaKaydet(
  kurumId: string,
  ogrenciId: string,
  girenKullaniciId: string,
  durum: YoklamaDurumu,
  tarih: string = bugununTarihi(),
): Promise<Yoklama> {
  if (tarih > bugununTarihi()) throw new Error('İleri tarihli yoklama girilemez.');
  const { data, error } = await supabase
    .from('yoklama')
    .upsert(
      { kurum_id: kurumId, ogrenci_id: ogrenciId, tarih, durum, giren_kullanici_id: girenKullaniciId },
      { onConflict: 'ogrenci_id,tarih' },
    )
    .select()
    .single();
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));

  // Bildirim en iyi çabadır (best-effort): yoklama kaydı zaten başarılı, bildirim
  // gönderiminde yaşanan bir hata bu işlemi geçersiz kılmamalı — hata sessizce yutulur.
  // Yalnızca bugünün yoklaması bildirilir; geçmiş gün düzeltmesi veliye "bugün" gibi görünmesin.
  if (tarih === bugununTarihi()) {
    supabase.functions.invoke('yoklama-bildirim-gonder', { body: { ogrenci_id: ogrenciId, durum } }).catch(() => {});
  }

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
