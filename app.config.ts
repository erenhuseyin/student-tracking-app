// Müşteriye özel (white-label) uygulama yapılandırması. Hangi markanın derleneceğini MARKA
// ortam değişkeni belirler (eas.json'daki build profilleri ayarlar); verilmezse `varsayilan`.
// Her marka `markalar/<kod>/` klasöründe durur: marka.json + google-services.json zorunlu,
// görseller isteğe bağlı (yoksa assets/images altındaki ortak görseller kullanılır). Uygulama içinde
// gösterilen logo (logo.png; karanlık tema için logo-koyu.png) da isteğe bağlıdır: Metro marka
// klasöründen dinamik `require` yapamadığı için derleme sırasında `extra.marka.logo`'ya gömülür.
// Yeni müşteri uygulaması açma adımları: docs/yeni-marka.md
/// <reference types="node" />
import type { ExpoConfig } from 'expo/config';
import fs from 'node:fs';
import path from 'node:path';

type MarkaDosyasi = {
  kod: string;
  ad: string;
  uygulamaAdi: string;
  slug: string;
  scheme: string;
  androidPackage: string;
  easProjectId: string;
  // İsteğe bağlı; kurum ağacındaki seviyelerin adları, kökten aşağı (bkz. lib/seviye.ts).
  seviyeAdlari?: string[];
  renkler: {
    ana: string;
    ikonArkaplan: string;
    // İsteğe bağlı; verilmezse lib/tema.ts varsayılanı kullanılır (anaSoluk `ana`dan türetilir).
    anaParlak?: string;
    anaSoluk?: string;
    vurgu?: string;
    vurguKoyu?: string;
    vurguSoluk?: string;
    zemin?: string;
    ayirici?: string;
    // İsteğe bağlı; karanlık temanın zemin tonları (verilmezse lib/tema.ts varsayılanı).
    karanlik?: { zemin?: string; yuzey?: string; anaSoluk?: string; kenarlik?: string; ayirici?: string };
  };
  // İsteğe bağlı; açılış ekranındaki görselin genişliği (yatay logolar için; varsayılan 76).
  splashGenislik?: number;
};

const kod = process.env.MARKA ?? 'varsayilan';
const klasor = path.join(__dirname, 'markalar', kod);
const markaYolu = path.join(klasor, 'marka.json');
if (!fs.existsSync(markaYolu)) {
  throw new Error(`MARKA="${kod}" için ${markaYolu} bulunamadı.`);
}
const marka: MarkaDosyasi = JSON.parse(fs.readFileSync(markaYolu, 'utf8'));
if (marka.kod !== kod) {
  throw new Error(`${markaYolu} içindeki kod ("${marka.kod}") klasör adıyla ("${kod}") aynı olmalı.`);
}

function gorsel(dosya: string): string {
  return fs.existsSync(path.join(klasor, dosya)) ? `./markalar/${kod}/${dosya}` : `./assets/images/${dosya}`;
}

// PNG'yi veri adresi olarak okur; genişlik/yükseklik IHDR başlığından alınır (16. ve 20. bayt).
function logoOku(dosya: string): { uri: string; en: number; boy: number } | undefined {
  const yol = path.join(klasor, dosya);
  if (!fs.existsSync(yol)) return undefined;
  const veri = fs.readFileSync(yol);
  return { uri: `data:image/png;base64,${veri.toString('base64')}`, en: veri.readUInt32BE(16), boy: veri.readUInt32BE(20) };
}
const logo = logoOku('logo.png');

const config: ExpoConfig = {
  name: marka.uygulamaAdi,
  slug: marka.slug,
  version: '1.0.0',
  orientation: 'portrait',
  icon: gorsel('icon.png'),
  scheme: marka.scheme,
  // 'automatic': native tarafta sistem (splash, bildirim ikonu vb.) OS temasını izler.
  // Uygulama içi karanlık mod (lib/tema.ts > useTema) bundan bağımsız zaten çalışıyordu;
  // bu yalnızca native kabuğu JS tarafıyla tutarlı hale getiriyor. Native ayar olduğu için
  // yeni bir development build gerektirir (2026-10-06 "Defter" yeniden tasarımı).
  userInterfaceStyle: 'automatic',
  ios: {
    icon: './assets/expo.icon',
  },
  android: {
    package: marka.androidPackage,
    googleServicesFile: `./markalar/${kod}/google-services.json`,
    adaptiveIcon: {
      backgroundColor: marka.renkler.ikonArkaplan,
      foregroundImage: gorsel('android-icon-foreground.png'),
      backgroundImage: gorsel('android-icon-background.png'),
      monochromeImage: gorsel('android-icon-monochrome.png'),
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: gorsel('favicon.png'),
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: marka.renkler.ana,
        image: gorsel('splash-icon.png'),
        imageWidth: marka.splashGenislik ?? 76,
      },
    ],
    [
      'expo-notifications',
      {
        icon: gorsel('icon.png'),
        color: marka.renkler.ana,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: marka.easProjectId,
    },
    marka: {
      kod: marka.kod,
      ad: marka.ad,
      seviyeAdlari: marka.seviyeAdlari,
      renkler: marka.renkler,
      logo: logo ? { ...logo, koyuUri: logoOku('logo-koyu.png')?.uri } : undefined,
    },
  },
  owner: 'ergenecode',
};

export default config;
