import type { IkonAdi } from '@/components/Ikon';
import { Rozet } from '@/components/Rozet';
import { personelDurumu, type PersonelDurumu } from '@/lib/personel';
import { type Tema, useTema } from '@/lib/tema';
import type { Kullanici } from '@/lib/tipler';

function gorunumKur(t: Tema): Record<PersonelDurumu, { metin: string; renk: string; zemin: string; ikon: IkonAdi }> {
  return {
    aktif: { metin: 'Aktif', renk: t.renkler.basari, zemin: t.renkler.basariSoluk, ikon: 'checkmark-circle' },
    davet_bekliyor: { metin: 'Davet bekliyor', renk: t.renkler.uyari, zemin: t.renkler.uyariSoluk, ikon: 'mail-outline' },
    pasif: { metin: 'Pasif', renk: t.renkler.metinIkincil, zemin: t.renkler.ayirici, ikon: 'pause-circle-outline' },
  };
}

export function PersonelDurumRozeti({ personel }: { personel: Kullanici }) {
  const tema = useTema();
  return <Rozet {...gorunumKur(tema)[personelDurumu(personel)]} />;
}
