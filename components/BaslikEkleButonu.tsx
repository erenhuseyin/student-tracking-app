// Liste ekranlarında başlığın sağındaki "yeni kayıt" eylemi: telefonda "+" ikonu, 'web' düzeninde
// yazılı düğme. Listeyi çizen bileşen bunu kendi ekranının başlığına yerleştirir; ekran sekme de
// olsa detay da olsa aynı çalışır.
import { Stack } from 'expo-router';

import { Buton } from '@/components/Buton';
import { IkonButon } from '@/components/IkonButon';
import { useDuzen } from '@/lib/tema';

export function BaslikEkleButonu({ etiket, onPress }: { etiket: string; onPress: () => void }) {
  const web = useDuzen() === 'web';
  return (
    <Stack.Screen
      options={{
        headerRight: () =>
          web ? <Buton baslik={etiket} ikon="add" onPress={onPress} /> : <IkonButon ikon="add" etiket={etiket} onPress={onPress} />,
      }}
    />
  );
}
