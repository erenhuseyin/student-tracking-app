// Türkiye il haritası — telefonda çizilmez. Harita SVG ile yalnızca web'de çizilir
// (TurkiyeHaritasi.web.tsx): native tarafta SVG için yeni bir bağımlılık ve yeni build gerekir,
// pano ise bilgisayardan kullanılır. Telefonda aynı veriler panodaki il sıralaması tablosundadır.
import type { HaritaOlcusu } from '@/lib/haritaRenkleri';
import type { PanoIli } from '@/lib/pano';

export type TurkiyeHaritasiProps = {
  iller: PanoIli[];
  olcu: HaritaOlcusu;
  seciliIl: number | null;
  onIlSec: (il: PanoIli) => void;
};

export function TurkiyeHaritasi(_: TurkiyeHaritasiProps) {
  return null;
}
