// Kullanıcının açık/karanlık tema tercihi. Varsayılan "sistem" (OS'in rengini izler);
// kullanıcı açıkça seçerse cihaz temasından bağımsız olarak sabitlenir ve cihazda kalıcı olur.
// `lib/tema.ts > useTema()` bu tercihi okur (bkz. o dosyadaki dosya başı notu: render-içi tema).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export type TemaTercihi = 'acik' | 'karanlik' | 'sistem';

const DEPOLAMA_ANAHTARI = 'tema-tercihi';

type Baglam = {
  tercih: TemaTercihi;
  tercihiAyarla: (tercih: TemaTercihi) => void;
};

const TemaTercihiBaglami = createContext<Baglam>({ tercih: 'sistem', tercihiAyarla: () => {} });

export function TemaTercihiSaglayici({ children }: { children: ReactNode }) {
  const [tercih, setTercih] = useState<TemaTercihi>('sistem');

  useEffect(() => {
    AsyncStorage.getItem(DEPOLAMA_ANAHTARI)
      .then((deger) => {
        if (deger === 'acik' || deger === 'karanlik' || deger === 'sistem') setTercih(deger);
      })
      .catch(() => {
        // Depolama okunamazsa sessizce "sistem" ile devam edilir.
      });
  }, []);

  const tercihiAyarla = (yeni: TemaTercihi) => {
    setTercih(yeni);
    AsyncStorage.setItem(DEPOLAMA_ANAHTARI, yeni).catch(() => {
      // Kalıcı olmayabilir ama oturum içinde tema yine de değişir.
    });
  };

  return <TemaTercihiBaglami.Provider value={{ tercih, tercihiAyarla }}>{children}</TemaTercihiBaglami.Provider>;
}

export function useTemaTercihi(): Baglam {
  return useContext(TemaTercihiBaglami);
}
