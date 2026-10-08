// Kısa süreli başarı bildirimi. Kaydetme/silme gibi işlemlerden sonra ekran sessizce kapanmasın
// diye: `const toast = useToast(); … toast('Kaydedildi');`. Hatalar toast ile gösterilmez —
// onlar formun içinde, kullanıcı düzeltene kadar görünür kalır (components/HataMesaji).
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { Toast } from '@/components/Toast';

const GORUNME_SURESI_MS = 2600;

const Baglam = createContext<(metin: string) => void>(() => {});

export function ToastSaglayici({ children }: { children: ReactNode }) {
  const [metin, setMetin] = useState<string | null>(null);
  const zamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goster = useCallback((yeniMetin: string) => {
    if (zamanlayici.current) clearTimeout(zamanlayici.current);
    setMetin(yeniMetin);
    zamanlayici.current = setTimeout(() => setMetin(null), GORUNME_SURESI_MS);
  }, []);

  useEffect(
    () => () => {
      if (zamanlayici.current) clearTimeout(zamanlayici.current);
    },
    [],
  );

  return (
    <Baglam value={goster}>
      {children}
      {metin ? <Toast metin={metin} /> : null}
    </Baglam>
  );
}

export function useToast(): (metin: string) => void {
  return useContext(Baglam);
}
