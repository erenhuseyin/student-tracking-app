// Erişim: yalnızca ogretmen. Öğretmenin kendi biriminin panosu: sayılar, katılım ve eğilim.
// Birim seçimi yoktur ve başka birimlerin toplamları gösterilmez (sunucu da reddeder; lib/pano.ts).
// Müşteri bu bölümü öğretmenler için kapatabilir ("Menü Yetkileri" > Kurum Özeti).
import { Pano } from '@/components/Pano';

export default function OgretmenOzet() {
  return <Pano sabit />;
}
