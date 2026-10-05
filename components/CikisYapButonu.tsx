// Başlık çubuğunun sağında duran çıkış ikonu (rol ana ekranları).
import { IkonButon } from '@/components/IkonButon';
import { useOturum } from '@/lib/oturum';
import { renkler } from '@/lib/tema';

export function CikisYapButonu() {
  const { cikisYap } = useOturum();
  return <IkonButon ikon="log-out-outline" etiket="Çıkış yap" renk={renkler.metinIkincil} onPress={cikisYap} />;
}
