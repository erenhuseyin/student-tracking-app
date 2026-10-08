// Erişim: yalnızca kurum_admin. Kendi kurumunun personelini yönetir; kök admin bir şubenin
// personeline şube ekranından (`/sube-personel/[id]`) ulaşır.
import { Ekran } from '@/components/Ekran';
import { PersonelListesi } from '@/components/PersonelListesi';
import { useOturum } from '@/lib/oturum';

export default function Personel() {
  const { kurum } = useOturum();

  return <Ekran>{kurum ? <PersonelListesi kurumId={kurum.id} /> : null}</Ekran>;
}
