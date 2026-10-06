// Başlık çubuğunun sağında duran çıkış ikonu (rol ana ekranları).
import { IkonButon } from '@/components/IkonButon';
import { useOturum } from '@/lib/oturum';
import { useTema } from '@/lib/tema';

export function CikisYapButonu() {
  const { cikisYap } = useOturum();
  const tema = useTema();
  return <IkonButon ikon="log-out-outline" etiket="Çıkış yap" renk={tema.renkler.metinIkincil} onPress={cikisYap} />;
}
