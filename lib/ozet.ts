// Kurum yöneticisinin özet ekranı: sayılar, bugün yoklaması alınmamış sınıflar, bu haftaki
// katılım, bekleyen başvurular. Hangi satırların geldiğini RLS belirler: ana kurumun yöneticisi
// şubeleriyle birlikte, şube yöneticisi yalnızca kendi şubesini görür. Hesap istemcide yapılır
// (bu ölçekte — kurum başına birkaç yüz öğrenci — yeterli; bkz. lib/katilim.ts).
import { haftaninPlani, katilimHesapla } from '@/lib/katilim';
import { supabase } from '@/lib/supabase';
import { bugununTarihi, haftaBaslangici, isoGun } from '@/lib/tarih';
import type { Sinif } from '@/lib/tipler';

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
};

function hataMesajinaCevir(mesaj: string): string {
  if (/network|fetch/i.test(mesaj)) return 'Bağlantı sorunu, lütfen tekrar deneyin.';
  return 'Özet alınamadı, lütfen tekrar deneyin.';
}

export async function yoneticiOzetiniGetir(basvuruAcik: boolean): Promise<YoneticiOzeti> {
  const bugun = bugununTarihi();
  const pazartesi = haftaBaslangici(bugun);

  const [siniflar, ogrenciler, personel, yoklamalar, planlar, basvurular] = await Promise.all([
    supabase.from('sinif').select('id, ad').order('ad'),
    supabase.from('ogrenci').select('id, sinif_id').eq('aktif', true),
    supabase.from('kullanici').select('id', { count: 'exact', head: true }).eq('rol', 'ogretmen').eq('aktif', true),
    supabase.from('yoklama').select('ogrenci_id, tarih, durum').gte('tarih', pazartesi),
    supabase.from('sinif_ders_plani').select('*').order('baslangic_tarihi', { ascending: false }),
    basvuruAcik ? supabase.from('basvuru').select('id', { count: 'exact', head: true }).eq('durum', 'bekliyor') : null,
  ]);
  const hata = siniflar.error ?? ogrenciler.error ?? personel.error ?? yoklamalar.error ?? planlar.error;
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
  };
}
