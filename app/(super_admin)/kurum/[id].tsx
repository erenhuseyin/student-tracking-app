// Erişim: yalnızca super_admin. Bir kurumun personelini görür, yönetici davet eder ve — ana
// kurumda — müşteriye özel özellikleri (kurum.ozellikler) açıp kapatır.
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { Ekran } from '@/components/Ekran';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { OnayKutusu } from '@/components/OnayKutusu';
import { PersonelListesi } from '@/components/PersonelListesi';
import { kurumGetir, kurumOzelligiAyarla } from '@/lib/kurumlar';
import { useTema } from '@/lib/tema';
import type { Kurum } from '@/lib/tipler';

function ozellikAcik(kurum: Kurum, ad: string): boolean {
  const o = kurum.ozellikler;
  return typeof o === 'object' && o !== null && !Array.isArray(o) && o[ad] === true;
}

export default function KurumDetay() {
  const tema = useTema();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [kurum, setKurum] = useState<Kurum | null>(null);
  const [degisiyor, setDegisiyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    let iptalEdildi = false;
    kurumGetir(id)
      .then((k) => {
        if (!iptalEdildi) setKurum(k);
      })
      .catch(() => {
        // Başlık varsayılanda kalır; liste kendi hatasını gösterir.
      });
    return () => {
      iptalEdildi = true;
    };
  }, [id]);

  const ozelligiAyarla = async (ad: string, acik: boolean) => {
    setDegisiyor(true);
    setHata(null);
    try {
      setKurum(await kurumOzelligiAyarla(id, ad, acik));
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
    } finally {
      setDegisiyor(false);
    }
  };

  return (
    <Ekran>
      <Stack.Screen options={{ title: kurum?.ad ?? 'Kurum' }} />

      {/* Özellikler müşteri (ana kurum) düzeyindedir; alt birimde gösterilmez. */}
      {kurum && kurum.ust_kurum_id === null ? (
        <Kart>
          <Text style={tema.yazi.bolum}>Özellikler</Text>
          <OnayKutusu
            etiket="Uygulamadan başvuru (öğrenci ön kaydı, öğretmen başvurusu)"
            secili={ozellikAcik(kurum, 'basvuru')}
            onDegis={(acik) => ozelligiAyarla('basvuru', acik)}
            pasif={degisiyor}
          />
          <Text style={tema.yazi.kucuk}>
            Açıkken giriş ekranlarında başvuru bağlantısı çıkar ve giriş yapmamış kişiler bu kuruma başvuru gönderebilir;
            yöneticiler Menü &gt; Başvurular&apos;dan onaylar.
          </Text>
          <OnayKutusu
            etiket="İçerik takibi (kademe, ders/konu, ezber, kitap)"
            secili={ozellikAcik(kurum, 'icerik_takibi')}
            onDegis={(acik) => ozelligiAyarla('icerik_takibi', acik)}
            pasif={degisiyor}
          />
          <Text style={tema.yazi.kucuk}>
            Açıkken yöneticide Menü &gt; Kademeler, sınıf ekranlarında Dersler / Ezber / Kitap çıkar; veli çocuğunun ezber
            ve kitap ilerlemesini görür.
          </Text>
          <HataMesaji mesaj={hata} />
        </Kart>
      ) : null}

      <PersonelListesi kurumId={id} />
    </Ekran>
  );
}
