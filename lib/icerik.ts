// İçerik takibi: kademe (müfredat) -> ders -> konu, ezber maddeleri (müşterinin ortak listesi +
// kademeye özel ekler); sınıfın konu ilerlemesi ve öğrencinin ezber durumu. Tanımlar müşteri (kök kurum) düzeyindedir ve yalnızca kök kurumun
// admini yönetir; takibi sınıfın öğretmeni ve kurum admini girer, veli okur. Yetkinin tamamı
// RLS'tedir (20261016120000_icerik_takibi.sql). Özellik müşteri bazında açılır: useOzellik('icerik_takibi').
import { supabase } from '@/lib/supabase';
import { bugununTarihi } from '@/lib/tarih';
import type { DersKonusu, EzberDurumu, EzberMaddesi, Kademe, KademeDersi, KonuNotu, OgrenciEzber } from '@/lib/tipler';

export const ICERIK_OZELLIGI = 'icerik_takibi';

function hataMesajinaCevir(mesaj: string, kod?: string): string {
  if (kod === '23505') return 'Bu adla bir kayıt zaten var.';
  if (kod === '23514' && /İşlenme tarihi/.test(mesaj)) return 'İşlenme tarihi ileri bir gün olamaz.';
  if (kod === '23514' && /konu_notu/.test(mesaj)) return 'Not boş olamaz ve en fazla 1000 karakter olabilir.';
  if (kod === 'PGRST116') return 'Kayıt bulunamadı ya da bu işlem için yetkiniz yok.';
  if (kod === '42501' || /permission denied|rls|row-level security/i.test(mesaj)) return 'Bu işlem için yetkiniz yok.';
  if (/network|fetch/i.test(mesaj)) return 'Bağlantı sorunu, lütfen tekrar deneyin.';
  return 'İşlem yapılamadı, lütfen tekrar deneyin.';
}

const kontrol = (error: { message: string; code?: string } | null) => {
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
};

// Çok satırlı metinden ad listesi (her satır bir ad; boşlar ve tekrarlar atılır).
export function satirlaraAyir(metin: string): string[] {
  return [...new Set(metin.split(/\r?\n/).map((s) => s.trim()).filter(Boolean))];
}

// Ad karşılaştırması: büyük/küçük harf ve aradaki boşluk farkı aynı ad sayılır.
const adAnahtari = (ad: string) => ad.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr');

export type TopluEklemeSonucu = { eklenen: number; atlanan: number };

// Yapıştırılan satırlardan listede zaten bulunanları ve birbirinin tekrarını ayıklar.
function yenileriAyir(metin: string, mevcutAdlar: string[], bosHata: string): { yeniler: string[]; atlanan: number } {
  const adlar = satirlaraAyir(metin);
  if (adlar.length === 0) throw new Error(bosHata);
  const gorulen = new Set(mevcutAdlar.map(adAnahtari));
  const yeniler = adlar.filter((ad) => {
    const anahtar = adAnahtari(ad);
    if (gorulen.has(anahtar)) return false;
    gorulen.add(anahtar);
    return true;
  });
  if (yeniler.length === 0) throw new Error(adlar.length === 1 ? 'Bu ad listede zaten var.' : 'Bu adların hepsi listede zaten var.');
  return { yeniler, atlanan: adlar.length - yeniler.length };
}

// Toplu ekleme sonrası kısa bildirim metni ("3 konu eklendi, 2 zaten vardı").
export function topluEklemeMesaji(sonuc: TopluEklemeSonucu, tekil: string): string {
  return `${sonuc.eklenen} ${tekil} eklendi${sonuc.atlanan ? `, ${sonuc.atlanan} zaten vardı` : ''}`;
}

// ---------------------------------------------------------------------------
// Tanımlar
// ---------------------------------------------------------------------------

export async function kademeleriGetir(): Promise<Kademe[]> {
  const { data, error } = await supabase.from('kademe').select('*').order('sira').order('ad');
  kontrol(error);
  return data ?? [];
}

export async function kademeGetir(id: string): Promise<Kademe> {
  const { data, error } = await supabase.from('kademe').select('*').eq('id', id).single();
  kontrol(error);
  return data as Kademe;
}

export async function kademeEkle(kokKurumId: string, ad: string): Promise<void> {
  if (!ad.trim()) throw new Error('Kademe adı gerekli.');
  const { count } = await supabase.from('kademe').select('id', { count: 'exact', head: true });
  const { error } = await supabase.from('kademe').insert({ kurum_id: kokKurumId, ad: ad.trim(), sira: (count ?? 0) + 1 });
  kontrol(error);
}

export async function kademeAdiniGuncelle(id: string, ad: string): Promise<void> {
  if (!ad.trim()) throw new Error('Kademe adı gerekli.');
  const { error } = await supabase.from('kademe').update({ ad: ad.trim() }).eq('id', id);
  kontrol(error);
}

// Kademe silinince dersleri, konuları, ezber maddeleri ve bunlara bağlı tüm takip kayıtları da silinir.
export async function kademeSil(id: string): Promise<void> {
  const { error } = await supabase.from('kademe').delete().eq('id', id);
  kontrol(error);
}

export type KademeIcerigi = { dersler: (KademeDersi & { konular: DersKonusu[] })[]; ezberler: EzberMaddesi[] };

export async function kademeIceriginiGetir(kademeId: string): Promise<KademeIcerigi> {
  const [dersler, ezberler] = await Promise.all([
    supabase.from('kademe_dersi').select('*').eq('kademe_id', kademeId).order('sira').order('ad'),
    supabase.from('ezber_maddesi').select('*').eq('kademe_id', kademeId).order('sira').order('ad'),
  ]);
  kontrol(dersler.error);
  kontrol(ezberler.error);
  const dersIdleri = (dersler.data ?? []).map((d) => d.id);
  const konular = dersIdleri.length
    ? await supabase.from('ders_konusu').select('*').in('ders_id', dersIdleri).order('sira').order('ad')
    : { data: [] as DersKonusu[], error: null };
  kontrol(konular.error);
  return {
    dersler: (dersler.data ?? []).map((d) => ({ ...d, konular: (konular.data ?? []).filter((k) => k.ders_id === d.id) })),
    ezberler: ezberler.data ?? [],
  };
}

export async function dersEkle(kokKurumId: string, kademeId: string, ad: string, sira: number): Promise<void> {
  if (!ad.trim()) throw new Error('Ders adı gerekli.');
  const { error } = await supabase.from('kademe_dersi').insert({ kurum_id: kokKurumId, kademe_id: kademeId, ad: ad.trim(), sira });
  kontrol(error);
}

export async function dersSil(id: string): Promise<void> {
  const { error } = await supabase.from('kademe_dersi').delete().eq('id', id);
  kontrol(error);
}

// Her satır bir konu; listenin sonuna eklenir. Derste aynı adla bulunan konu atlanır.
export async function konulariEkle(
  kokKurumId: string,
  dersId: string,
  metin: string,
  mevcutSayi: number,
): Promise<TopluEklemeSonucu> {
  const { data: mevcut, error: okumaHatasi } = await supabase.from('ders_konusu').select('ad').eq('ders_id', dersId);
  kontrol(okumaHatasi);
  const { yeniler, atlanan } = yenileriAyir(
    metin,
    (mevcut ?? []).map((k) => k.ad),
    'En az bir konu yazın (her satıra bir konu).',
  );
  const { error } = await supabase
    .from('ders_konusu')
    .insert(yeniler.map((ad, i) => ({ kurum_id: kokKurumId, ders_id: dersId, ad, sira: mevcutSayi + i + 1 })));
  kontrol(error);
  return { eklenen: yeniler.length, atlanan };
}

export async function konuSil(id: string): Promise<void> {
  const { error } = await supabase.from('ders_konusu').delete().eq('id', id);
  kontrol(error);
}

// Bir sınıfın ezber listesi: müşterinin ortak listesi (kademe_id boş; tüm kademeler ve kademesiz
// sınıflar) + varsa sınıfın kademesine özel ek maddeler. Ortak liste önce gelir.
export async function ezberListesiniGetir(kademeId: string | null): Promise<EzberMaddesi[]> {
  const sorgu = supabase.from('ezber_maddesi').select('*');
  const { data, error } = await (kademeId ? sorgu.or(`kademe_id.is.null,kademe_id.eq.${kademeId}`) : sorgu.is('kademe_id', null))
    .order('sira')
    .order('ad');
  kontrol(error);
  return [...(data ?? [])].sort((a, b) => Number(a.kademe_id !== null) - Number(b.kademe_id !== null));
}

// Listeyi grup başlıklarına böler; gruplar ilk göründükleri sırayla, grupsuz maddeler tek başlıkta.
export function ezberGruplari(maddeler: EzberMaddesi[]): { grup: string | null; maddeler: EzberMaddesi[] }[] {
  const gruplar = new Map<string | null, EzberMaddesi[]>();
  for (const m of maddeler) gruplar.set(m.grup, [...(gruplar.get(m.grup) ?? []), m]);
  return [...gruplar].map(([grup, liste]) => ({ grup, maddeler: liste }));
}

// kademeId null: ortak listeye eklenir. Her satır bir madde; listenin sonuna eklenir.
export async function ezberleriEkle(
  kokKurumId: string,
  kademeId: string | null,
  metin: string,
  mevcutSayi: number,
  grup: string | null = null,
): Promise<TopluEklemeSonucu> {
  // Kademeye özel madde ortak listedekiyle de karşılaştırılır (sınıfta ikisi birlikte görünür).
  const mevcut = await ezberListesiniGetir(kademeId);
  const { yeniler, atlanan } = yenileriAyir(
    metin,
    mevcut.map((m) => m.ad),
    'En az bir ezber maddesi yazın (her satıra bir madde).',
  );
  const { error } = await supabase
    .from('ezber_maddesi')
    .insert(yeniler.map((ad, i) => ({ kurum_id: kokKurumId, kademe_id: kademeId, ad, sira: mevcutSayi + i + 1, grup: grup?.trim() || null })));
  kontrol(error);
  return { eklenen: yeniler.length, atlanan };
}

export async function ezberMaddesiSil(id: string): Promise<void> {
  const { error } = await supabase.from('ezber_maddesi').delete().eq('id', id);
  kontrol(error);
}

// Sınıfın izlediği kademe (kurum admini; RLS: sinif_kurum_admin). null: kademe yok.
export async function sinifKademesiniAyarla(sinifId: string, kademeId: string | null): Promise<void> {
  const { error } = await supabase.from('sinif').update({ kademe_id: kademeId }).eq('id', sinifId);
  kontrol(error);
}

// ---------------------------------------------------------------------------
// Sınıfın konu ilerlemesi
// ---------------------------------------------------------------------------

// konu id -> tamamlanma tarihi (satır varsa konu işlenmiştir)
export async function sinifIlerlemesiniGetir(sinifId: string): Promise<Map<string, string>> {
  const { data, error } = await supabase.from('sinif_konu_ilerleme').select('konu_id, tamamlanma_tarihi').eq('sinif_id', sinifId);
  kontrol(error);
  return new Map((data ?? []).map((i) => [i.konu_id, i.tamamlanma_tarihi]));
}

// kurumId: sınıfın kurumu.
export async function konuDurumunuAyarla(
  kurumId: string,
  sinifId: string,
  konuId: string,
  girenKullaniciId: string,
  tamamlandi: boolean,
): Promise<void> {
  const { error } = tamamlandi
    ? await supabase
        .from('sinif_konu_ilerleme')
        .insert({ kurum_id: kurumId, sinif_id: sinifId, konu_id: konuId, giren_kullanici_id: girenKullaniciId, tamamlanma_tarihi: bugununTarihi() })
    : await supabase.from('sinif_konu_ilerleme').delete().eq('sinif_id', sinifId).eq('konu_id', konuId);
  // 23505: konu zaten işaretli (ör. sınıfın diğer öğretmeni az önce işaretledi) — istenen durum sağlanmış.
  if (error && error.code !== '23505') kontrol(error);
}

// İşlenmiş konunun tarihini değiştirir (bugün ya da öncesi; ileri tarihi sunucu da reddeder).
export async function konuTarihiniGuncelle(sinifId: string, konuId: string, tarih: string): Promise<void> {
  if (tarih > bugununTarihi()) throw new Error('İşlenme tarihi ileri bir gün olamaz.');
  const { error } = await supabase
    .from('sinif_konu_ilerleme')
    .update({ tamamlanma_tarihi: tarih })
    .eq('sinif_id', sinifId)
    .eq('konu_id', konuId);
  kontrol(error);
}

// ---------------------------------------------------------------------------
// Konu notu ve yönetici yanıtı (sınıfın öğretmeni ve kurum admini; veli göremez). Yazan, gören ve
// yanıtlayan kişi ile zamanlar sunucuda dolar; yanıtı ve görüldü işaretini yalnızca yönetici yazar.
// ---------------------------------------------------------------------------

// Notu yazan/gören/yanıtlayan kişinin adı: yalnızca okuma yetkisi olan (yönetici) görür; hoca
// başka personelin satırını okuyamadığı için ad boş kalır.
export type KonuNotuAyrintisi = KonuNotu & { yazanAdi?: string; yanitVerenAdi?: string };

async function kisiAdlari(idler: (string | null)[]): Promise<Map<string, string>> {
  const tekil = [...new Set(idler.filter((i): i is string => !!i))];
  if (tekil.length === 0) return new Map();
  const { data } = await supabase.from('kullanici').select('id, ad_soyad').in('id', tekil);
  return new Map((data ?? []).map((k) => [k.id, k.ad_soyad]));
}

// konu id -> not
export async function sinifKonuNotlariniGetir(sinifId: string): Promise<Map<string, KonuNotuAyrintisi>> {
  const { data, error } = await supabase.from('sinif_konu_notu').select('*').eq('sinif_id', sinifId);
  kontrol(error);
  const notlar = data ?? [];
  const adlar = await kisiAdlari(notlar.flatMap((n) => [n.yazan_kullanici_id, n.yanit_veren_kullanici_id]));
  return new Map(
    notlar.map((n) => [
      n.konu_id,
      {
        ...n,
        yazanAdi: n.yazan_kullanici_id ? adlar.get(n.yazan_kullanici_id) : undefined,
        yanitVerenAdi: n.yanit_veren_kullanici_id ? adlar.get(n.yanit_veren_kullanici_id) : undefined,
      },
    ]),
  );
}

// kurumId: sınıfın kurumu. Not yoksa eklenir, varsa değiştirilir.
export async function konuNotunuKaydet(kurumId: string, sinifId: string, konuId: string, metin: string, mevcut: boolean): Promise<void> {
  const not_metni = metin.trim();
  if (!not_metni) throw new Error('Not boş olamaz.');
  if (not_metni.length > 1000) throw new Error('Not en fazla 1000 karakter olabilir.');
  const { error } = mevcut
    ? await supabase.from('sinif_konu_notu').update({ not_metni }).eq('sinif_id', sinifId).eq('konu_id', konuId)
    : await supabase.from('sinif_konu_notu').insert({ kurum_id: kurumId, sinif_id: sinifId, konu_id: konuId, not_metni });
  kontrol(error);
}

export async function konuNotunuSil(sinifId: string, konuId: string): Promise<void> {
  const { error } = await supabase.from('sinif_konu_notu').delete().eq('sinif_id', sinifId).eq('konu_id', konuId);
  kontrol(error);
}

// Yönetici: notu görüldü işaretler (zamanı ve göreni sunucu yazar).
export async function notuGorulduYap(sinifId: string, konuId: string): Promise<void> {
  const { error } = await supabase
    .from('sinif_konu_notu')
    .update({ goruldu_zamani: new Date().toISOString() })
    .eq('sinif_id', sinifId)
    .eq('konu_id', konuId)
    .is('goruldu_zamani', null);
  kontrol(error);
}

// Yönetici: nota yanıt yazar (boş metin yanıtı kaldırır). Yanıt yazılınca sınıfın hocalarına
// bildirim gider (en iyi çaba; hata yanıtı geçersiz kılmaz).
export async function notaYanitVer(sinifId: string, konuId: string, metin: string): Promise<void> {
  const yanit_metni = metin.trim() || null;
  if (yanit_metni && yanit_metni.length > 1000) throw new Error('Yanıt en fazla 1000 karakter olabilir.');
  const { error } = await supabase.from('sinif_konu_notu').update({ yanit_metni }).eq('sinif_id', sinifId).eq('konu_id', konuId);
  kontrol(error);
  if (yanit_metni) {
    supabase.functions.invoke('konu-notu-bildirim-gonder', { body: { sinif_id: sinifId, konu_id: konuId } }).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Öğrencinin ezber durumu
// ---------------------------------------------------------------------------

export const EZBER_ETIKETLERI: Record<EzberDurumu | 'baslamadi', string> = {
  baslamadi: 'Başlamadı',
  devam: 'Devam',
  tamam: 'Tamam',
};

export async function ogrenciEzberleriniGetir(ogrenciIdleri: string[]): Promise<OgrenciEzber[]> {
  if (ogrenciIdleri.length === 0) return [];
  const { data, error } = await supabase.from('ogrenci_ezber').select('*').in('ogrenci_id', ogrenciIdleri);
  kontrol(error);
  return data ?? [];
}

// "Başlamadı" satırın olmamasıdır. Bilerek upsert kullanılmadı (kolon bazlı update yetkisi;
// bkz. lib/dersPlani.ts): önce güncelleme denenir, satır yoksa eklenir.
export async function ezberDurumunuAyarla(
  kurumId: string,
  ogrenciId: string,
  maddeId: string,
  durum: EzberDurumu | 'baslamadi',
): Promise<void> {
  const satir = supabase.from('ogrenci_ezber');
  if (durum === 'baslamadi') {
    const { error } = await satir.delete().eq('ogrenci_id', ogrenciId).eq('madde_id', maddeId);
    kontrol(error);
    return;
  }
  const { data, error } = await satir
    .update({ durum, guncelleme_tarihi: bugununTarihi() })
    .eq('ogrenci_id', ogrenciId)
    .eq('madde_id', maddeId)
    .select('madde_id');
  kontrol(error);
  if (data && data.length > 0) return;
  const { error: eklemeHatasi } = await supabase
    .from('ogrenci_ezber')
    .insert({ kurum_id: kurumId, ogrenci_id: ogrenciId, madde_id: maddeId, durum, guncelleme_tarihi: bugununTarihi() });
  kontrol(eklemeHatasi);
}

// '12/52' gibi özetler için.
export function ezberOzeti(maddeSayisi: number, kayitlar: Pick<OgrenciEzber, 'durum'>[]) {
  const tamam = kayitlar.filter((k) => k.durum === 'tamam').length;
  const devam = kayitlar.filter((k) => k.durum === 'devam').length;
  return { tamam, devam, oran: maddeSayisi === 0 ? null : tamam / maddeSayisi };
}
