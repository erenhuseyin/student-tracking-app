// Cinsiyet etiketleri ve seçim/süzgeç seçenekleri (hoca ve öğrenci; alan isteğe bağlıdır).
import type { Cinsiyet } from '@/lib/tipler';

export const CINSIYET_ETIKETLERI: Record<Cinsiyet, string> = {
  kadin: 'Kadın',
  erkek: 'Erkek',
};

// Form seçimi: '' = belirtilmemiş.
export const CINSIYET_SECENEKLERI: { deger: '' | Cinsiyet; etiket: string }[] = [
  { deger: '', etiket: 'Belirtilmemiş' },
  { deger: 'kadin', etiket: 'Kadın' },
  { deger: 'erkek', etiket: 'Erkek' },
];

// Tablo süzgeci: '' = tümü.
export const CINSIYET_SUZGECI: { deger: '' | Cinsiyet; etiket: string }[] = [
  { deger: '', etiket: 'Tümü' },
  { deger: 'kadin', etiket: 'Kadın' },
  { deger: 'erkek', etiket: 'Erkek' },
];

export function cinsiyetEtiketi(c: Cinsiyet | null | undefined): string {
  return c ? CINSIYET_ETIKETLERI[c] : '—';
}

export function cinsiyetGirdisi(deger: string): Cinsiyet | null {
  return deger === 'kadin' || deger === 'erkek' ? deger : null;
}
