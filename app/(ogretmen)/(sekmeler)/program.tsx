// Erişim: yalnızca ogretmen. Atandığı sınıfların günlük birleşik ders programı; salt okunur.
// Program sınıf ekranından düzenlenir.
import { Ekran } from '@/components/Ekran';
import { GunlukProgram } from '@/components/GunlukProgram';

export default function Program() {
  return (
    <Ekran>
      <GunlukProgram />
    </Ekran>
  );
}
