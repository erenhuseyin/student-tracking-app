// Başvuruyla kayıt: veli çocuğu için ön kayıt, öğretmen adayı kuruma katılma başvurusu yapar;
// kurum yöneticisi onaylar ya da reddeder. Başvuru gönderme ve karar sunucudadır
// (supabase/functions/basvuru); yönetici başvuruları doğrudan tablodan okur (RLS: yönettiği
// kurumlar). Özellik müşteri bazında açılır (kurum.ozellikler.basvuru; yalnızca süper admin).
import { edgeFonksiyonuCagir } from '@/lib/edge';
import { marka } from '@/lib/marka';
import { supabase } from '@/lib/supabase';
import type { Basvuru, BasvuruDurumu, BasvuruTuru } from '@/lib/tipler';

const FONKSIYON = 'basvuru';

export const BASVURU_TURU_ETIKETLERI: Record<BasvuruTuru, string> = {
  ogrenci: 'Öğrenci ön kaydı',
  personel: 'Personel başvurusu',
};

export const BASVURU_DURUMU_ETIKETLERI: Record<BasvuruDurumu, string> = {
  bekliyor: 'Bekliyor',
  onaylandi: 'Onaylandı',
  reddedildi: 'Reddedildi',
};

function hataMesajinaCevir(mesaj: string, kod?: string): string {
  if (kod === 'PGRST116') return 'Başvuru bulunamadı ya da bu işlem için yetkiniz yok.';
  if (/permission denied|rls|row-level security/i.test(mesaj)) return 'Bu işlem için yetkiniz yok.';
  if (/network|fetch/i.test(mesaj)) return 'Bağlantı sorunu, lütfen tekrar deneyin.';
  return 'İşlem yapılamadı, lütfen tekrar deneyin.';
}

export type BasvuruDurumBilgisi = { acik: boolean; kurumlar: { id: string; ad: string }[] };

// Erişim: oturumsuz. Bu uygulamanın müşterisi başvuru kabul ediyor mu ve hangi kurumlara
// (ana kurum + şubeler) başvurulabilir. Ulaşılamazsa kapalı sayılır.
export async function basvuruDurumunuGetir(): Promise<BasvuruDurumBilgisi> {
  try {
    return await edgeFonksiyonuCagir<BasvuruDurumBilgisi>(FONKSIYON, { islem: 'durum', marka_kodu: marka.kod }, '');
  } catch {
    return { acik: false, kurumlar: [] };
  }
}

type OrtakGirdi = { kurumId: string | null; adSoyad: string; notMetni: string; riza: boolean };
export type OgrenciBasvuruGirdisi = OrtakGirdi & { dogumTarihi: string; veliAdSoyad: string; veliTelefon: string };
export type PersonelBasvuruGirdisi = OrtakGirdi & { eposta: string };

function ortakAlanlar(girdi: OrtakGirdi) {
  if (!girdi.kurumId) throw new Error('Başvurulacak kurumu seçin.');
  if (!girdi.adSoyad.trim()) throw new Error('Ad soyad gerekli.');
  if (!girdi.riza) throw new Error('Başvuru için bilgilerinizin kuruma iletilmesini onaylamanız gerekir.');
  return {
    islem: 'gonder',
    marka_kodu: marka.kod,
    kurum_id: girdi.kurumId,
    ad_soyad: girdi.adSoyad.trim(),
    not_metni: girdi.notMetni.trim(),
    riza: true,
  };
}

// Erişim: oturumsuz. Ayrıntılı doğrulama sunucudadır; sunucunun Türkçe mesajı aynen gösterilir.
export async function ogrenciBasvurusuGonder(girdi: OgrenciBasvuruGirdisi): Promise<void> {
  await edgeFonksiyonuCagir(
    FONKSIYON,
    {
      ...ortakAlanlar(girdi),
      tur: 'ogrenci',
      dogum_tarihi: girdi.dogumTarihi,
      veli_ad_soyad: girdi.veliAdSoyad.trim(),
      veli_telefon: girdi.veliTelefon.trim(),
    },
    'Başvuru gönderilemedi, lütfen tekrar deneyin.',
  );
}

export async function personelBasvurusuGonder(girdi: PersonelBasvuruGirdisi): Promise<void> {
  await edgeFonksiyonuCagir(
    FONKSIYON,
    { ...ortakAlanlar(girdi), tur: 'personel', eposta: girdi.eposta.trim().toLowerCase() },
    'Başvuru gönderilemedi, lütfen tekrar deneyin.',
  );
}

// --- Yönetici tarafı (kurum admini; RLS: yönettiği kurumlar) ---

// Bekleyenler önce, sonra en yeni üstte.
export async function basvurulariGetir(): Promise<Basvuru[]> {
  const { data, error } = await supabase.from('basvuru').select('*').order('olusturma_tarihi', { ascending: false }).limit(200);
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
  return [...data.filter((b) => b.durum === 'bekliyor'), ...data.filter((b) => b.durum !== 'bekliyor')];
}

export async function basvuruGetir(id: string): Promise<Basvuru> {
  const { data, error } = await supabase.from('basvuru').select('*').eq('id', id).single();
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
  return data;
}

// Onay: öğrenci başvurusunda `sinifId` zorunludur; öğrenci + veli hesabı (PIN 1234) ya da
// öğretmen hesabı (giriş kodu e-postası) sunucuda mevcut akışlarla açılır.
export async function basvuruyuOnayla(id: string, sinifId?: string): Promise<{ eposta_gonderildi?: boolean; kullanici_adi?: string | null }> {
  return edgeFonksiyonuCagir(FONKSIYON, { islem: 'karar', basvuru_id: id, karar: 'onayla', sinif_id: sinifId }, 'Başvuru onaylanamadı.');
}

export async function basvuruyuReddet(id: string, kararNotu: string): Promise<void> {
  await edgeFonksiyonuCagir(
    FONKSIYON,
    { islem: 'karar', basvuru_id: id, karar: 'reddet', karar_notu: kararNotu.trim() },
    'Başvuru reddedilemedi.',
  );
}

// Yalnızca sonuçlanmış başvuru silinebilir (RLS).
export async function basvuruSil(id: string): Promise<void> {
  const { error } = await supabase.from('basvuru').delete().eq('id', id);
  if (error) throw new Error(hataMesajinaCevir(error.message));
}
