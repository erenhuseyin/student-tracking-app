// Yoklama durumu rozeti. `durum` null ise "İşaretlenmedi" gösterilir.
import { Rozet } from '@/components/Rozet';
import { renkler, yoklamaRenkleri } from '@/lib/tema';
import type { YoklamaDurumu } from '@/lib/tipler';
import { YOKLAMA_ETIKETLERI } from '@/lib/yoklama';

export function DurumRozeti({ durum }: { durum: YoklamaDurumu | null }) {
  if (!durum) return <Rozet metin="İşaretlenmedi" renk={renkler.metinIkincil} zemin={renkler.ayirici} />;
  return <Rozet metin={YOKLAMA_ETIKETLERI[durum]} renk={yoklamaRenkleri[durum].renk} zemin={yoklamaRenkleri[durum].soluk} />;
}
