// Arayüzdeki tek "rol" kavramı (2026-10-15). Kullanıcı iki tür rol görür:
//   Sistem rolü   — Yönetici, Öğretmen, Veli: sabit, silinemez; veriye erişimi bunlar belirler (RLS).
//   Tanımlı rol   — müşterinin tanımladığı (ör. İstişare üyesi): bir sistem rolüne dayanır, kişinin
//                   unvanını ve hangi menüleri gördüğünü belirler. Veride `gorev` tablosudur.
// Kişiye rol vermek = `kullanici.rol` (dayandığı sistem rolü) + `kullanici.gorev_id` (tanımlı rolse).
// Erişim: kişiye rolü kurum admini kapsamındaki kişiye verir; kimse kendi rolünü değiştiremez
// (trigger), sınıf ataması olan öğretmenin sistem rolü değişmez.
import type { PersonelRolu } from '@/lib/personel';
import { PERSONEL_ROL_ETIKETLERI } from '@/lib/personel';
import { supabase } from '@/lib/supabase';
import type { Gorev, Kullanici } from '@/lib/tipler';

export type RolSecenegi = {
  // Sistem rolünde rol değeri ('kurum_admin', 'ogretmen'), tanımlı rolde görevin kimliği.
  anahtar: string;
  ad: string;
  temelRol: PersonelRolu;
  gorevId: string | null;
  tur: 'sistem' | 'tanimli';
};

// Personele verilebilecek roller: önce iki sistem rolü, sonra tanımlılar (ada göre).
// `temelRoller` verilirse yalnızca o sistem rollerine dayananlar listelenir.
export function rolSecenekleri(gorevler: Gorev[], temelRoller: PersonelRolu[] = ['kurum_admin', 'ogretmen']): RolSecenegi[] {
  const sistem = temelRoller.map<RolSecenegi>((r) => ({
    anahtar: r,
    ad: PERSONEL_ROL_ETIKETLERI[r],
    temelRol: r,
    gorevId: null,
    tur: 'sistem',
  }));
  const tanimli = gorevler
    .filter((g) => temelRoller.includes(g.temel_rol as PersonelRolu))
    .map<RolSecenegi>((g) => ({
      anahtar: g.id,
      ad: g.ad,
      temelRol: g.temel_rol as PersonelRolu,
      gorevId: g.id,
      tur: 'tanimli',
    }));
  return [...sistem, ...tanimli];
}

// Açılır listede tanımlı rolün hangi sistem rolüne dayandığı da yazılır ("İstişare üyesi · Yönetici").
export function rolSecenegiEtiketi(s: RolSecenegi): string {
  return s.tur === 'sistem' ? s.ad : `${s.ad} · ${PERSONEL_ROL_ETIKETLERI[s.temelRol]}`;
}

// Kişinin şu anki rolünün seçenek anahtarı.
export function kisininRolAnahtari(k: Pick<Kullanici, 'rol' | 'gorev_id'>): string {
  return k.gorev_id ?? k.rol;
}

function hataMesajinaCevir(mesaj: string, kod?: string): string {
  if (/bağı olan/i.test(mesaj)) return 'Önce bu öğretmenin sınıf atamalarını kaldırın.';
  if (/kendi rolünü|kendi görevini/i.test(mesaj)) return 'Kendi rolünüzü değiştiremezsiniz.';
  if (kod === '23514') return 'Bu rol kişinin birimine uygun değil.';
  if (/permission denied|rls|row-level security/i.test(mesaj)) return 'Bu işlem için yetkiniz yok.';
  if (/network|fetch/i.test(mesaj)) return 'Bağlantı sorunu, lütfen tekrar deneyin.';
  return 'İşlem yapılamadı, lütfen tekrar deneyin.';
}

// Sistem rolü ve tanımlı rol tek güncellemede yazılır; ikisinin uyumunu trigger doğrular
// (gizli.kullanici_gorev_dogrula).
export async function kisiyeRolVer(kullaniciId: string, secenek: Pick<RolSecenegi, 'temelRol' | 'gorevId'>): Promise<void> {
  const { data, error } = await supabase
    .from('kullanici')
    .update({ rol: secenek.temelRol, gorev_id: secenek.gorevId })
    .eq('id', kullaniciId)
    .select('id');
  if (error) throw new Error(hataMesajinaCevir(error.message, error.code));
  if (data.length === 0) throw new Error('Bu işlem için yetkiniz yok.');
}
