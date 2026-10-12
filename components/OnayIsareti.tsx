// Etiketsiz onay kutusu (tablo hücreleri için; ör. Menü Yetkileri matrisi). Ekran okuyucu için
// `etiket` zorunlu. Etiketli satır gerekiyorsa `OnayKutusu` kullanılır.
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { Ikon } from '@/components/Ikon';
import { useTema } from '@/lib/tema';

type Props = {
  etiket: string;
  secili: boolean;
  onDegis: (secili: boolean) => void;
  // Değiştirilemeyen hücre (ör. kapatılamayan yönetici menüsü): soluk çizilir.
  pasif?: boolean;
  calisiyor?: boolean;
};

export function OnayIsareti({ etiket, secili, onDegis, pasif = false, calisiyor = false }: Props) {
  const tema = useTema();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={etiket}
      accessibilityState={{ checked: secili, disabled: pasif || calisiyor }}
      disabled={pasif || calisiyor}
      onPress={() => onDegis(!secili)}
      style={({ pressed }) => [styles.kutu, pasif && styles.pasif, pressed && styles.basili]}
    >
      {calisiyor ? (
        <ActivityIndicator size="small" color={tema.renkler.ana} />
      ) : (
        <Ikon ad={secili ? 'checkbox' : 'square-outline'} boyut={24} renk={secili ? tema.renkler.ana : tema.renkler.kenarlik} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  kutu: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pasif: {
    opacity: 0.45,
  },
  basili: {
    opacity: 0.6,
  },
});
