// Erişim: hesabı başka bir müşterinin uygulamasına ait olan herkes (bkz. lib/oturum.tsx,
// durum: yanlis_uygulama). Süper admin bu ekrana düşmez.
import { BosDurum } from '@/components/BosDurum';
import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { marka } from '@/lib/marka';
import { useOturum } from '@/lib/oturum';

export default function YanlisUygulama() {
  const { cikisYap } = useOturum();

  return (
    <Ekran baslikCubugusuz ortala>
      <BosDurum
        ikon="swap-horizontal-outline"
        baslik="Bu hesap bu uygulamaya ait değil"
        aciklama={`Hesabınız ${marka.ad} uygulamasına kayıtlı değil. Lütfen kurumunuzun kendi uygulamasını kullanın.`}
      >
        <Buton tur="ikincil" ikon="log-out-outline" baslik="Çıkış Yap" onPress={cikisYap} />
      </BosDurum>
    </Ekran>
  );
}
