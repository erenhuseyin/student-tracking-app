// Ekran iskeleti: zemin rengi, kenar boşlukları ve güvenli alan. Formlarda `kaydirilabilir`
// verilir (kaydırma + klavye kaçınması). Başlık çubuğu olmayan ekranlar (giriş, durum
// ekranları) `baslikCubugusuz` ile üst güvenli alanı da kendisi bırakır.
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { bosluk, renkler } from '@/lib/tema';

type Props = {
  children: ReactNode;
  kaydirilabilir?: boolean;
  baslikCubugusuz?: boolean;
  ortala?: boolean;
};

export function Ekran({ children, kaydirilabilir = false, baslikCubugusuz = false, ortala = false }: Props) {
  const kenarlar = useSafeAreaInsets();
  const dolgu = {
    paddingTop: bosluk.l + (baslikCubugusuz ? kenarlar.top : 0),
    paddingBottom: bosluk.l + kenarlar.bottom,
  };

  if (!kaydirilabilir) {
    return <View style={[styles.kok, styles.icerik, styles.doldur, ortala && styles.ortala, dolgu]}>{children}</View>;
  }

  return (
    <KeyboardAvoidingView style={styles.kok} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.icerik, styles.kaydirmaIcerigi, ortala && styles.ortala, dolgu]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kok: {
    flex: 1,
    backgroundColor: renkler.zemin,
  },
  doldur: {
    flex: 1,
  },
  icerik: {
    paddingHorizontal: bosluk.l,
    gap: bosluk.m,
    // Web'de ve tablette içerik aşırı genişlemesin.
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  kaydirmaIcerigi: {
    flexGrow: 1,
  },
  ortala: {
    justifyContent: 'center',
  },
});
