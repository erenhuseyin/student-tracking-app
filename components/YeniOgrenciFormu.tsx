// Öğrenciler tablosundan yeni öğrenci: önce sınıf seçilir (öğrencinin birimi sınıfının birimidir),
// sonra ad ve doğum tarihi girilir. Erişim: yalnızca kurum_admin (RLS: yönettiği kurumlar).
// Sınıf ekranındaki "yeni öğrenci" (`/yeni-ogrenci`) sınıfı bildiği için ayrı ve daha kısadır.
import { useState } from 'react';
import { Text } from 'react-native';

import { Buton } from '@/components/Buton';
import { Girdi } from '@/components/Girdi';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { Secim } from '@/components/Secim';
import { TarihGirdisi } from '@/components/TarihGirdisi';
import { ogrenciEkle } from '@/lib/ogrenciler';
import { useTema } from '@/lib/tema';
import type { Sinif } from '@/lib/tipler';
import { useToast } from '@/lib/toast';

type Props = {
  siniflar: Sinif[];
  // Sınıf adı birimler arasında tekrar edebildiği için birim yoluyla birlikte gösterilir.
  sinifEtiketi: (sinif: Sinif) => string;
  onEklendi: () => void;
};

export function YeniOgrenciFormu({ siniflar, sinifEtiketi, onEklendi }: Props) {
  const tema = useTema();
  const toast = useToast();
  const [sinifId, setSinifId] = useState<string | null>(null);
  const [adSoyad, setAdSoyad] = useState('');
  const [dogumTarihi, setDogumTarihi] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const kaydet = async () => {
    const sinif = siniflar.find((s) => s.id === sinifId);
    if (!sinif) {
      setHata('Bir sınıf seçin.');
      return;
    }
    setGonderiliyor(true);
    setHata(null);
    try {
      await ogrenciEkle(sinif.kurum_id, sinif.id, adSoyad, dogumTarihi);
      toast('Öğrenci eklendi');
      onEklendi();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');
    } finally {
      setGonderiliyor(false);
    }
  };

  if (siniflar.length === 0) {
    return (
      <Kart>
        <Text style={tema.yazi.kucuk}>Öğrenci ekleyebilmek için önce bir sınıf açın (Sınıflar ya da ilgili birimin ekranı).</Text>
      </Kart>
    );
  }

  return (
    <Kart>
      <Secim
        etiket="Sınıf"
        secenekler={siniflar.map((s) => ({ deger: s.id, etiket: sinifEtiketi(s) }))}
        secili={sinifId}
        onSec={setSinifId}
        pasif={gonderiliyor}
      />
      <Girdi etiket="Ad soyad" value={adSoyad} onChangeText={setAdSoyad} editable={!gonderiliyor} />
      <TarihGirdisi etiket="Doğum tarihi" deger={dogumTarihi} onDegis={setDogumTarihi} pasif={gonderiliyor} />
      <Text style={tema.yazi.kucuk}>Veli girişi için TC kimlik numarası, kayıt açıldıktan sonra öğrencinin panelinden atanır.</Text>
      <HataMesaji mesaj={hata} />
      <Buton baslik="Kaydet" onPress={kaydet} yukleniyor={gonderiliyor} />
    </Kart>
  );
}
