// Kurum yöneticisinin özet ekranı: sayılar, bugün yoklaması alınmamış sınıflar, bu haftaki
// katılım, bekleyen başvurular, doğrudan altındaki birimlerin kırılımı. Hangi satırların geldiğini
// RLS belirler: yönetici kendi kurumunu ve altındaki tüm birimleri görür. Hesap istemcide yapılır
// (bkz. lib/katilim.ts); PostgREST tek istekte en fazla 1000 satır döndürdüğü için haftalık yoklaması
// bunu aşan büyük ağaçlarda oranlar eksik veriyle hesaplanır — o ölçekte sunucuda toplanmalıdır.
import { haftaninPlani, katilimHesapla } from '@/lib/katilim';
import { supabase } from '@/lib/supabase';
import { bugununTarihi, haftaBaslangici, isoGun } from '@/lib/tarih';
import type { Kurum, Sinif } from '@/lib/tipler';

export type AltBirimOzeti = Pick<Kurum, 'id' | 'ad'> & { ogrenciSayisi: number; haftalikKatilim: number | null };

export type YoneticiOzeti = {
  sinifSayisi: number;
  ogrenciSayisi: number;
  ogretmenSayisi: number;
  // Bu hafta yoklaması alınan derslere göre; hiç yoklama yoksa null.
  haftalikKatilim: number | null;
  // Bugün ders günü olan (planına göre) ve öğrencisi bulunan sınıflar.
  bugunDersiOlanSinifSayisi: number;
  yoklamasiAlinmayanSiniflar: Pick<Sinif, 'id' | 'ad'>[];
  bekleyenBasvuruSayisi: number;
  // Yöneticinin kurumunun doğrudan altındaki birimler; her biri kendi altındakilerle birlikte sayılır.
  altBirimler: AltBirimOzeti[];
};

function hataMesajinaCevir(mesaj: string): string {
  if (/network|fetch/i.test(mesaj)) return 'Bağlantı sorunu, lütfen tekrar deneyin.';
  return 'Özet alınamadı, lütfen tekrar deneyin.';
}

export async function yoneticiOzetiniGetir(basvuruAcik: boolean, kurumId: string): Promise<YoneticiOzeti> {
  const bugun = bugununTarihi();
  const pazartesi = haftaBaslangici(bugun);

  const [siniflar, ogrenciler, personel, yoklamalar, planlar, kurumlar, basvurular] = await Promise.all([
    supabase.from('sinif').select('id, ad').order('ad'),
    supabase.from('ogrenci').select('id, sinif_id, kurum_id').eq('aktif', true),
    supabase.from('kullanici').select('id', { count: 'exact', head: true }).eq('rol', 'ogretmen').eq('aktif', true),
    supabase.from('yoklama').select('ogrenci_id, tarih, durum').gte('tarih', pazartesi),
    supabase.from('sinif_ders_plani').select('*').order('baslangic_tarihi', { ascending: false }),
    supabase.from('kurum').select('id, ad, ust_kurum_id, yol').order('ad'),
    basvuruAcik ? supabase.from('basvuru').select('id', { count: 'exact', head: true }).eq('durum', 'bekliyor') : null,
  ]);
  const hata = siniflar.error ?? ogrenciler.error ?? personel.error ?? yoklamalar.error ?? planlar.error ?? kurumlar.error;
  if (hata) throw new Error(hataMesajinaCevir(hata.message));

  const sinifinOgrencileri = new Map<string, string[]>();
  for (const o of ogrenciler.data ?? []) {
    sinifinOgrencileri.set(o.sinif_id, [...(sinifinOgrencileri.get(o.sinif_id) ?? []), o.id]);
  }
  const bugunYoklamasiOlanlar = new Set((yoklamalar.data ?? []).filter((y) => y.tarih === bugun).map((y) => y.ogrenci_id));
  const bugununGunu = isoGun(bugun);

  const bugunDersiOlanlar = (siniflar.data ?? []).filter((s) => {
    const gunler = haftaninPlani((planlar.data ?? []).filter((p) => p.sinif_id === s.id), pazartesi);
    return gunler?.includes(bugununGunu) && (sinifinOgrencileri.get(s.id)?.length ?? 0) > 0;
  });

  const altBirimler = (kurumlar.data ?? [])
    .filter((k) => k.ust_kurum_id === kurumId)
    .map((birim) => {
      const dugumler = new Set((kurumlar.data ?? []).filter((k) => k.yol.includes(birim.id)).map((k) => k.id));
      const ogrenciIdleri = new Set((ogrenciler.data ?? []).filter((o) => dugumler.has(o.kurum_id)).map((o) => o.id));
      return {
        id: birim.id,
        ad: birim.ad,
        ogrenciSayisi: ogrenciIdleri.size,
        haftalikKatilim: katilimHesapla((yoklamalar.data ?? []).filter((y) => ogrenciIdleri.has(y.ogrenci_id))).oran,
      };
    });

  return {
    sinifSayisi: siniflar.data?.length ?? 0,
    ogrenciSayisi: ogrenciler.data?.length ?? 0,
    ogretmenSayisi: personel.count ?? 0,
    haftalikKatilim: katilimHesapla(yoklamalar.data ?? []).oran,
    bugunDersiOlanSinifSayisi: bugunDersiOlanlar.length,
    // Sınıftan tek bir öğrencinin bile bugünkü yoklaması varsa sınıfın yoklaması alınmış sayılır.
    yoklamasiAlinmayanSiniflar: bugunDersiOlanlar.filter(
      (s) => !(sinifinOgrencileri.get(s.id) ?? []).some((id) => bugunYoklamasiOlanlar.has(id)),
    ),
    bekleyenBasvuruSayisi: basvurular?.count ?? 0,
    altBirimler,
  };
}
