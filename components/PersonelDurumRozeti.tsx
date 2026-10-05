import { Rozet } from '@/components/Rozet';
import { personelDurumu, type PersonelDurumu } from '@/lib/personel';
import { renkler } from '@/lib/tema';
import type { Kullanici } from '@/lib/tipler';

const GORUNUM: Record<PersonelDurumu, { metin: string; renk: string; zemin: string }> = {
  aktif: { metin: 'Aktif', renk: renkler.basari, zemin: renkler.basariSoluk },
  davet_bekliyor: { metin: 'Davet bekliyor', renk: renkler.uyari, zemin: renkler.uyariSoluk },
  pasif: { metin: 'Pasif', renk: renkler.metinIkincil, zemin: renkler.ayirici },
};

export function PersonelDurumRozeti({ personel }: { personel: Kullanici }) {
  return <Rozet {...GORUNUM[personelDurumu(personel)]} />;
}
