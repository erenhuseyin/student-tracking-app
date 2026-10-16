// Tek bir çip: dolgun (pill) köşeli, seçili/seçisiz durumlu dokunma hedefi. `Secenekler`
// (segment/tek seçim), `GunSecici` (çoklu seçim) ve `KategoriSecici` (etiket bulutu) bunun
// üzerine kuruludur — dışarıdan doğrudan da kullanılabilir.
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { type Tema, useTema } from '@/lib/tema';

type Props = {
  etiket: string;
  secili: boolean;
  onPress: () => void;
  pasif?: boolean;
  rol?: 'radio' | 'checkbox';
  // Segment görünümü (Secenekler/GunSecici) eşit genişlikte sıralanır; etiket bulutu
  // (KategoriSecici) içeriği kadar sarar.
  esitGenislik?: boolean;
  // Görünür metin kısaltmaysa (ör. gün kısa adı "Pzt") ekran okuyucu için tam adı verir.
  accessibilityLabel?: string;
};

export function Chip({
  etiket,
  secili,
  onPress,
  pasif = false,
  rol = 'radio',
  esitGenislik = false,
  accessibilityLabel,
}: Props) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);

  return (
    <Pressable
      accessibilityRole={rol}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={
        rol === 'checkbox' ? { checked: secili, disabled: pasif } : { selected: secili, disabled: pasif }
      }
      disabled={pasif}
      onPress={onPress}
      style={({ hovered }: { hovered?: boolean }) => [
        styles.cip,
        // 'web' düzeninde segment satırı doldurmaz, çipler içeriği kadar geniştir.
        esitGenislik && tema.duzen !== 'web' && styles.esitGenislik,
        hovered && !secili && !pasif && styles.uzerinde,
        secili && styles.secili,
      ]}
    >
      <Text style={[styles.metin, secili && styles.seciliMetin]} numberOfLines={1}>
        {etiket}
      </Text>
    </Pressable>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    cip: {
      minHeight: t.dokunmaAlani.normal,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: t.bosluk.l,
      borderWidth: 1,
      borderColor: t.renkler.kenarlik,
      borderRadius: t.duzen === 'web' ? t.yaricap.m : t.yaricap.tam,
      backgroundColor: t.renkler.yuzey,
    },
    // Eşit genişlikte yan boşluk küçük tutulur: yedi günlük seçicide (Pzt … Paz) telefon
    // genişliğinde etiket tek harfe kırpılıyordu. Sıfır da olmaz: uzun etiket ("Belirtilmemiş")
    // yuvarlak kenara değiyordu.
    esitGenislik: {
      flex: 1,
      paddingHorizontal: t.bosluk.xs,
    },
    uzerinde: {
      backgroundColor: t.renkler.ayirici,
    },
    secili: {
      backgroundColor: t.renkler.ana,
      borderColor: t.renkler.ana,
    },
    metin: {
      ...t.yazi.govde,
      fontFamily: t.yaziTipi.yariKalin,
      color: t.renkler.metinIkincil,
    },
    seciliMetin: {
      color: t.renkler.anaUzeriMetin,
    },
  });
}
