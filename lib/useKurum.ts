// Bir kurum düğümünü ve — `yoluyla` verilirse — oturumdaki kullanıcının kurumundan o düğüme
// kadarki yol adını yükler. Oturumdaki kullanıcının kendi kurumu istenirse ağa çıkmaz.
import { useEffect, useState } from 'react';

import { kurumAdlariniGetir, kurumGetir, kurumYolu } from '@/lib/kurumlar';
import { useOturum } from '@/lib/oturum';
import type { Kurum } from '@/lib/tipler';

type Sonuc = { kurum: Kurum | null; yol: string; hata: string | null };

export function useKurum(id: string | undefined, yoluyla = false): Sonuc {
  const { kurum: kendiKurumu } = useOturum();
  const [yuklenen, setYuklenen] = useState<{ id: string; kurum: Kurum; yol: string } | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const kendiId = kendiKurumu?.id;
  const kendisiMi = id !== undefined && id === kendiId;

  useEffect(() => {
    if (!id || kendisiMi) return;
    let iptalEdildi = false;
    Promise.all([kurumGetir(id), yoluyla ? kurumAdlariniGetir() : null])
      .then(([kurum, adlar]) => {
        if (iptalEdildi) return;
        setHata(null);
        setYuklenen({ id, kurum, yol: adlar ? kurumYolu(adlar, id, kendiId) : '' });
      })
      .catch((e: Error) => {
        if (!iptalEdildi) setHata(e.message);
      });
    return () => {
      iptalEdildi = true;
    };
  }, [id, kendisiMi, kendiId, yoluyla]);

  if (kendisiMi) return { kurum: kendiKurumu, yol: '', hata: null };
  return yuklenen && yuklenen.id === id ? { kurum: yuklenen.kurum, yol: yuklenen.yol, hata } : { kurum: null, yol: '', hata };
}
