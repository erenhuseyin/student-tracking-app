import type { IkonAdi } from '@/components/Ikon';
import { Rozet } from '@/components/Rozet';
import { personelDurumu, type PersonelDurumu } from '@/lib/personel';
import { renkler } from '@/lib/tema';
import type { Kullanici } from '@/lib/tipler';

const GORUNUM: Record<PersonelDurumu, { metin: string; renk: string; zemin: string; ikon: IkonAdi }> = {
  aktif: { metin: 'Aktif', renk: renkler.basari, zemin: renkler.basariSoluk, ikon: 'checkmark-circle' },
  davet_bekliyor: { metin: 'Davet bekliyor', renk: renkler.uyari, zemin: renkler.uyariSoluk, ikon: 'mail-outline' },
  pasif: { metin: 'Pasif', renk: renkler.metinIkincil, zemin: renkler.ayirici, ikon: 'pause-circle-outline' },
};

export function PersonelDurumRozeti({ personel }: { personel: Kullanici }) {
  return <Rozet {...GORUNUM[personelDurumu(personel)]} />;
}
