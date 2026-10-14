// Yöneticinin öğrenci ve personel (hoca) detay ekranlarının özet verisi. Erişim: kurum_admin; hangi
// satırların geldiğini RLS belirler (yönettiği birim ve altı). Sayılar istemcide hesaplanır; birkaç
// sınıflık bir hoca ve tek öğrenci için veri küçüktür.
import { type Katilim, katilimHesapla } from '@/lib/katilim';
import { supabase } from '@/lib/supabase';
import { bugununTarihi, gunEkle } from '@/lib/tarih';
import type { Kullanici, Ogrenci, Sinif, YoklamaDurumu } from '@/lib/tipler';

// Detay ekranlarındaki katılım: bugün dahil son 4 hafta.
export const DETAY_GUN_SAYISI = 28;

function hataMesajinaCevir(mesaj: string): string {
  if (/permission denied|rls/i.test(mesaj)) return 'Bu kaydı görme yetkiniz yok.';
  if (/network|fetch/i.test(mesaj)) return 'Bağlantı sorunu, lütfen tekrar deneyin.';
  return 'Bilgiler alınamadı, lütfen tekrar deneyin.';
}

function denetle<T>(sonuc: { data: T | null; error: { message: string } | null }): T {
  if (sonuc.error) throw new Error(hataMesajinaCevir(sonuc.error.message));
  return sonuc.data as T;
}

const donemBaslangici = () => gunEkle(bugununTarihi(), -(DETAY_GUN_SAYISI - 1));

export type OgrenciOzeti = {
  ogrenci: Ogrenci;
  sinif: Sinif | null;
  katilim: Katilim;
  sonYoklama: string | null;
  ezber: { tamam: number; devam: number };
  kitap: { biten: number; okunan: number };
  gelisimKaydi: number;
};

export async function ogrenciOzetiniGetir(id: string): Promise<OgrenciOzeti> {
  const ogrenciSonucu = await supabase.from('ogrenci').select('*').eq('id', id).maybeSingle();
  const ogrenci = denetle(ogrenciSonucu);
  if (!ogrenci) throw new Error('Öğrenci bulunamadı ya da görme yetkiniz yok.');

  const [sinif, yoklamalar, ezberler, kitaplar, gelisim] = await Promise.all([
    supabase.from('sinif').select('*').eq('id', ogrenci.sinif_id).maybeSingle(),
    supabase
      .from('yoklama')
      .select('tarih, durum')
      .eq('ogrenci_id', id)
      .gte('tarih', donemBaslangici())
      .order('tarih', { ascending: false }),
    supabase.from('ogrenci_ezber').select('durum').eq('ogrenci_id', id),
    supabase.from('kitap_okuma').select('durum').eq('ogrenci_id', id),
    supabase.from('gelisim_kaydi').select('id', { count: 'exact', head: true }).eq('ogrenci_id', id),
  ]);
  if (gelisim.error) throw new Error(hataMesajinaCevir(gelisim.error.message));
  const y = denetle(yoklamalar);
  // Ezber ve kitap tabloları içerik takibi kapalı müşteride de vardır; boş döner.
  const e = denetle(ezberler);
  const k = denetle(kitaplar);

  return {
    ogrenci,
    sinif: denetle(sinif),
    katilim: katilimHesapla(y),
    sonYoklama: y[0]?.tarih ?? null,
    ezber: { tamam: e.filter((x) => x.durum === 'tamam').length, devam: e.filter((x) => x.durum === 'devam').length },
    kitap: { biten: k.filter((x) => x.durum === 'bitti').length, okunan: k.filter((x) => x.durum === 'okuyor').length },
    gelisimKaydi: gelisim.count ?? 0,
  };
}

export type HocaSinifi = {
  sinif: Sinif;
  kademeAdi: string | null;
  ogrenciSayisi: number;
  katilim: Katilim;
  sonYoklama: string | null;
  // Sınıfa kademe atanmamışsa null.
  konu: { islenen: number; toplam: number } | null;
};

export type PersonelOzeti = {
  personel: Kullanici;
  siniflar: HocaSinifi[];
  // Tüm sınıfların toplamı.
  ogrenciSayisi: number;
  katilim: Katilim;
};

export async function personelOzetiniGetir(id: string): Promise<PersonelOzeti> {
  const personel = denetle(await supabase.from('kullanici').select('*').eq('id', id).maybeSingle());
  if (!personel) throw new Error('Kişi bulunamadı ya da görme yetkiniz yok.');

  const atamalar = denetle(await supabase.from('ogretmen_sinif').select('sinif_id').eq('ogretmen_id', id));
  const sinifIdleri = atamalar.map((a) => a.sinif_id);
  if (sinifIdleri.length === 0) {
    return { personel, siniflar: [], ogrenciSayisi: 0, katilim: katilimHesapla([]) };
  }

  const [siniflarSonucu, ogrencilerSonucu, ilerlemeSonucu] = await Promise.all([
    supabase.from('sinif').select('*').in('id', sinifIdleri).order('ad'),
    supabase.from('ogrenci').select('id, sinif_id').in('sinif_id', sinifIdleri).eq('aktif', true),
    supabase.from('sinif_konu_ilerleme').select('sinif_id').in('sinif_id', sinifIdleri),
  ]);
  const siniflar = denetle(siniflarSonucu);
  const ogrenciler = denetle(ogrencilerSonucu);
  const ilerleme = denetle(ilerlemeSonucu);

  const ogrenciIdleri = ogrenciler.map((o) => o.id);
  const kademeIdleri = [...new Set(siniflar.map((s) => s.kademe_id).filter((k): k is string => k !== null))];

  const [yoklamaSonucu, kademeSonucu, dersSonucu] = await Promise.all([
    ogrenciIdleri.length
      ? supabase.from('yoklama').select('ogrenci_id, tarih, durum').in('ogrenci_id', ogrenciIdleri).gte('tarih', donemBaslangici())
      : Promise.resolve({ data: [] as { ogrenci_id: string; tarih: string; durum: YoklamaDurumu }[], error: null }),
    kademeIdleri.length
      ? supabase.from('kademe').select('id, ad').in('id', kademeIdleri)
      : Promise.resolve({ data: [] as { id: string; ad: string }[], error: null }),
    kademeIdleri.length
      ? supabase.from('kademe_dersi').select('id, kademe_id').in('kademe_id', kademeIdleri)
      : Promise.resolve({ data: [] as { id: string; kademe_id: string }[], error: null }),
  ]);
  const yoklamalar = denetle(yoklamaSonucu);
  const kademeler = denetle(kademeSonucu);
  const dersler = denetle(dersSonucu);
  const konular = dersler.length
    ? denetle(await supabase.from('ders_konusu').select('ders_id').in('ders_id', dersler.map((d) => d.id)))
    : [];

  const ogrencininSinifi = new Map(ogrenciler.map((o) => [o.id, o.sinif_id]));
  const dersinKademesi = new Map(dersler.map((d) => [d.id, d.kademe_id]));
  const kademeKonuSayisi = new Map<string, number>();
  for (const k of konular) {
    const kademeId = dersinKademesi.get(k.ders_id);
    if (kademeId) kademeKonuSayisi.set(kademeId, (kademeKonuSayisi.get(kademeId) ?? 0) + 1);
  }

  const hocaSiniflari = siniflar.map((sinif): HocaSinifi => {
    const sinifYoklamalari = yoklamalar.filter((y) => ogrencininSinifi.get(y.ogrenci_id) === sinif.id);
    const sonYoklama = sinifYoklamalari.reduce<string | null>((en, y) => (en === null || y.tarih > en ? y.tarih : en), null);
    return {
      sinif,
      kademeAdi: kademeler.find((k) => k.id === sinif.kademe_id)?.ad ?? null,
      ogrenciSayisi: ogrenciler.filter((o) => o.sinif_id === sinif.id).length,
      katilim: katilimHesapla(sinifYoklamalari),
      sonYoklama,
      konu: sinif.kademe_id
        ? {
            islenen: ilerleme.filter((i) => i.sinif_id === sinif.id).length,
            toplam: kademeKonuSayisi.get(sinif.kademe_id) ?? 0,
          }
        : null,
    };
  });

  return { personel, siniflar: hocaSiniflari, ogrenciSayisi: ogrenciler.length, katilim: katilimHesapla(yoklamalar) };
}
