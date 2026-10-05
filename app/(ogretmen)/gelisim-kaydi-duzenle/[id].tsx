// Erişim: yalnızca ogretmen (kendi girdiği kayıt; RLS başkasının kaydında güncellemeyi reddeder)
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { Ekran } from '@/components/Ekran';
import { GelisimKaydiFormu } from '@/components/GelisimKaydiFormu';
import { HataMesaji } from '@/components/HataMesaji';
import { Yukleniyor } from '@/components/Yukleniyor';
import { gelisimKaydiGetir, gelisimKaydiGuncelle, kategorileriGetir } from '@/lib/gelisim';
import type { GelisimKategorisi, GelisimKaydi } from '@/lib/tipler';

export default function GelisimKaydiDuzenle() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [kayit, setKayit] = useState<GelisimKaydi | null>(null);
  const [kategoriler, setKategoriler] = useState<GelisimKategorisi[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([gelisimKaydiGetir(id), kategorileriGetir()])
      .then(([k, tumKategoriler]) => {
        setKayit(k);
        // Pasif kategoriler yeni seçim için sunulmaz; kaydın mevcut kategorisi pasif olsa da kalır.
        setKategoriler(tumKategoriler.filter((kat) => kat.aktif || kat.id === k.kategori_id));
      })
      .catch((e: Error) => setHata(e.message));
  }, [id]);

  return (
    <Ekran kaydirilabilir>
      <Stack.Screen options={{ title: 'Kaydı Düzenle' }} />

      <HataMesaji mesaj={hata} />
      {kayit && kategoriler ? (
        <GelisimKaydiFormu
          kategoriler={kategoriler}
          baslangic={{
            kategoriId: kayit.kategori_id,
            notMetni: kayit.not_metni,
            olcekDegeri: kayit.olcek_degeri,
            tarih: kayit.tarih,
          }}
          onKaydet={async (girdi) => {
            await gelisimKaydiGuncelle(kayit.id, girdi);
            router.back();
          }}
        />
      ) : hata ? null : (
        <Yukleniyor />
      )}
    </Ekran>
  );
}
