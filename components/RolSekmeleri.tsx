// Bir rol grubunun ana bölümleri arasındaki sekmeli gezinme. Sekmeler lib/menu.ts'ten gelir.
// Telefonda altta; tablet ve masaüstünde (>=768) solda durur. Rol grubunun
// `(sekmeler)/_layout.tsx` dosyası yalnızca bunu döndürür.
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BildirimZili } from '@/components/BildirimZili';
import { Ikon } from '@/components/Ikon';
import { useMenu } from '@/lib/menu';
import { useOturum } from '@/lib/oturum';
import { useKirilma, useTema, yaziTipi } from '@/lib/tema';

export function RolSekmeleri() {
  const tema = useTema();
  const kirilma = useKirilma();
  const { sekmeler } = useMenu();
  const kenarlar = useSafeAreaInsets();
  const { kullanici } = useOturum();
  // Süper admine bildirim gönderilmez; zil yalnızca diğer rollerde gösterilir.
  const zilVar = kullanici !== null && kullanici.rol !== 'super_admin';
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
        headerLeft: zilVar ? () => <BildirimZili /> : undefined,
        sceneStyle: { backgroundColor: r.zemin },
        tabBarPosition: yanda ? 'left' : 'bottom',
        // Yandaki çubukta `uikit` varyantı ikon altı etiketi desteklemez.
        tabBarVariant: yanda ? 'material' : 'uikit',
        tabBarLabelPosition: kirilma === 'masaustu' ? 'beside-icon' : 'below-icon',
        tabBarActiveTintColor: r.ana,
        tabBarInactiveTintColor: r.metinIkincil,
        // Alttaki çubuğun varsayılan yüksekliğinde (49) etikete 9 px kalıyor ve yazı alttan kesiliyor
        // (web'de ölçüldü: ikon 28 + sekmenin kendi iç boşluğu 10). Yükseklik açıkça verilir, cihazın
        // alt güvenli alanı eklenir.
        tabBarStyle: yanda
          ? { backgroundColor: r.yuzey, borderColor: r.ayirici }
          : {
              backgroundColor: r.yuzey,
              borderColor: r.ayirici,
              height: 64 + kenarlar.bottom,
              paddingTop: 2,
              paddingBottom: 4 + kenarlar.bottom,
            },
        tabBarLabelStyle: { fontFamily: yaziTipi.orta, fontSize: 11 },
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
