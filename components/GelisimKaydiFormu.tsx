// Gelişim kaydı ekleme/düzenleme formu. Doğrulama ve kayıt `onKaydet`'tedir (lib/gelisim.ts);
// fırlatılan hata burada gösterilir. `baslangic` yalnızca ilk çizimde okunur.
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { Buton } from '@/components/Buton';
import { Girdi } from '@/components/Girdi';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { KategoriSecici } from '@/components/KategoriSecici';
import { OlcekSecici } from '@/components/OlcekSecici';
import { TarihGirdisi } from '@/components/TarihGirdisi';
import type { GelisimKaydiGirdisi } from '@/lib/gelisim';
import { bugununTarihi } from '@/lib/tarih';
import type { GelisimKategorisi } from '@/lib/tipler';

type Props = {
  kategoriler: GelisimKategorisi[];
  baslangic?: GelisimKaydiGirdisi;
  onKaydet: (girdi: GelisimKaydiGirdisi) => Promise<void>;
};

export function GelisimKaydiFormu({ kategoriler, baslangic, onKaydet }: Props) {
  const [kategoriId, setKategoriId] = useState<string | null>(baslangic?.kategoriId ?? null);
  const [notMetni, setNotMetni] = useState(baslangic?.notMetni ?? '');
  const [olcekDegeri, setOlcekDegeri] = useState<number | null>(baslangic?.olcekDegeri ?? null);
  const [tarih, setTarih] = useState(baslangic?.tarih ?? bugununTarihi());
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  if (kategoriler.length === 0) {
    return (
      <HataMesaji mesaj="Kullanılabilir kategori yok. Kategorileri kurum yöneticiniz tanımlar; lütfen ona başvurun." />
    );
  }

  const kaydet = async () => {
    setGonderiliyor(true);
    setHata(null);
    try {
      await onKaydet({ kategoriId, notMetni, olcekDegeri, tarih });
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');
      setGonderiliyor(false);
    }
  };

  return (
    <Kart>
      <KategoriSecici
        etiket="Kategori"
        kategoriler={kategoriler}
        seciliId={kategoriId}
        onSec={setKategoriId}
        pasif={gonderiliyor}
      />
      <Girdi
        etiket="Not"
        value={notMetni}
        onChangeText={setNotMetni}
        editable={!gonderiliyor}
        multiline
        maxLength={2000}
        textAlignVertical="top"
        style={styles.not}
      />
      <OlcekSecici etiket="Puan (isteğe bağlı)" deger={olcekDegeri} onDegis={setOlcekDegeri} pasif={gonderiliyor} />
      <TarihGirdisi etiket="Tarih" deger={tarih} onDegis={setTarih} pasif={gonderiliyor} />
      <HataMesaji mesaj={hata} />
      <Buton baslik="Kaydet" onPress={kaydet} yukleniyor={gonderiliyor} />
    </Kart>
  );
}

const styles = StyleSheet.create({
  not: {
    minHeight: 120,
  },
});
