// Erişim: yalnızca kurum_admin. Kurumun (ana kurum yöneticisinde şubeler dahil) günlük birleşik
// ders programı; salt okunur. Program sınıf ekranından düzenlenir.
import { Stack } from 'expo-router';

import { Ekran } from '@/components/Ekran';
import { GunlukProgram } from '@/components/GunlukProgram';

export default function KurumProgrami() {
  return (
    <Ekran>
      <Stack.Screen options={{ title: 'Ders Programı' }} />
      <GunlukProgram />
    </Ekran>
  );
}
