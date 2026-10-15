// Roller ekranının panelinde bir rolün menüleri: işaretli menü o roldeki kişilere görünür, işaret
// kaldırılınca gizlenir; değişiklik hemen kaydedilir. Kayıt yeri rolün türüne göre:
//
//   Sistem rolü Öğretmen / Veli   -> kapali_bolum (lib/bolumler.ts); o roldeki herkesi etkiler
//   Tanımlı rol                   -> gorev.kapali_ogeler (lib/gorevler.ts); yalnızca o roldekileri
//   Sistem rolü Yönetici          -> kapatılamaz (kimse kendini dışarıda bırakamasın)
//
// Bu bir GÖRÜNÜRLÜK ayarıdır: ekranı gizler, veri yetkisini değiştirmez (onu rol ve RLS belirler).
// Erişim: yalnızca kök kurumun (genel merkezin) yöneticisi değiştirir; diğerleri salt okunur görür.
import { useState } from 'react';
import { Text } from 'react-native';

import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { OnayKutusu } from '@/components/OnayKutusu';
import { bolumGorunurlugunuAyarla, type KapaliBolum } from '@/lib/bolumler';
import { gorevKapaliOgeleriAyarla } from '@/lib/gorevler';
import { AYARLANABILIR_BOLUMLER, type Bolum, YONETICI_MENU_OGELERI } from '@/lib/menu';
import { useTema } from '@/lib/tema';
import type { Gorev } from '@/lib/tipler';

type Props = {
  temelRol: 'kurum_admin' | 'ogretmen' | 'veli';
  // Tanımlı rolde dolu; sistem rolünde null.
  gorev: Gorev | null;
  kokKurumId: string;
  kapalilar: KapaliBolum[];
  degistirebilir: boolean;
  onKapalilarDegisti: (kapalilar: KapaliBolum[]) => void;
  onGorevDegisti: (gorev: Gorev) => void;
};

export function RolMenuleri({ temelRol, gorev, kokKurumId, kapalilar, degistirebilir, onKapalilarDegisti, onGorevDegisti }: Props) {
  const tema = useTema();
  const [degisen, setDegisen] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  if (!gorev && temelRol === 'kurum_admin') {
    return (
      <Kart>
        <Text style={tema.yazi.bolum}>Menüler</Text>
        <Text style={tema.yazi.kucuk}>
          Yönetici rolünün menüleri kapatılamaz. Bazı yöneticilere daha az menü göstermek için Yönetici rolüne dayanan
          bir rol tanımlayın (ör. İstişare üyesi) ve menülerini orada kapatın.
        </Text>
      </Kart>
    );
  }

  const ogeler: Bolum[] = temelRol === 'kurum_admin' ? YONETICI_MENU_OGELERI : AYARLANABILIR_BOLUMLER[temelRol];
  // Tanımlı öğretmen rolünde, Öğretmen sistem rolünde kapatılan bölüm zaten kapalıdır.
  const sistemdeKapali = (anahtar: string) =>
    temelRol !== 'kurum_admin' && kapalilar.some((k) => k.rol === temelRol && k.anahtar === anahtar);
  const acik = (anahtar: string) => !sistemdeKapali(anahtar) && !(gorev?.kapali_ogeler.includes(anahtar) ?? false);

  const degistir = async (anahtar: string, yeniAcik: boolean) => {
    setDegisen(anahtar);
    setHata(null);
    try {
      if (gorev) {
        const yeni = yeniAcik ? gorev.kapali_ogeler.filter((a) => a !== anahtar) : [...gorev.kapali_ogeler, anahtar];
        await gorevKapaliOgeleriAyarla(gorev.id, yeni);
        onGorevDegisti({ ...gorev, kapali_ogeler: yeni });
      } else if (temelRol !== 'kurum_admin') {
        await bolumGorunurlugunuAyarla(kokKurumId, temelRol, anahtar, yeniAcik);
        const digerleri = kapalilar.filter((k) => !(k.rol === temelRol && k.anahtar === anahtar));
        onKapalilarDegisti(yeniAcik ? digerleri : [...digerleri, { rol: temelRol, anahtar }]);
      }
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
    } finally {
      setDegisen(null);
    }
  };

  return (
    <Kart>
      <Text style={tema.yazi.bolum}>Menüler</Text>
      {ogeler.map((o) => (
        <OnayKutusu
          key={o.anahtar}
          etiket={sistemdeKapali(o.anahtar) && gorev ? `${o.etiket} (Öğretmen rolünde kapalı)` : o.etiket}
          secili={acik(o.anahtar)}
          pasif={!degistirebilir || degisen !== null || (gorev !== null && sistemdeKapali(o.anahtar))}
          calisiyor={degisen === o.anahtar}
          onDegis={(yeniAcik) => degistir(o.anahtar, yeniAcik)}
        />
      ))}
      <HataMesaji mesaj={hata} />
      <Text style={tema.yazi.kucuk}>
        {degistirebilir
          ? `İşareti kaldırılan menü ${gorev ? 'bu roldeki' : temelRol === 'ogretmen' ? 'tüm öğretmenlerin (öğretmene dayanan rollerdekiler dahil)' : 'tüm velilerin'} uygulamasında gizlenir; değişiklik kişinin bir sonraki girişinde görünür. Bu ayar yalnızca ekranları gizler, kimin hangi veriye erişebildiğini değiştirmez.`
          : 'Menüleri yalnızca ana kurumun yöneticisi değiştirebilir.'}
      </Text>
    </Kart>
  );
}
