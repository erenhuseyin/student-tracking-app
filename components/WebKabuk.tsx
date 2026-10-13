// 'web' düzeninin iskeleti: solda kalıcı kenar çubuğu, sağda rol grubunun ekranları. Rol grubunun
// `_layout.tsx` dosyası `Stack`'ini bununla sarar; böylece kenar çubuğu detay ekranlarında da kalır.
// 'mobil' düzende yalnızca çocuklarını çizer (gezinme alt sekme çubuğundadır: RolSekmeleri).
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Sidebar } from '@/components/Sidebar';
import { WebBaslik } from '@/components/WebBaslik';
import { type Tema, useDuzen, useTema } from '@/lib/tema';

// `kenarsiz`: kenar çubuğu çizilmez (ör. veli yeni PIN belirlemeden hiçbir bölüme gidemez).
export function WebKabuk({ children, kenarsiz = false }: { children: ReactNode; kenarsiz?: boolean }) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const web = useDuzen() === 'web';
  // Çocuklar her iki düzende de aynı konumdadır: pencere daralıp genişleyince gezinme durumu
  // (açık ekranlar) kaybolmaz.
  return (
    <View style={styles.kok}>
      {web && !kenarsiz ? <Sidebar /> : null}
      <View style={styles.icerik}>{children}</View>
    </View>
  );
}

// Başlık seçeneklerinin okunan kısmı (native-stack ve bottom-tabs başlık props'larının ortak alt
// kümesi; @react-navigation doğrudan bağımlılık olmadığı için tipleri buradan alınmaz).
type BaslikProps = {
  options: { title?: string; headerRight?: (p: { tintColor?: string; canGoBack: boolean }) => ReactNode };
  route: { name: string };
  navigation: { goBack: () => void };
  back?: unknown;
};

function baslik(tema: Tema) {
  function Baslik({ options, route, navigation, back }: BaslikProps) {
    return (
      <WebBaslik
        baslik={options.title ?? route.name}
        onGeri={back ? () => navigation.goBack() : undefined}
        sag={options.headerRight?.({ tintColor: tema.renkler.ana, canGoBack: Boolean(back) })}
      />
    );
  }
  return Baslik;
}

// Rol grubunun `Stack`'i için başlık seçenekleri: 'mobil' düzende temanın telefon başlığı, 'web'
// düzeninde sayfa başlığı (WebBaslik).
export function useStackSecenekleri() {
  const tema = useTema();
  const duzen = useDuzen();
  return useMemo(
    () => (duzen === 'web' ? { ...tema.baslikCubuguSecenekleri, header: baslik(tema) } : tema.baslikCubuguSecenekleri),
    [tema, duzen],
  );
}

// Sekme ekranları için aynısı (RolSekmeleri).
export function useWebBasligi() {
  const tema = useTema();
  return useMemo(() => baslik(tema), [tema]);
}

function olustur(t: Tema) {
  return StyleSheet.create({
    kok: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: t.renkler.zemin,
    },
    icerik: {
      flex: 1,
      minWidth: 0,
    },
  });
}
