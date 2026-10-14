// Erişim: yalnızca kurum_admin. Yönettiği birim ve altındaki tüm sınıfların ders programı (genel
// merkez yöneticisi için herkesin programı), birim ve hoca süzgeciyle; salt okunur. Program sınıf
// ekranından düzenlenir.
import { Stack } from 'expo-router';

import { Ekran } from '@/components/Ekran';
import { KurumProgrami as Program } from '@/components/KurumProgrami';
import { useTema } from '@/lib/tema';

export default function KurumProgrami() {
  const tema = useTema();
  return (
    <Ekran genis={tema.duzen === 'web'}>
      <Stack.Screen options={{ title: 'Ders Programı' }} />
      <Program />
    </Ekran>
  );
}
