// Yöneticinin "Kullanıcılar" tablosu: kapsamındaki yöneticiler, öğretmenler ve veliler tek listede.
// Erişim: kurum_admin (RLS: yönettiği kurumlar — kendi birimi ve altındaki tüm birimler).
// Sunucuda süzülür, sıralanır ve sayfalanır. Personel işlemleri lib/personel.ts'tedir.
import { supabase } from '@/lib/supabase';
import type { Cinsiyet, Kullanici, Ogrenci, Rol } from '@/lib/tipler';

// Satırın durumu lib/personel.ts > personelDurumu ile hesaplanır (aynı üç değer).
export type KullaniciDurumu = 'aktif' | 'davet_bekliyor' | 'pasif';
export type ListelenenRol = Exclude<Rol, 'super_admin'>;

export const KULLANICI_DURUMU_ETIKETLERI: Record<KullaniciDurumu, string> = {
  aktif: 'Aktif',
  davet_bekliyor: 'Davet bekliyor',
  pasif: 'Pasif',
};

export type KullaniciAramasi = {
  arama: string;
  rol: ListelenenRol | null;
  gorevId: string | null;
  // Seçilen birim ve altındaki tüm birimler.
  birimId: string | null;
  durum: KullaniciDurumu | null;
  cinsiyet?: Cinsiyet | null;
};

export type KullaniciSiralamasi = { anahtar: 'ad_soyad' | 'eposta' | 'rol'; yon: 'artan' | 'azalan' };
export const KULLANICI_SAYFA_BOYUTU = 30;

function hataMesajinaCevir(mesaj: string): string {
  if (/permission denied|rls/i.test(mesaj)) return 'Bu işlem için yetkiniz yok.';
  if (/network|fetch/i.test(mesaj)) return 'Bağlantı sorunu, lütfen tekrar deneyin.';
  return 'Kullanıcılar alınamadı, lütfen tekrar deneyin.';
}

export async function kullanicilariAra(
  arama: KullaniciAramasi,
  siralama: KullaniciSiralamasi,
  sayfa: number,
): Promise<{ kullanicilar: Kullanici[]; toplam: number }> {
  const { data, error, count } = await kullaniciSorgusu(arama, siralama, { count: 'exact' }).range(
    sayfa * KULLANICI_SAYFA_BOYUTU,
    (sayfa + 1) * KULLANICI_SAYFA_BOYUTU - 1,
  );
  if (error) throw new Error(hataMesajinaCevir(error.message));
  return { kullanicilar: data as unknown as Kullanici[], toplam: count ?? data.length };
}

// Süzülmüş ve sıralanmış sorgu (sayfa aralığı verilmeden); liste sayfalar, dışa aktarma
// (lib/disaAktar.ts) tüm sayfaları dolaşır.
export function kullaniciSorgusu(
  { arama, rol, gorevId, birimId, durum, cinsiyet }: KullaniciAramasi,
  siralama: KullaniciSiralamasi,
  secenek?: { count: 'exact' },
) {
  // Birim süzgeci kurumun `yol`'u üzerinden yapılır (tek kimlikle tüm alt ağaç); bunun için
  // kurum satırı iç birleştirmeyle seçilir.
  let sorgu = supabase
    .from('kullanici')
    .select('*, kurum!kullanici_kurum_id_fkey!inner(yol)', secenek)
    .in('rol', rol ? [rol] : ['kurum_admin', 'ogretmen', 'veli']);
  if (birimId) sorgu = sorgu.contains('kurum.yol', [birimId]);
  if (gorevId) sorgu = sorgu.eq('gorev_id', gorevId);
  if (durum === 'pasif') sorgu = sorgu.eq('aktif', false);
  if (durum === 'aktif') sorgu = sorgu.eq('aktif', true).or('sifre_belirlendi.eq.true,rol.eq.veli');
  if (cinsiyet) sorgu = sorgu.eq('cinsiyet', cinsiyet);
  if (durum === 'davet_bekliyor') sorgu = sorgu.eq('aktif', true).eq('sifre_belirlendi', false).neq('rol', 'veli');
  // % ve _ ilike joker karakterleridir; virgül ve parantez `or` süzgecinin sözdizimini bozar.
  const temiz = arama
    .trim()
    .replace(/[,()"]/g, ' ')
    .replace(/[%_\\]/g, (k) => `\\${k}`);
  if (temiz) sorgu = sorgu.or(`ad_soyad.ilike.%${temiz}%,eposta.ilike.%${temiz}%,kullanici_adi.ilike.%${temiz}%`);
  return sorgu.order(siralama.anahtar, { ascending: siralama.yon === 'artan', nullsFirst: false }).order('id');
}

export async function kullaniciGetir(id: string): Promise<Kullanici> {
  const { data, error } = await supabase.from('kullanici').select('*').eq('id', id).single();
  if (error) throw new Error(hataMesajinaCevir(error.message));
  return data;
}

// Velinin bağlı olduğu çocuklar (veli-öğrenci ilişkisi çoka çoktur).
export async function veliCocuklariniGetir(veliId: string): Promise<Ogrenci[]> {
  const { data: baglar, error: bagHatasi } = await supabase.from('veli_ogrenci').select('ogrenci_id').eq('veli_id', veliId);
  if (bagHatasi) throw new Error(hataMesajinaCevir(bagHatasi.message));
  if (baglar.length === 0) return [];
  const { data, error } = await supabase
    .from('ogrenci')
    .select('*')
    .in(
      'id',
      baglar.map((b) => b.ogrenci_id),
    )
    .order('ad_soyad');
  if (error) throw new Error(hataMesajinaCevir(error.message));
  return data;
}
