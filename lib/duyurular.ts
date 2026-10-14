// Duyurular ve etkinlikler. Kurum admini yönettiği kurumlara (kurum geneli ya da sınıfa özel),
// öğretmen yalnızca atandığı sınıfa yazar ve yalnızca kendi yazdığını değiştirir/siler; kapsamdaki
// herkes okur. Yetkinin tamamı RLS'tedir (duyuru_* politikaları); buradaki kontroller yalnızca
// anlaşılır hata mesajı içindir.
import { siniflariGetir } from '@/lib/siniflar';
import { supabase } from '@/lib/supabase';
import { tarihGecerliMi, tarihiBicimle } from '@/lib/tarih';
import type { Duyuru, DuyuruTuru } from '@/lib/tipler';

export const DUYURU_TURU_ETIKETLERI: Record<DuyuruTuru, string> = { duyuru: 'Duyuru', etkinlik: 'Etkinlik' };

const BASLIK_AZAMI_UZUNLUK = 120;
const ICERIK_AZAMI_UZUNLUK = 4000;
const YER_AZAMI_UZUNLUK = 120;
const SAAT_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const LISTE_SINIRI = 100;

function hataMesajinaCevir(mesaj: string, kod?: string): string {
  // Güncelleme/okuma RLS'e takılınca hata değil boş sonuç döner; `.single()` bunu PGRST116 yapar.
  if (kod === 'PGRST116') return 'Duyuru bulunamadı ya da bu işlem için yetkiniz yok.';
  if (/permission denied|rls|row-level security/i.test(mesaj)) return 'Bu işlem için yetkiniz yok.';
  if (/network|fetch/i.test(mesaj)) return 'Bağlantı sorunu, lütfen tekrar deneyin.';
  return 'İşlem yapılamadı, lütfen tekrar deneyin.';
}

// Etkinlik zamanı formda yerel gün ('YYYY-AA-GG') + saat ('SS:DD') olarak girilir.
export type DuyuruGirdisi = {
  tur: DuyuruTuru;
  baslik: string;
  icerik: string;
  etkinlikTarihi: string;
  etkinlikSaati: string;
  yer: string;
};

// kurum_adi: duyurunun yazıldığı birim (genel duyuruda kapsam olarak gösterilir).
export type DuyuruSatiri = Duyuru & { sinif_adi: string | null; kurum_adi?: string | null };

const ikiHane = (n: number) => String(n).padStart(2, '0');

// timestamptz -> cihazın saat dilimindeki gün ve saat (form ve gösterim için).
export function etkinlikZamaniniParcala(zaman: string): { tarih: string; saat: string } {
  const d = new Date(zaman);
  return {
    tarih: `${d.getFullYear()}-${ikiHane(d.getMonth() + 1)}-${ikiHane(d.getDate())}`,
    saat: `${ikiHane(d.getHours())}:${ikiHane(d.getMinutes())}`,
  };
}

export function etkinlikZamaniniBicimle(zaman: string): string {
  const { tarih, saat } = etkinlikZamaniniParcala(zaman);
  return `${tarihiBicimle(tarih)}, ${saat}`;
}

export function duyurudanGirdiye(d: Duyuru): DuyuruGirdisi {
  const zaman = d.etkinlik_zamani ? etkinlikZamaniniParcala(d.etkinlik_zamani) : { tarih: '', saat: '' };
  return {
    tur: d.tur,
    baslik: d.baslik,
    icerik: d.icerik,
    etkinlikTarihi: zaman.tarih,
    etkinlikSaati: zaman.saat,
    yer: d.yer ?? '',
  };
}

function girdiyiDogrula(girdi: DuyuruGirdisi) {
  const baslik = girdi.baslik.trim();
  const icerik = girdi.icerik.trim();
  const yer = girdi.yer.trim();
  if (!baslik) throw new Error('Başlık gerekli.');
  if (baslik.length > BASLIK_AZAMI_UZUNLUK) throw new Error(`Başlık en fazla ${BASLIK_AZAMI_UZUNLUK} karakter olabilir.`);
  if (!icerik) throw new Error('İçerik gerekli.');
  if (icerik.length > ICERIK_AZAMI_UZUNLUK) throw new Error(`İçerik en fazla ${ICERIK_AZAMI_UZUNLUK} karakter olabilir.`);

  if (girdi.tur === 'duyuru') return { tur: girdi.tur, baslik, icerik, etkinlik_zamani: null, yer: null };

  if (!tarihGecerliMi(girdi.etkinlikTarihi)) throw new Error('Etkinlik tarihini gün, ay ve yıl olarak girin (örn. 20 / 09 / 2026).');
  if (!SAAT_RE.test(girdi.etkinlikSaati.trim())) throw new Error('Etkinlik saatini SS:DD olarak girin (örn. 14:30).');
  if (yer.length > YER_AZAMI_UZUNLUK) throw new Error(`Yer en fazla ${YER_AZAMI_UZUNLUK} karakter olabilir.`);
  const [yil, ay, gun] = girdi.etkinlikTarihi.split('-').map(Number);
  const [saat, dakika] = girdi.etkinlikSaati.trim().split(':').map(Number);
  return {
    tur: girdi.tur,
    baslik,
    icerik,
    etkinlik_zamani: new Date(yil, ay - 1, gun, saat, dakika).toISOString(),
    yer: yer || null,
  };
}

// RLS çağıranın kapsamındaki duyuruları döndürür; en yeni üstte. Sınıf adları ayrı sorguyla
// eklenir (bkz. lib/yoklama.ts): RLS'in izin verdiği sınıflar yeterlidir, çünkü sınıfa özel
// duyuruyu yalnızca o sınıfı görebilenler okur. Birim adları da öyle: herkes kendi kurumunu ve
// üstlerini, yönetici ayrıca altındaki birimleri okur; okunamazsa kart "Tüm kurum" yazar.
export async function duyurulariGetir(): Promise<DuyuruSatiri[]> {
  return adlarlaGetir(supabase.from('duyuru').select('*').order('olusturma_tarihi', { ascending: false }).limit(LISTE_SINIRI));
}

// Takvim: [baslangic, bitis] günlerindeki (cihazın saatine göre, uçlar dahil) etkinlikler, zamana
// göre sıralı. Aynı güne birden çok etkinlik olabilir. Kapsamı RLS belirler (duyurularla aynı).
export async function etkinlikleriGetir(baslangic: string, bitis: string): Promise<DuyuruSatiri[]> {
  const [y1, a1, g1] = baslangic.split('-').map(Number);
  const [y2, a2, g2] = bitis.split('-').map(Number);
  return adlarlaGetir(
    supabase
      .from('duyuru')
      .select('*')
      .eq('tur', 'etkinlik')
      .gte('etkinlik_zamani', new Date(y1, a1 - 1, g1).toISOString())
      .lt('etkinlik_zamani', new Date(y2, a2 - 1, g2 + 1).toISOString())
      .order('etkinlik_zamani')
      .limit(500),
  );
}

async function adlarlaGetir(sorgu: PromiseLike<{ data: Duyuru[] | null; error: { message: string; code?: string } | null }>) {
  const [{ data, error }, siniflar, kurumlar] = await Promise.all([sorgu, siniflariGetir(), supabase.from('kurum').select('id, ad')]);
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
  const adHaritasi = new Map(siniflar.map((s) => [s.id, s.ad]));
  const kurumAdlari = new Map((kurumlar.data ?? []).map((k) => [k.id, k.ad]));
  return (data ?? []).map((d) => ({
    ...d,
    sinif_adi: d.sinif_id ? (adHaritasi.get(d.sinif_id) ?? 'Sınıf') : null,
    kurum_adi: kurumAdlari.get(d.kurum_id) ?? null,
  }));
}

export async function duyuruGetir(id: string): Promise<Duyuru> {
  const { data, error } = await supabase.from('duyuru').select('*').eq('id', id).single();
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
  return data;
}

// kurumId: kapsamın kurumu — sınıfa özel duyuruda sınıfın kurumu, kurum geneli duyuruda yazanın
// kurumu (kök kurumsa şubeler de kapsanır). sinifId null ise kurum genelidir.
export async function duyuruEkle(
  kurumId: string,
  sinifId: string | null,
  girenKullaniciId: string,
  girdi: DuyuruGirdisi,
): Promise<Duyuru> {
  const alanlar = girdiyiDogrula(girdi);
  const { data, error } = await supabase
    .from('duyuru')
    .insert({ kurum_id: kurumId, sinif_id: sinifId, giren_kullanici_id: girenKullaniciId, ...alanlar })
    .select()
    .single();
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));

  // Bildirim en iyi çabadır: duyuru kaydedildi, gönderim hatası bu işlemi geçersiz kılmaz.
  // Yalnızca yeni duyuruda gönderilir; düzeltmeler tekrar bildirilmez.
  supabase.functions.invoke('duyuru-bildirim-gonder', { body: { duyuru_id: data.id } }).catch(() => {});

  return data;
}

export async function duyuruGuncelle(id: string, girdi: DuyuruGirdisi): Promise<Duyuru> {
  const alanlar = girdiyiDogrula(girdi);
  const { data, error } = await supabase.from('duyuru').update(alanlar).eq('id', id).select().single();
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
  return data;
}

export async function duyuruSil(id: string): Promise<void> {
  const { error } = await supabase.from('duyuru').delete().eq('id', id);
  if (error) throw new Error(hataMesajinaCevir(error.message));
}
