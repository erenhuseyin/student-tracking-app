// Bir rol grubunun ana bölümleri arasındaki sekmeli gezinme. Sekmeler lib/menu.ts'ten gelir.
// Telefonda altta; tablet ve masaüstünde (>=768) solda durur. Rol grubunun
// `(sekmeler)/_layout.tsx` dosyası yalnızca bunu döndürür.
import { Tabs } from 'expo-router';

import { Ikon } from '@/components/Ikon';
import { useMenu } from '@/lib/menu';
import { useKirilma, useTema, yaziTipi } from '@/lib/tema';

export function RolSekmeleri() {
  const tema = useTema();
  const kirilma = useKirilma();
  const { sekmeler } = useMenu();
  const yanda = kirilma !== 'mobil';
  const r = tema.renkler;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: r.yuzey },
        headerTintColor: r.ana,
        headerTitleStyle: { color: r.metin, fontFamily: yaziTipi.yariKalin, fontSize: 18 },
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: r.zemin },
        tabBarPosition: yanda ? 'left' : 'bottom',
        // Yandaki çubukta `uikit` varyantı ikon altı etiketi desteklemez.
        tabBarVariant: yanda ? 'material' : 'uikit',
        tabBarLabelPosition: kirilma === 'masaustu' ? 'beside-icon' : 'below-icon',
        tabBarActiveTintColor: r.ana,
        tabBarInactiveTintColor: r.metinIkincil,
        tabBarStyle: { backgroundColor: r.yuzey, borderColor: r.ayirici },
        tabBarLabelStyle: { fontFamily: yaziTipi.orta },
      }}
    >
      {sekmeler.map((s) => (
        <Tabs.Screen
          key={s.anahtar}
          name={s.sekme}
          options={{
            title: s.etiket,
            href: s.gorunur ? undefined : null,
            tabBarIcon: ({ focused, size }) => (
              <Ikon ad={s.ikon} renk={focused ? r.ana : r.metinIkincil} boyut={size} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
