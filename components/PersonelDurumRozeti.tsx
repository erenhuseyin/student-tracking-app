import type { IkonAdi } from '@/components/Ikon';
import { Rozet } from '@/components/Rozet';
import { PERSONEL_DURUM_ETIKETLERI, personelDurumu, type PersonelDurumu } from '@/lib/personel';
import { type Tema, useTema } from '@/lib/tema';
import type { Kullanici } from '@/lib/tipler';

function gorunumKur(t: Tema): Record<PersonelDurumu, { metin: string; renk: string; zemin: string; ikon: IkonAdi }> {
  return {
    aktif: { metin: PERSONEL_DURUM_ETIKETLERI.aktif, renk: t.renkler.basari, zemin: t.renkler.basariSoluk, ikon: 'checkmark-circle' },
    davet_bekliyor: { metin: PERSONEL_DURUM_ETIKETLERI.davet_bekliyor, renk: t.renkler.uyari, zemin: t.renkler.uyariSoluk, ikon: 'mail-outline' },
    pasif: { metin: PERSONEL_DURUM_ETIKETLERI.pasif, renk: t.renkler.metinIkincil, zemin: t.renkler.ayirici, ikon: 'pause-circle-outline' },
  };
}

export function PersonelDurumRozeti({ personel }: { personel: Kullanici }) {
  const tema = useTema();
  return <Rozet {...gorunumKur(tema)[personelDurumu(personel)]} />;
}
