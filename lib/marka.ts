// Bu derlemenin ait olduğu marka (müşteri). Değerler derleme zamanında app.config.ts tarafından
// markalar/<kod>/marka.json'dan okunup `extra.marka`'ya yazılır.
import Constants from 'expo-constants';

export type Marka = {
  kod: string;
  ad: string;
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
    // İsteğe bağlı; karanlık temanın zemin tonları.
    karanlik?: { zemin?: string; yuzey?: string; anaSoluk?: string; kenarlik?: string; ayirici?: string };
  };
  // İsteğe bağlı; markalar/<kod>/logo.png (ve karanlık tema için logo-koyu.png), veri adresi olarak.
  logo?: { uri: string; koyuUri?: string; en: number; boy: number };
};

const ham = Constants.expoConfig?.extra?.marka as Marka | undefined;
// Web'de yapılandırma pakete gömülür; marka/yapılandırma değişince Metro önbelleği `--clear` ile
// temizlenmezse eski değer (ya da bu hata) görülür.
if (!ham) throw new Error('Marka yapılandırması bulunamadı (app.config.ts > extra.marka). `npx expo start --clear` deneyin.');

export const marka: Marka = ham;
