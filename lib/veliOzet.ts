// Veli ana ekranının özeti: her çocuk için bugünkü yoklama, bu haftaki katılım, son gelişim
// kaydı; ayrıca yaklaşan etkinlikler. Hangi satırların geldiğini RLS belirler (veli yalnızca
// kendi çocuklarını ve kapsamındaki duyuruları okur). Kurumun veliler için kapattığı bölümlerin
// verisi istenmez. Yardımcı bölümler (gelişim, etkinlik) okunamazsa özet onlarsız gösterilir.
import { type Katilim, katilimHesapla } from '@/lib/katilim';
import { supabase } from '@/lib/supabase';
import { bugununTarihi, haftaBaslangici } from '@/lib/tarih';
import type { Duyuru, Ogrenci, YoklamaDurumu } from '@/lib/tipler';

export type CocukOzeti = {
  ogrenci: Ogrenci;
  sinifAdi: string | null;
  bugun: YoklamaDurumu | null;
  hafta: Katilim;
  sonGelisim: { kategoriAdi: string; tarih: string; notMetni: string } | null;
};

export type VeliOzeti = { cocuklar: CocukOzeti[]; etkinlikler: Duyuru[] };

const EN_FAZLA_ETKINLIK = 3;

function hataMesajinaCevir(mesaj: string): string {
  if (/network|fetch/i.test(mesaj)) return 'Bağlantı sorunu, lütfen tekrar deneyin.';
  return 'Bilgiler alınamadı, lütfen tekrar deneyin.';
}

export async function veliOzetiniGetir(bolumler: { yoklama: boolean; gelisim: boolean; duyurular: boolean }): Promise<VeliOzeti> {
  const bugun = bugununTarihi();
  const pazartesi = haftaBaslangici(bugun);

  const [cocukSonucu, sinifSonucu, yoklamaSonucu, gelisimSonucu, kategoriSonucu, etkinlikSonucu] = await Promise.all([
    supabase.from('ogrenci').select('*').order('ad_soyad'),
    supabase.from('sinif').select('id, ad'),
    bolumler.yoklama ? supabase.from('yoklama').select('ogrenci_id, tarih, durum').gte('tarih', pazartesi) : null,
    bolumler.gelisim
      ? supabase
          .from('gelisim_kaydi')
          .select('ogrenci_id, kategori_id, tarih, not_metni')
          .order('tarih', { ascending: false })
          .order('olusturma_tarihi', { ascending: false })
          .limit(50)
      : null,
    bolumler.gelisim ? supabase.from('gelisim_kategorisi').select('id, ad') : null,
    bolumler.duyurular
      ? supabase
          .from('duyuru')
          .select('*')
          .eq('tur', 'etkinlik')
          .gte('etkinlik_zamani', new Date().toISOString())
          .order('etkinlik_zamani')
          .limit(EN_FAZLA_ETKINLIK)
      : null,
  ]);
  if (cocukSonucu.error) throw new Error(hataMesajinaCevir(cocukSonucu.error.message));
  if (yoklamaSonucu?.error) throw new Error(hataMesajinaCevir(yoklamaSonucu.error.message));

  const sinifAdlari = new Map((sinifSonucu.data ?? []).map((s) => [s.id, s.ad]));
  const kategoriAdlari = new Map((kategoriSonucu?.data ?? []).map((k) => [k.id, k.ad]));
  const yoklamalar = yoklamaSonucu?.data ?? [];
  const gelisimler = gelisimSonucu?.data ?? [];

  const cocuklar = cocukSonucu.data.map((ogrenci): CocukOzeti => {
    const kendiYoklamalari = yoklamalar.filter((y) => y.ogrenci_id === ogrenci.id);
    const son = gelisimler.find((g) => g.ogrenci_id === ogrenci.id);
    return {
      ogrenci,
      sinifAdi: sinifAdlari.get(ogrenci.sinif_id) ?? null,
      bugun: kendiYoklamalari.find((y) => y.tarih === bugun)?.durum ?? null,
      hafta: katilimHesapla(kendiYoklamalari),
      sonGelisim: son
        ? { kategoriAdi: kategoriAdlari.get(son.kategori_id) ?? 'Gelişim', tarih: son.tarih, notMetni: son.not_metni }
        : null,
    };
  });

  return { cocuklar, etkinlikler: etkinlikSonucu?.data ?? [] };
}
