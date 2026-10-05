// Erişim: auth hesabı olup `kullanici` satırı olmayan herkes (bkz. lib/oturum.tsx, durum: profil_yok).
import { BosDurum } from '@/components/BosDurum';
import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { useOturum } from '@/lib/oturum';

export default function ProfilYok() {
  const { cikisYap, hataMesaji } = useOturum();

  return (
    <Ekran baslikCubugusuz ortala>
      <BosDurum
        ikon="person-circle-outline"
        baslik="Hesabınıza erişilemiyor"
        aciklama={hataMesaji ?? 'Bu hesap sisteme kayıtlı değil. Lütfen kurumunuzun yöneticisiyle iletişime geçin.'}
      >
        <Buton tur="ikincil" ikon="log-out-outline" baslik="Çıkış Yap" onPress={cikisYap} />
      </BosDurum>
    </Ekran>
  );
}
