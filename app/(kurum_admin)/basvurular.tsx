// Erişim: yalnızca kurum_admin. Yönettiği kurumlara (ana kurum yöneticisinde şubeler dahil)
// uygulamadan gelen öğrenci ön kayıt ve personel başvuruları; bekleyenler üstte.
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { Ekran } from '@/components/Ekran';
import { Ikon } from '@/components/Ikon';
import { Liste } from '@/components/Liste';
import { ListeSatiri } from '@/components/ListeSatiri';
import { Rozet } from '@/components/Rozet';
import { BASVURU_DURUMU_ETIKETLERI, BASVURU_TURU_ETIKETLERI, basvurulariGetir } from '@/lib/basvurular';
import { etkinlikZamaniniParcala } from '@/lib/duyurular';
import { tarihiBicimle } from '@/lib/tarih';
import { useTema } from '@/lib/tema';
import type { Basvuru } from '@/lib/tipler';

export default function Basvurular() {
  const router = useRouter();
  const tema = useTema();
  const [basvurular, setBasvurular] = useState<Basvuru[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let iptalEdildi = false;
      setHata(null);
      basvurulariGetir()
        .then((veri) => {
          if (!iptalEdildi) setBasvurular(veri);
        })
        .catch((e: Error) => {
          if (!iptalEdildi) setHata(e.message);
        });
      return () => {
        iptalEdildi = true;
      };
    }, []),
  );

  const rozet = (b: Basvuru) => {
    const r = tema.renkler;
    if (b.durum === 'bekliyor') return <Rozet metin={BASVURU_DURUMU_ETIKETLERI.bekliyor} ikon="time-outline" renk={r.uyari} zemin={r.uyariSoluk} />;
    if (b.durum === 'onaylandi') return <Rozet metin={BASVURU_DURUMU_ETIKETLERI.onaylandi} ikon="checkmark-circle" renk={r.basari} zemin={r.basariSoluk} />;
    return <Rozet metin={BASVURU_DURUMU_ETIKETLERI.reddedildi} ikon="close-circle" renk={r.hata} zemin={r.hataSoluk} />;
  };

  return (
    <Ekran>
      <Stack.Screen options={{ title: 'Başvurular' }} />
      <Liste
        veri={basvurular}
        hata={hata}
        anahtar={(b) => b.id}
        bosIkon="mail-open-outline"
        bosBaslik="Henüz başvuru yok"
        bosAciklama="Veliler ve öğretmen adayları giriş ekranındaki başvuru bağlantısından başvurabilir."
        satir={(b) => (
          <ListeSatiri
            baslik={b.ad_soyad}
            altBaslik={`${BASVURU_TURU_ETIKETLERI[b.tur]} · ${tarihiBicimle(etkinlikZamaniniParcala(b.olusturma_tarihi).tarih)}`}
            sol={<Ikon ad={b.tur === 'ogrenci' ? 'school-outline' : 'person-outline'} boyut={26} renk={tema.renkler.anaParlak} />}
            sag={rozet(b)}
            onPress={() => router.push(`/basvuru/${b.id}`)}
          />
        )}
      />
    </Ekran>
  );
}
