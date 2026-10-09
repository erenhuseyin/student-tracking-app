// Push bildirim kaydı: oturum hazır olduğunda Expo push token'ı alıp kullanici.expo_push_token'a
// yazar. Token kaydı en iyi çabadır (best-effort) — izin verilmezse, gerçek cihaz değilse ya da
// EAS projesi henüz kurulmadıysa (Constants.expoConfig.extra.eas.projectId yok) sessizce çıkar.
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { bildirimHedefi } from '@/lib/bildirimMerkezi';
import { useOturum } from '@/lib/oturum';
import { supabase } from '@/lib/supabase';

export function usePushBildirimKaydi(): void {
  const { durum, kullanici } = useOturum();

  useEffect(() => {
    if (durum !== 'hazir' || !kullanici) return;
    let iptalEdildi = false;

    (async () => {
      const { status: mevcutIzin } = await Notifications.getPermissionsAsync();
      let izin = mevcutIzin;
      if (izin !== 'granted') {
        izin = (await Notifications.requestPermissionsAsync()).status;
      }
      if (izin !== 'granted' || !Device.isDevice) return;

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) return;

      const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
      if (iptalEdildi || !token || token === kullanici.expo_push_token) return;

      await supabase.from('kullanici').update({ expo_push_token: token }).eq('id', kullanici.id);
    })().catch(() => {
      // Token kaydı en iyi çabadır; sessizce yutulur.
    });

    return () => {
      iptalEdildi = true;
    };
  }, [durum, kullanici]);
}

// Aynı bildirime verilen yanıt bir kez işlenir. `getLastNotificationResponseAsync` son yanıtı
// tekrar tekrar döndürür; her dönüşte yönlendirme yapılırsa uygulama aynı ekranı sonsuz kez açar.
const islenenYanitlar = new Set<string>();

// Telefondaki bildirime dokununca ilgili ekranı açar (uygulama açıkken ya da bildirimle açılırken).
// Web'de bildirim yoktur. Hedef ekran lib/bildirimMerkezi.ts > bildirimHedefi'nde belirlenir.
export function useBildirimYonlendirme(): void {
  const router = useRouter();
  // Efekt yalnızca rol değişince yeniden kurulsun diye router ref'te tutulur: `useRouter()`'ın
  // döndürdüğü nesne her gezinmede değişebilir ve efekti (dolayısıyla yönlendirmeyi) yeniden tetikler.
  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);
  const { durum, kullanici } = useOturum();
  const rol = durum === 'hazir' ? kullanici?.rol : undefined;

  useEffect(() => {
    if (Platform.OS === 'web' || !rol) return;
    const ac = (yanit: Notifications.NotificationResponse) => {
      const kimlik = yanit.notification.request.identifier;
      if (islenenYanitlar.has(kimlik)) return;
      islenenYanitlar.add(kimlik);
      // Bir sonraki açılışta aynı bildirim yeniden işlenmesin.
      try {
        Notifications.clearLastNotificationResponse();
      } catch {
        // desteklenmiyorsa yukarıdaki küme bu oturum için yeterlidir
      }
      const veri: unknown = yanit.notification.request.content.data;
      if (typeof veri !== 'object' || veri === null) return;
      const { tip, ogrenci_id } = veri as { tip?: unknown; ogrenci_id?: unknown };
      if (typeof tip !== 'string') return;
      const hedef = bildirimHedefi(rol, { tip, ogrenci_id: typeof ogrenci_id === 'string' ? ogrenci_id : null });
      if (hedef) routerRef.current.push(hedef);
    };

    // Uygulama kapalıyken dokunulan bildirim.
    Notifications.getLastNotificationResponseAsync()
      .then((yanit) => {
        if (yanit) ac(yanit);
      })
      .catch(() => {});
    const abonelik = Notifications.addNotificationResponseReceivedListener(ac);
    return () => abonelik.remove();
  }, [rol]);
}
