// Yoklama durumu rozeti. `durum` null ise "İşaretlenmedi" gösterilir. Durum etiketi olduğu için
// her zaman ikon taşır (bkz. components/Rozet.tsx notu) — yalnız renge dayanmaz.
import type { IkonAdi } from '@/components/Ikon';
import { Rozet } from '@/components/Rozet';
import { renkler, yoklamaRenkleri } from '@/lib/tema';
import type { YoklamaDurumu } from '@/lib/tipler';
import { YOKLAMA_ETIKETLERI } from '@/lib/yoklama';

const IKONLAR: Record<YoklamaDurumu, IkonAdi> = {
  geldi: 'checkmark-circle',
  gelmedi: 'close-circle',
  gec: 'time-outline',
};

export function DurumRozeti({ durum }: { durum: YoklamaDurumu | null }) {
  if (!durum) {
    return <Rozet metin="İşaretlenmedi" renk={renkler.metinIkincil} zemin={renkler.ayirici} ikon="ellipse-outline" />;
  }
  return (
    <Rozet
      metin={YOKLAMA_ETIKETLERI[durum]}
      renk={yoklamaRenkleri[durum].renk}
      zemin={yoklamaRenkleri[durum].soluk}
      ikon={IKONLAR[durum]}
    />
  );
}
