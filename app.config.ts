// Müşteriye özel (white-label) uygulama yapılandırması. Hangi markanın derleneceğini MARKA
// ortam değişkeni belirler (eas.json'daki build profilleri ayarlar); verilmezse `varsayilan`.
// Her marka `markalar/<kod>/` klasöründe durur: marka.json + google-services.json zorunlu,
// görseller isteğe bağlı (yoksa assets/images altındaki ortak görseller kullanılır).
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
  renkler: { ana: string; ikonArkaplan: string };
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

const config: ExpoConfig = {
  name: marka.uygulamaAdi,
  slug: marka.slug,
  version: '1.0.0',
  orientation: 'portrait',
  icon: gorsel('icon.png'),
  scheme: marka.scheme,
  userInterfaceStyle: 'light',
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
        imageWidth: 76,
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
      renkler: marka.renkler,
    },
  },
  owner: 'ergenecode',
};

export default config;
