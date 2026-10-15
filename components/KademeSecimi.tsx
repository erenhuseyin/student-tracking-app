// Sınıfın izlediği kademe (müfredat) için çip seçimi. Yalnızca içerik takibi açık ve müşteride
// en az bir kademe tanımlıysa görünür; aksi halde hiçbir şey çizmez. Yeni sınıf ve sınıf
// düzenleme formlarında (yönetici ve öğretmen) kullanılır.
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { ICERIK_OZELLIGI, kademeleriGetir } from '@/lib/icerik';
import { useOzellik } from '@/lib/ozellikler';
import { useTema } from '@/lib/tema';
import type { Kademe } from '@/lib/tipler';

type Props = {
  secili: string | null;
  onSec: (kademeId: string | null) => void;
  pasif?: boolean;
};

export function KademeSecimi({ secili, onSec, pasif }: Props) {
  const tema = useTema();
  const icerikAcik = useOzellik(ICERIK_OZELLIGI);
  const [kademeler, setKademeler] = useState<Kademe[]>([]);

  useEffect(() => {
    if (!icerikAcik) return;
    kademeleriGetir()
      .then(setKademeler)
      .catch(() => {});
  }, [icerikAcik]);

  if (!icerikAcik || kademeler.length === 0) return null;

  return (
    <View style={{ gap: tema.bosluk.xs }}>
      <Text style={tema.yazi.etiket}>Kademe (sınıfın izlediği müfredat)</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tema.bosluk.s }}>
        <Chip etiket="Yok" secili={secili === null} onPress={() => onSec(null)} pasif={pasif} rol="radio" />
        {kademeler.map((k) => (
          <Chip key={k.id} etiket={k.ad} secili={secili === k.id} onPress={() => onSec(k.id)} pasif={pasif} rol="radio" />
        ))}
      </View>
    </View>
  );
}
