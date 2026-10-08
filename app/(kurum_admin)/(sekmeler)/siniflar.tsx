// Erişim: yalnızca kurum_admin. Kendi kurumunun sınıflarını yönetir.
import { Text } from 'react-native';

import { Ekran } from '@/components/Ekran';
import { SinifListesi } from '@/components/SinifListesi';
import { useOturum } from '@/lib/oturum';
import { useTema } from '@/lib/tema';

export default function Siniflar() {
  const tema = useTema();
  const { kurum } = useOturum();

  return (
    <Ekran>
      {kurum ? <Text style={tema.yazi.bolum}>{kurum.ad}</Text> : null}
      {kurum ? <SinifListesi kurumId={kurum.id} /> : null}
    </Ekran>
  );
}
