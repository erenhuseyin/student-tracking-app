// Velinin devamsızlık bildirimi: "çocuğum şu gün gelmeyecek". Veli kendi çocuğu için yazar ve
// geri alabilir; öğretmen o günün yoklamasını alırken görür (RLS: devamsizlik_bildirimi_*).
// Yoklamanın kendisini değiştirmez — yoklamayı yine öğretmen işaretler.
import { supabase } from '@/lib/supabase';
import { bugununTarihi, gunEkle, tarihGecerliMi } from '@/lib/tarih';
import type { DevamsizlikBildirimi } from '@/lib/tipler';

const NEDEN_AZAMI_UZUNLUK = 300;
const EN_UZAK_GUN = 60;

function hataMesajinaCevir(mesaj: string, kod?: string): string {
  if (kod === '23505') return 'Bu gün için zaten bir bildirim var.';
  if (/permission denied|rls|row-level security/i.test(mesaj)) return 'Bu işlem için yetkiniz yok.';
  if (/network|fetch/i.test(mesaj)) return 'Bağlantı sorunu, lütfen tekrar deneyin.';
  return 'İşlem yapılamadı, lütfen tekrar deneyin.';
}

// Öğrencinin bugünden sonraki (bugün dahil) bildirimleri, yakın tarih üstte.
export async function devamsizlikBildirimleriniGetir(ogrenciId: string): Promise<DevamsizlikBildirimi[]> {
  const { data, error } = await supabase
    .from('devamsizlik_bildirimi')
    .select('*')
    .eq('ogrenci_id', ogrenciId)
    .gte('tarih', bugununTarihi())
    .order('tarih');
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
  return data;
}

// kurumId: öğrencinin kurumu.
export async function devamsizlikBildir(
  kurumId: string,
  ogrenciId: string,
  girenKullaniciId: string,
  tarih: string,
  neden: string,
): Promise<void> {
  const temizNeden = neden.trim();
  const bugun = bugununTarihi();
  if (!tarihGecerliMi(tarih)) throw new Error('Tarihi gün, ay ve yıl olarak girin (örn. 20 / 09 / 2026).');
  if (tarih < bugun) throw new Error('Geçmiş bir gün için bildirim yapılamaz.');
  if (tarih > gunEkle(bugun, EN_UZAK_GUN)) throw new Error(`En fazla ${EN_UZAK_GUN} gün sonrası için bildirim yapılabilir.`);
  if (!temizNeden) throw new Error('Kısaca nedenini yazın (örn. hasta).');
  if (temizNeden.length > NEDEN_AZAMI_UZUNLUK) throw new Error(`Neden en fazla ${NEDEN_AZAMI_UZUNLUK} karakter olabilir.`);

  const { error } = await supabase
    .from('devamsizlik_bildirimi')
    .insert({ kurum_id: kurumId, ogrenci_id: ogrenciId, giren_kullanici_id: girenKullaniciId, tarih, neden: temizNeden });
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
}

export async function devamsizlikBildiriminiGeriAl(id: string): Promise<void> {
  const { error } = await supabase.from('devamsizlik_bildirimi').delete().eq('id', id);
  if (error) throw new Error(hataMesajinaCevir(error.message));
}

// Öğretmenin yoklama ekranı için: verilen günde, verilen öğrenciler için velilerin bildirdiği
// nedenler (öğrenci id -> neden). Okunamazsa boş döner — yoklama almayı engellemez.
export async function gununDevamsizlikNedenleri(tarih: string, ogrenciIdleri: string[]): Promise<Map<string, string>> {
  if (ogrenciIdleri.length === 0) return new Map();
  const { data, error } = await supabase
    .from('devamsizlik_bildirimi')
    .select('ogrenci_id, neden')
    .eq('tarih', tarih)
    .in('ogrenci_id', ogrenciIdleri);
  if (error) return new Map();
  return new Map(data.map((b) => [b.ogrenci_id, b.neden]));
}
