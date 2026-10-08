// Liste ekranlarında başlık çubuğunun sağındaki "+" (yeni kayıt). Listeyi çizen bileşen bunu
// kendi ekranının başlığına yerleştirir; ekran sekme de olsa detay da olsa aynı çalışır.
import { Stack } from 'expo-router';

import { IkonButon } from '@/components/IkonButon';

export function BaslikEkleButonu({ etiket, onPress }: { etiket: string; onPress: () => void }) {
  return <Stack.Screen options={{ headerRight: () => <IkonButon ikon="add" etiket={etiket} onPress={onPress} /> }} />;
}
