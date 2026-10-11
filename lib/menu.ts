// Her rolün bölümleri tek yerde: sekme çubuğu (components/RolSekmeleri) ve Menü ekranı
// (components/MenuEkrani) buradan beslenir. Yeni bir bölüm eklerken hangi rolün göreceği burada
// belirtilir. Bu yalnızca görünürlüktür; veriye erişimi RLS belirler.
import type { Href } from 'expo-router';

import type { IkonAdi } from '@/components/Ikon';
import { useOturum } from '@/lib/oturum';
import { altBirimAcabilir, seviyeAdiCogul, yoneticiEtiketi } from '@/lib/seviye';
import type { Kurum, Rol } from '@/lib/tipler';

export const ROL_ETIKETLERI: Record<Rol, string> = {
  super_admin: 'Süper yönetici',
  kurum_admin: 'Yönetici',
  ogretmen: 'Öğretmen',
  veli: 'Veli',
};

// Yönetici, bağlı olduğu kurumun seviyesiyle gösterilir ("Bölge yöneticisi").
export function rolEtiketi(rol: Rol, kurum: Pick<Kurum, 'seviye'> | null): string {
  return rol === 'kurum_admin' ? yoneticiEtiketi(kurum) : ROL_ETIKETLERI[rol];
}

// Müşterinin (kök kurum yöneticisinin) öğretmen ve veliler için kapatabildiği bölümler
// ("Roller ve Yetkiler" ekranı; tablo: kapali_bolum). Yönetici bölümleri kapatılamaz.
export type AyarlanabilirRol = 'ogretmen' | 'veli';
export type Bolum = { anahtar: string; etiket: string; aciklama: string };

export const AYARLANABILIR_BOLUMLER: Record<AyarlanabilirRol, Bolum[]> = {
  ogretmen: [
    { anahtar: 'yoklama', etiket: 'Yoklama', aciklama: 'Yoklama alma, haftalık tablo ve katılım oranı' },
    { anahtar: 'gelisim', etiket: 'Gelişim', aciklama: 'Öğrenciye gelişim kaydı girme ve kayıtları görme' },
    { anahtar: 'duyurular', etiket: 'Duyurular', aciklama: 'Duyuru ve etkinlikleri görme, kendi sınıfına duyuru yazma' },
    { anahtar: 'program', etiket: 'Ders Programı', aciklama: 'Sınıflarının haftalık ders programını görme ve düzenleme' },
    { anahtar: 'icerik', etiket: 'Ders, Ezber ve Kitap Takibi', aciklama: 'Konu ilerlemesi, ezber ve kitap takibi (kurumda açıksa)' },
  ],
  veli: [
    { anahtar: 'yoklama', etiket: 'Yoklama', aciklama: 'Çocuğun yoklama geçmişi ve katılım oranı' },
    { anahtar: 'gelisim', etiket: 'Gelişim', aciklama: 'Çocuğun gelişim kayıtları' },
    { anahtar: 'duyurular', etiket: 'Duyurular', aciklama: 'Duyuru ve etkinlikleri görme, bildirim alma' },
    { anahtar: 'program', etiket: 'Ders Programı', aciklama: 'Çocuğun sınıfının haftalık ders programı' },
    { anahtar: 'icerik', etiket: 'Ezber ve Kitap Takibi', aciklama: 'Çocuğun ezber ve kitap ilerlemesi (kurumda açıksa)' },
  ],
};

// Bölüm bu kullanıcıya açık mı? Ekranlar bölüme giden butonu/sekmeyi buna göre gösterir; rol
// grubunun `_layout.tsx` dosyası da kapalı bölümün rotalarını kapatır.
export function useBolumAcik(anahtar: string): boolean {
  const { kapaliBolumler } = useOturum();
  return !kapaliBolumler.includes(anahtar);
}

type Ortak = {
  anahtar: string;
  etiket: string;
  ikon: IkonAdi;
  // Yalnızca kök kurumun (müşterinin) yöneticisi görür; alt birim yöneticisi görmez.
  yalnizKok?: boolean;
  // Altına birim açılabilen (en alt seviyede olmayan) kurumun yöneticisi görür; etiketi bir alt
  // seviyenin adıdır (lib/seviye.ts).
  altBirimler?: boolean;
  // Kurumun kapatabildiği bölüm (AYARLANABILIR_BOLUMLER'deki anahtar); kapalıysa öğe gizlenir.
  bolum?: string;
  // Müşteriye özel özellik bayrağı (kurum.ozellikler; yalnızca süper admin açar); kapalıysa öğe gizlenir.
  ozellik?: string;
};

// `sekme`: rol grubunun `(sekmeler)` klasöründeki dosya adı.
export type SekmeOgesi = Ortak & { yer: 'sekme'; sekme: string };
// `rota`: Menü ekranından gidilen ekran.
export type MenuSatiri = Ortak & { yer: 'menu'; rota: Href };
export type MenuOgesi = SekmeOgesi | MenuSatiri;

const MENU_SEKMESI: SekmeOgesi = { anahtar: 'menu', etiket: 'Menü', ikon: 'menu-outline', yer: 'sekme', sekme: 'menu' };

const DUYURULAR_SEKMESI: SekmeOgesi = {
  anahtar: 'duyurular',
  etiket: 'Duyurular',
  ikon: 'megaphone-outline',
  yer: 'sekme',
  sekme: 'duyurular',
  bolum: 'duyurular',
};

const MENULER: Record<Rol, MenuOgesi[]> = {
  kurum_admin: [
    { anahtar: 'ozet', etiket: 'Özet', ikon: 'home-outline', yer: 'sekme', sekme: 'index' },
    { anahtar: 'siniflar', etiket: 'Sınıflar', ikon: 'school-outline', yer: 'sekme', sekme: 'siniflar' },
    { anahtar: 'personel', etiket: 'Personel', ikon: 'people-outline', yer: 'sekme', sekme: 'personel' },
    DUYURULAR_SEKMESI,
    MENU_SEKMESI,
    { anahtar: 'ogrenciler', etiket: 'Öğrenciler', ikon: 'search-outline', yer: 'menu', rota: '/ogrenciler' },
    { anahtar: 'subeler', etiket: 'Alt Birimler', ikon: 'business-outline', yer: 'menu', rota: '/subeler', altBirimler: true },
    { anahtar: 'basvurular', etiket: 'Başvurular', ikon: 'mail-unread-outline', yer: 'menu', rota: '/basvurular', ozellik: 'basvuru' },
    { anahtar: 'oneriler', etiket: 'Veli Önerileri', ikon: 'chatbox-ellipses-outline', yer: 'menu', rota: '/oneriler' },
    { anahtar: 'kurum-programi', etiket: 'Ders Programı', ikon: 'calendar-outline', yer: 'menu', rota: '/kurum-programi' },
    { anahtar: 'kademeler', etiket: 'Kademeler', ikon: 'layers-outline', yer: 'menu', rota: '/kademeler', ozellik: 'icerik_takibi' },
    { anahtar: 'raporlar', etiket: 'Raporlar', ikon: 'download-outline', yer: 'menu', rota: '/raporlar' },
    { anahtar: 'roller', etiket: 'Roller ve Yetkiler', ikon: 'shield-checkmark-outline', yer: 'menu', rota: '/roller' },
    {
      anahtar: 'gelisim-kategorileri',
      etiket: 'Gelişim Kategorileri',
      ikon: 'pricetags-outline',
      yer: 'menu',
      rota: '/gelisim-kategorileri',
      yalnizKok: true,
    },
  ],
  ogretmen: [
    { anahtar: 'siniflarim', etiket: 'Sınıflarım', ikon: 'school-outline', yer: 'sekme', sekme: 'index' },
    { anahtar: 'program', etiket: 'Program', ikon: 'calendar-outline', yer: 'sekme', sekme: 'program', bolum: 'program' },
    DUYURULAR_SEKMESI,
    MENU_SEKMESI,
  ],
  veli: [
    { anahtar: 'cocuklarim', etiket: 'Çocuklarım', ikon: 'people-outline', yer: 'sekme', sekme: 'index' },
    DUYURULAR_SEKMESI,
    MENU_SEKMESI,
    { anahtar: 'oneri', etiket: 'Öneri Gönder', ikon: 'chatbox-ellipses-outline', yer: 'menu', rota: '/oneri' },
    { anahtar: 'kardes-ekle', etiket: 'Kardeş Ekle', ikon: 'person-add-outline', yer: 'menu', rota: '/kardes-ekle' },
    { anahtar: 'pin-degistir', etiket: "PIN'imi Değiştir", ikon: 'key-outline', yer: 'menu', rota: '/pin-degistir' },
  ],
  super_admin: [
    { anahtar: 'kurumlar', etiket: 'Kurumlar', ikon: 'business-outline', yer: 'sekme', sekme: 'index' },
    MENU_SEKMESI,
  ],
};

export type Menu = {
  // Rolün tüm sekmeleri; `gorunur` yanlışsa sekme çubuğunda yer almaz (dosyası yine vardır).
  sekmeler: (SekmeOgesi & { gorunur: boolean })[];
  menuSatirlari: MenuSatiri[];
};

export function useMenu(): Menu {
  const { kullanici, kurum, kokKurum, kapaliBolumler } = useOturum();
  const kokKurumMu = kurum !== null && kurum.ust_kurum_id === null;
  const ogeler = kullanici ? MENULER[kullanici.rol] : [];
  const ozellikler = kokKurum?.ozellikler;
  const ozellikAcik = (ad: string) =>
    typeof ozellikler === 'object' && ozellikler !== null && !Array.isArray(ozellikler) && ozellikler[ad] === true;
  const gorunur = (o: MenuOgesi) =>
    (!o.yalnizKok || kokKurumMu) &&
    (!o.altBirimler || altBirimAcabilir(kurum)) &&
    !(o.bolum && kapaliBolumler.includes(o.bolum)) &&
    (!o.ozellik || ozellikAcik(o.ozellik));

  return {
    sekmeler: ogeler.filter((o) => o.yer === 'sekme').map((o) => ({ ...o, gorunur: gorunur(o) })),
    menuSatirlari: ogeler
      .filter((o) => o.yer === 'menu')
      .filter(gorunur)
      .map((o) => (o.altBirimler && kurum ? { ...o, etiket: seviyeAdiCogul(kurum.seviye + 1) } : o)),
  };
}
