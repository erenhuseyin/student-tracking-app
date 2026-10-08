// Personel (öğretmen, kurum yöneticisi) yönetimi.
// Erişim: süper admin (yalnızca kurum yöneticisi davet eder) ve kurum admini (yönettiği
// kurumlar: kendi kurumu + şubeleri). Hesap açma, kod gönderme ve pasifleştirme sunucudadır
// (supabase/functions/personel-yonet); listeleme, ad ve görev değiştirme, sınıf ataması doğrudan
// tablolar üzerinde yapılır, yetkiyi RLS (kullanici_kurum_admin_*, ogretmen_sinif_kurum_admin) verir.
import { edgeFonksiyonuCagir } from '@/lib/edge';
import { supabase } from '@/lib/supabase';
import type { Kullanici } from '@/lib/tipler';

export type PersonelRolu = 'ogretmen' | 'kurum_admin';

export const PERSONEL_ROL_ETIKETLERI: Record<PersonelRolu, string> = {
  ogretmen: 'Öğretmen',
  kurum_admin: 'Yönetici',
};

export type PersonelDurumu = 'aktif' | 'davet_bekliyor' | 'pasif';

export function personelDurumu(k: Kullanici): PersonelDurumu {
  if (!k.aktif) return 'pasif';
  return k.sifre_belirlendi ? 'aktif' : 'davet_bekliyor';
}

const FONKSIYON = 'personel-yonet';
const EPOSTA_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const EN_AZ_SIFRE_UZUNLUGU = 8;

function hataMesajinaCevir(mesaj: string): string {
  if (/permission denied|rls/i.test(mesaj)) return 'Bu işlem için yetkiniz yok.';
  if (/network|fetch/i.test(mesaj)) return 'Bağlantı sorunu, lütfen tekrar deneyin.';
  return 'İşlem yapılamadı, lütfen tekrar deneyin.';
}

// Bir kurumun personeli: önce yöneticiler, sonra öğretmenler, ada göre.
export async function personelleriGetir(kurumId: string): Promise<Kullanici[]> {
  const { data, error } = await supabase
    .from('kullanici')
    .select('*')
    .eq('kurum_id', kurumId)
    .in('rol', ['kurum_admin', 'ogretmen'])
    .order('rol')
    .order('ad_soyad');
  if (error) throw new Error(hataMesajinaCevir(error.message));
  return data;
}

export async function personelGetir(id: string): Promise<Kullanici> {
  const { data, error } = await supabase.from('kullanici').select('*').eq('id', id).single();
  if (error) throw new Error(hataMesajinaCevir(error.message));
  return data;
}

export async function personelAdGuncelle(id: string, adSoyad: string): Promise<void> {
  const temizAd = adSoyad.trim();
  if (!temizAd) throw new Error('Ad soyad gerekli.');
  const { error } = await supabase.from('kullanici').update({ ad_soyad: temizAd }).eq('id', id);
  if (error) throw new Error(hataMesajinaCevir(error.message));
}

// Görev (rol) değişikliği. Kuralları veritabanı zorlar: kimse kendi rolünü değiştiremez, sınıf
// ataması olan öğretmenin rolü değişmez (önce atamalar kaldırılır), kurum admini süper admin yapamaz.
export async function personelRolDegistir(id: string, rol: PersonelRolu): Promise<void> {
  const { error } = await supabase.from('kullanici').update({ rol }).eq('id', id);
  if (!error) return;
  if (/bağı olan/i.test(error.message)) throw new Error('Önce bu öğretmenin sınıf atamalarını kaldırın.');
  if (/kendi rolünü/i.test(error.message)) throw new Error('Kendi görevinizi değiştiremezsiniz.');
  throw new Error(hataMesajinaCevir(error.message));
}

export type DavetSonucu = { kullanici_id: string; eposta_gonderildi: boolean };

// kurumId verilmezse sunucu çağıranın kendi kurumunu kullanır; süper admin için zorunludur.
export async function personelDavetEt(istek: {
  kurumId?: string;
  adSoyad: string;
  eposta: string;
  rol: PersonelRolu;
  sinifIdleri?: string[];
}): Promise<DavetSonucu> {
  const adSoyad = istek.adSoyad.trim();
  const eposta = istek.eposta.trim().toLowerCase();
  if (!adSoyad) throw new Error('Ad soyad gerekli.');
  if (!EPOSTA_RE.test(eposta)) throw new Error('Geçerli bir e-posta adresi girin.');
  return edgeFonksiyonuCagir<DavetSonucu>(
    FONKSIYON,
    {
      islem: 'davet_et',
      kurum_id: istek.kurumId,
      ad_soyad: adSoyad,
      eposta,
      rol: istek.rol,
      sinif_idleri: istek.rol === 'ogretmen' ? (istek.sinifIdleri ?? []) : [],
    },
    'Personel eklenemedi.',
  );
}

// Yönetici, personeline yeni giriş kodu gönderir (davet e-postası ulaşmadıysa ya da şifre unutulduysa).
export async function personelKodGonder(kullaniciId: string): Promise<void> {
  await edgeFonksiyonuCagir(FONKSIYON, { islem: 'kod_gonder', kullanici_id: kullaniciId }, 'Kod gönderilemedi.');
}

export async function personelAktifligiDegistir(kullaniciId: string, aktif: boolean): Promise<void> {
  await edgeFonksiyonuCagir(
    FONKSIYON,
    { islem: aktif ? 'aktiflestir' : 'pasiflestir', kullanici_id: kullaniciId },
    'İşlem yapılamadı.',
  );
}

// Yalnızca daveti henüz kabul etmemiş hesapta (sunucu denetler): yanlış yazılmış adresi düzeltir
// ve yeni adrese giriş kodu gönderir.
export async function personelEpostaDegistir(
  kullaniciId: string,
  eposta: string,
): Promise<{ eposta_gonderildi: boolean }> {
  const temiz = eposta.trim().toLowerCase();
  if (!EPOSTA_RE.test(temiz)) throw new Error('Geçerli bir e-posta adresi girin.');
  return edgeFonksiyonuCagir(
    FONKSIYON,
    { islem: 'eposta_degistir', kullanici_id: kullaniciId, eposta: temiz },
    'E-posta değiştirilemedi.',
  );
}

// Yalnızca daveti henüz kabul etmemiş hesapta (sunucu denetler): hesabı tümüyle siler.
export async function personelDavetIptal(kullaniciId: string): Promise<void> {
  await edgeFonksiyonuCagir(FONKSIYON, { islem: 'davet_iptal', kullanici_id: kullaniciId }, 'Davet iptal edilemedi.');
}

// Erişim: oturumsuz ("şifremi unuttum"). Sunucu, e-posta kayıtlı olsun olmasın aynı cevabı verir.
export async function kodIste(eposta: string): Promise<void> {
  const temiz = eposta.trim().toLowerCase();
  if (!EPOSTA_RE.test(temiz)) throw new Error('Geçerli bir e-posta adresi girin.');
  await edgeFonksiyonuCagir(FONKSIYON, { islem: 'kod_gonder', eposta: temiz }, 'Kod gönderilemedi.');
}

// Erişim: oturumsuz. Davet kabulü ve şifre yenileme aynı işlemdir.
export async function kodIleSifreBelirle(eposta: string, kod: string, sifre: string): Promise<void> {
  const temiz = eposta.trim().toLowerCase();
  if (!EPOSTA_RE.test(temiz)) throw new Error('Geçerli bir e-posta adresi girin.');
  if (!/^[0-9]{6,8}$/.test(kod.trim())) throw new Error('Kodu e-postadaki gibi girin.');
  if (sifre.length < EN_AZ_SIFRE_UZUNLUGU) throw new Error(`Şifre en az ${EN_AZ_SIFRE_UZUNLUGU} karakter olmalı.`);
  await edgeFonksiyonuCagir(
    FONKSIYON,
    { islem: 'kod_ile_sifre_belirle', eposta: temiz, kod: kod.trim(), sifre },
    'Şifre belirlenemedi.',
  );
}

// --- Öğretmen-sınıf ataması (doğrudan tablo; RLS: ogretmen_sinif_kurum_admin) ---

export async function ogretmenSinifIdleriniGetir(ogretmenId: string): Promise<string[]> {
  const { data, error } = await supabase.from('ogretmen_sinif').select('sinif_id').eq('ogretmen_id', ogretmenId);
  if (error) throw new Error(hataMesajinaCevir(error.message));
  return data.map((s) => s.sinif_id);
}

// kurumId: öğretmenin ve sınıfın ortak kurumu (bileşik FK ikisinin aynı kurumda olmasını ister).
export async function ogretmenSinifAta(kurumId: string, ogretmenId: string, sinifId: string): Promise<void> {
  const { error } = await supabase
    .from('ogretmen_sinif')
    .upsert({ kurum_id: kurumId, ogretmen_id: ogretmenId, sinif_id: sinifId }, { onConflict: 'ogretmen_id,sinif_id' });
  if (error) throw new Error(hataMesajinaCevir(error.message));
}

export async function ogretmenSinifKaldir(ogretmenId: string, sinifId: string): Promise<void> {
  const { error } = await supabase
    .from('ogretmen_sinif')
    .delete()
    .eq('ogretmen_id', ogretmenId)
    .eq('sinif_id', sinifId);
  if (error) throw new Error(hataMesajinaCevir(error.message));
}
