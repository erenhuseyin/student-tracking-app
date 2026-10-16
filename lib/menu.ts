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

// Tanımlı rolü olan kişi o rolün adıyla (ör. "İstişare üyesi"; veride görev), sistem rolündeki
// yönetici bağlı olduğu kurumun seviyesiyle ("Bölge yöneticisi") gösterilir.
export function rolEtiketi(rol: Rol, kurum: Pick<Kurum, 'seviye'> | null, gorevAdi?: string | null): string {
  if (gorevAdi) return gorevAdi;
  return rol === 'kurum_admin' ? yoneticiEtiketi(kurum) : ROL_ETIKETLERI[rol];
}

// Müşterinin (kök kurum yöneticisinin) öğretmen ve veliler için kapatabildiği bölümler
// (Roller ekranı; tablo: kapali_bolum). Yönetici bölümleri kapatılamaz.
export type AyarlanabilirRol = 'ogretmen' | 'veli';
export type Bolum = { anahtar: string; etiket: string; aciklama: string };

export const AYARLANABILIR_BOLUMLER: Record<AyarlanabilirRol, Bolum[]> = {
  ogretmen: [
    { anahtar: 'yoklama', etiket: 'Yoklama', aciklama: 'Yoklama alma, haftalık tablo ve katılım oranı' },
    { anahtar: 'gelisim', etiket: 'Gelişim', aciklama: 'Öğrenciye gelişim kaydı girme ve kayıtları görme' },
    { anahtar: 'duyurular', etiket: 'Duyurular', aciklama: 'Duyuru ve etkinlikleri görme, kendi sınıfına duyuru yazma' },
    { anahtar: 'program', etiket: 'Ders Programı', aciklama: 'Sınıflarının haftalık ders programını görme ve düzenleme' },
    { anahtar: 'icerik', etiket: 'Ders, Ezber ve Kitap Takibi', aciklama: 'Konu ilerlemesi, ezber ve kitap takibi (kurumda açıksa)' },
    { anahtar: 'ozet', etiket: 'Kurum Özeti', aciklama: 'Kendi biriminin sayıları ve katılım oranları (pano)' },
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
  return !kapaliOgeleriGenislet(kapaliBolumler).includes(anahtar);
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
  // Web kenar çubuğunda açılır bir grubun altında, telefonda Menü ekranında grup başlığının altında
  // durur (MENU_GRUPLARI). Telefondaki sekme çubuğunu etkilemez: gruplu bir sekme yine sekmedir.
  grup?: MenuGrubuAnahtari;
};

export type MenuGrubuAnahtari = 'raporlar' | 'yonetim';
export const MENU_GRUPLARI: { anahtar: MenuGrubuAnahtari; etiket: string; ikon: IkonAdi }[] = [
  { anahtar: 'raporlar', etiket: 'Raporlar', ikon: 'document-text-outline' },
  { anahtar: 'yonetim', etiket: 'Uygulama Yönetimi', ikon: 'settings-outline' },
];

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

// Öğretmen ve velide takvim etkinlikleri gösterir; kurum "Duyurular"ı kapattıysa o da kapanır.
const TAKVIM_SATIRI: MenuSatiri = {
  anahtar: 'takvim',
  etiket: 'Takvim',
  ikon: 'calendar-number-outline',
  yer: 'menu',
  rota: '/takvim',
  bolum: 'duyurular',
};

const MENULER: Record<Rol, MenuOgesi[]> = {
  kurum_admin: [
    { anahtar: 'ozet', etiket: 'Özet', ikon: 'home-outline', yer: 'sekme', sekme: 'index' },
    { anahtar: 'siniflar', etiket: 'Sınıflar', ikon: 'school-outline', yer: 'sekme', sekme: 'siniflar' },
    { anahtar: 'personel', etiket: 'Kullanıcılar', ikon: 'people-outline', yer: 'sekme', sekme: 'personel', grup: 'yonetim' },
    DUYURULAR_SEKMESI,
    MENU_SEKMESI,
    { anahtar: 'ogrenciler', etiket: 'Öğrenciler', ikon: 'search-outline', yer: 'menu', rota: '/ogrenciler' },
    { anahtar: 'basvurular', etiket: 'Başvurular', ikon: 'mail-unread-outline', yer: 'menu', rota: '/basvurular', ozellik: 'basvuru' },
    { anahtar: 'oneriler', etiket: 'Veli Önerileri', ikon: 'chatbox-ellipses-outline', yer: 'menu', rota: '/oneriler' },
    { anahtar: 'takvim', etiket: 'Takvim', ikon: 'calendar-number-outline', yer: 'menu', rota: '/takvim' },
    { anahtar: 'kurum-programi', etiket: 'Ders Programı', ikon: 'calendar-outline', yer: 'menu', rota: '/kurum-programi' },
    { anahtar: 'kademeler', etiket: 'Kademeler', ikon: 'layers-outline', yer: 'menu', rota: '/kademeler', ozellik: 'icerik_takibi' },
    { anahtar: 'konu-notlari', etiket: 'Konu Notları', ikon: 'chatbubble-ellipses-outline', yer: 'menu', rota: '/konu-notlari', ozellik: 'icerik_takibi' },
    {
      anahtar: 'gelisim-kategorileri',
      etiket: 'Gelişim Kategorileri',
      ikon: 'pricetags-outline',
      yer: 'menu',
      rota: '/gelisim-kategorileri',
      yalnizKok: true,
    },
    // Raporlar: her biri süzgeçli bir sorgulama ekranı; web'de "Rapor İndir" ile CSV.
    {
      anahtar: 'ders-raporu',
      etiket: 'Ders Raporu',
      ikon: 'stats-chart-outline',
      yer: 'menu',
      rota: '/ders-raporu',
      ozellik: 'icerik_takibi',
      grup: 'raporlar',
    },
    { anahtar: 'katilim-raporu', etiket: 'Katılım Raporu', ikon: 'pie-chart-outline', yer: 'menu', rota: '/rapor/katilim', grup: 'raporlar' },
    { anahtar: 'yoklama-raporu', etiket: 'Yoklama Kayıtları', ikon: 'checkbox-outline', yer: 'menu', rota: '/rapor/yoklama', grup: 'raporlar' },
    {
      anahtar: 'ezber-raporu',
      etiket: 'Ezber Raporu',
      ikon: 'bookmark-outline',
      yer: 'menu',
      rota: '/rapor/ezber',
      ozellik: 'icerik_takibi',
      grup: 'raporlar',
    },
    {
      anahtar: 'kitap-raporu',
      etiket: 'Kitap Raporu',
      ikon: 'book-outline',
      yer: 'menu',
      rota: '/rapor/kitap',
      ozellik: 'icerik_takibi',
      grup: 'raporlar',
    },
    // Uygulama yönetimi (Kullanıcılar yukarıda; telefonda sekmedir).
    { anahtar: 'roller', etiket: 'Roller', ikon: 'shield-checkmark-outline', yer: 'menu', rota: '/roller', grup: 'yonetim' },
    {
      anahtar: 'subeler',
      etiket: 'Alt Birimler',
      ikon: 'business-outline',
      yer: 'menu',
      rota: '/subeler',
      altBirimler: true,
      grup: 'yonetim',
    },
  ],
  ogretmen: [
    { anahtar: 'siniflarim', etiket: 'Sınıflarım', ikon: 'school-outline', yer: 'sekme', sekme: 'index' },
    { anahtar: 'ogretmen-ozet', etiket: 'Özet', ikon: 'stats-chart-outline', yer: 'sekme', sekme: 'ozet', bolum: 'ozet' },
    { anahtar: 'program', etiket: 'Program', ikon: 'calendar-outline', yer: 'sekme', sekme: 'program', bolum: 'program' },
    DUYURULAR_SEKMESI,
    MENU_SEKMESI,
    TAKVIM_SATIRI,
  ],
  veli: [
    { anahtar: 'cocuklarim', etiket: 'Çocuklarım', ikon: 'people-outline', yer: 'sekme', sekme: 'index' },
    DUYURULAR_SEKMESI,
    MENU_SEKMESI,
    TAKVIM_SATIRI,
    { anahtar: 'oneri', etiket: 'Öneri Gönder', ikon: 'chatbox-ellipses-outline', yer: 'menu', rota: '/oneri' },
    { anahtar: 'kardes-ekle', etiket: 'Kardeş Ekle', ikon: 'person-add-outline', yer: 'menu', rota: '/kardes-ekle' },
    { anahtar: 'pin-degistir', etiket: "PIN'imi Değiştir", ikon: 'key-outline', yer: 'menu', rota: '/pin-degistir' },
  ],
  super_admin: [
    { anahtar: 'kurumlar', etiket: 'Kurumlar', ikon: 'business-outline', yer: 'sekme', sekme: 'index' },
    MENU_SEKMESI,
  ],
};

// Yöneticiye dayanan tanımlı bir rolde kapatılabilen menü öğeleri (Roller ekranı; gorev.kapali_ogeler).
// Özet ve Menü kapatılamaz: kişi uygulamada bir yere düşebilmeli ve çıkış yapabilmelidir.
const KAPATILAMAYAN_OGELER = ['ozet', 'menu'];
// Gruplu öğe grup adıyla gösterilir ("Raporlar › Katılım Raporu").
export const YONETICI_MENU_OGELERI: Bolum[] = MENULER.kurum_admin
  .filter((o) => !KAPATILAMAYAN_OGELER.includes(o.anahtar))
  .map((o) => {
    const etiket = o.altBirimler ? 'Alt birimler' : o.etiket;
    const grup = MENU_GRUPLARI.find((g) => g.anahtar === o.grup);
    return { anahtar: o.anahtar, etiket: grup ? `${grup.etiket} › ${etiket}` : etiket, aciklama: '' };
  });

// Raporlar eskiden tek bir "Raporlar" ekranıydı (anahtar `raporlar`). Bir tanımlı rolde o kapatılmışsa
// (gorev.kapali_ogeler) bugünkü tüm raporlar kapalı sayılır: liste bu anahtar yerine onları içerir.
const ESKI_RAPORLAR_ANAHTARI = 'raporlar';
export function kapaliOgeleriGenislet(kapali: string[]): string[] {
  if (!kapali.includes(ESKI_RAPORLAR_ANAHTARI)) return kapali;
  const raporlar = MENULER.kurum_admin.filter((o) => o.grup === 'raporlar').map((o) => o.anahtar);
  return [...new Set([...kapali.filter((a) => a !== ESKI_RAPORLAR_ANAHTARI), ...raporlar])];
}

// Bir grubun görünür öğesi; sekme de olabilir, menü satırı da (adres ikisi için ortak biçimde).
export type GrupOgesi = { anahtar: string; etiket: string; ikon: IkonAdi; href: Href };
export type GorunurGrup = { anahtar: MenuGrubuAnahtari; etiket: string; ikon: IkonAdi; ogeler: GrupOgesi[] };

export type Menu = {
  // Rolün tüm sekmeleri; `gorunur` yanlışsa sekme çubuğunda yer almaz (dosyası yine vardır).
  sekmeler: (SekmeOgesi & { gorunur: boolean })[];
  // Grupsuz menü satırları (gruplu olanlar `gruplar`dadır).
  menuSatirlari: MenuSatiri[];
  // Görünür öğesi olan gruplar, MENU_GRUPLARI sırasıyla.
  gruplar: GorunurGrup[];
};

export function useMenu(): Menu {
  const { kullanici, kurum, kokKurum, kapaliBolumler: kapaliHam } = useOturum();
  const kapaliBolumler = kapaliOgeleriGenislet(kapaliHam);
  const kokKurumMu = kurum !== null && kurum.ust_kurum_id === null;
  const ogeler = kullanici ? MENULER[kullanici.rol] : [];
  const ozellikler = kokKurum?.ozellikler;
  const ozellikAcik = (ad: string) =>
    typeof ozellikler === 'object' && ozellikler !== null && !Array.isArray(ozellikler) && ozellikler[ad] === true;
  const gorunur = (o: MenuOgesi) =>
    (!o.yalnizKok || kokKurumMu) &&
    (!o.altBirimler || altBirimAcabilir(kurum)) &&
    !(o.bolum && kapaliBolumler.includes(o.bolum)) &&
    (KAPATILAMAYAN_OGELER.includes(o.anahtar) || !kapaliBolumler.includes(o.anahtar)) &&
    (!o.ozellik || ozellikAcik(o.ozellik));
  const etiketli = <T extends MenuOgesi>(o: T): T =>
    o.altBirimler && kurum ? { ...o, etiket: seviyeAdiCogul(kurum.seviye + 1) } : o;

  return {
    sekmeler: ogeler.filter((o) => o.yer === 'sekme').map((o) => ({ ...o, gorunur: gorunur(o) })),
    menuSatirlari: ogeler
      .filter((o): o is MenuSatiri => o.yer === 'menu' && !o.grup)
      .filter(gorunur)
      .map(etiketli),
    gruplar: MENU_GRUPLARI.map((g) => ({
      ...g,
      ogeler: ogeler
        .filter((o) => o.grup === g.anahtar && gorunur(o))
        .map(etiketli)
        .map((o) => ({
          anahtar: o.anahtar,
          etiket: o.etiket,
          ikon: o.ikon,
          href: o.yer === 'sekme' ? ((o.sekme === 'index' ? '/' : `/${o.sekme}`) as Href) : o.rota,
        })),
    })).filter((g) => g.ogeler.length > 0),
  };
}

// Aynı adres birden çok rol grubunda bulunabilir (`/duyurular`, `/profil`, `/bildirimler` …). Adres
// tek başına verilince Expo Router dosya ağacındaki ilk eşleşen gruba çözer; o grup başka bir role
// aitse ekran açılmaz ve ana ekrana dönülür (web'de sayfa yenilenince olan buydu). Bu fonksiyon
// adresi kullanıcının rol grubuna sabitler: `/duyurular` -> `/(ogretmen)/(sekmeler)/duyurular`.
// Tarayıcının adres çubuğunda grup adları görünmez. Rol grubu klasörlerinin adı rol değeriyle aynıdır.
export function rolYolu(rol: Rol, yol: string): Href {
  if (!yol.startsWith('/') || yol.startsWith('/(')) return yol as Href;
  const ilkParca = yol.split(/[?#]/)[0].split('/')[1] ?? '';
  const sekme = MENULER[rol].some((o) => o.yer === 'sekme' && (ilkParca === '' ? o.sekme === 'index' : o.sekme === ilkParca));
  return `/(${rol})${sekme ? '/(sekmeler)' : ''}${yol}` as Href;
}
