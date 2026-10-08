// Giriş ekranlarındaki "başvuru" bağlantısının gösterilip gösterilmeyeceği: müşteri başvuru
// kabul ediyorsa true. Sunucuya ulaşılamazsa bağlantı gösterilmez.
import { useEffect, useState } from 'react';

import { basvuruDurumunuGetir } from '@/lib/basvurular';

export function useBasvuruAcik(): boolean {
  const [acik, setAcik] = useState(false);
  useEffect(() => {
    let iptalEdildi = false;
    basvuruDurumunuGetir().then((b) => {
      if (!iptalEdildi) setAcik(b.acik);
    });
    return () => {
      iptalEdildi = true;
    };
  }, []);
  return acik;
}
