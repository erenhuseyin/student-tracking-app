// Açık/Karanlık/Sistem tema tercihini döngüsel değiştiren başlık çubuğu düğmesi.
// Rol ana ekranlarında CikisYapButonu'nun yanında durur — tercih cihazda kalıcıdır
// (bkz. lib/temaTercihi.tsx).
import { IkonButon } from '@/components/IkonButon';
import type { IkonAdi } from '@/components/Ikon';
import { type TemaTercihi, useTemaTercihi } from '@/lib/temaTercihi';
import { useTema } from '@/lib/tema';

const SIRADAKI: Record<TemaTercihi, TemaTercihi> = {
  sistem: 'acik',
  acik: 'karanlik',
  karanlik: 'sistem',
};

const IKON: Record<TemaTercihi, IkonAdi> = {
  sistem: 'phone-portrait-outline',
  acik: 'sunny-outline',
  karanlik: 'moon-outline',
};

const ETIKET: Record<TemaTercihi, string> = {
  sistem: 'Tema: Sistem (dokunarak açık temaya geç)',
  acik: 'Tema: Açık (dokunarak karanlık temaya geç)',
  karanlik: 'Tema: Karanlık (dokunarak sistem temasına dön)',
};

export function TemaDugmesi() {
  const { tercih, tercihiAyarla } = useTemaTercihi();
  const tema = useTema();
  return (
    <IkonButon
      ikon={IKON[tercih]}
      etiket={ETIKET[tercih]}
      renk={tema.renkler.metinIkincil}
      onPress={() => tercihiAyarla(SIRADAKI[tercih])}
    />
  );
}
