// Tanımlı rol formu (yeni ya da düzenleme; veride `gorev`). Tanımlı rol = ad + dayandığı sistem rolü +
// açıklama; menüleri Roller panelinde (components/RolMenuleri) ayarlanır. Dayandığı rol yalnızca
// yeni kayıtta seçilir.
// Erişim: yalnızca kök kurumun (genel merkezin) yöneticisi yazar (RLS); `saltOkunur` iken alt
// birim yöneticisi tanımı yalnızca görür.
import { type ReactNode, useState } from 'react';
import { Text } from 'react-native';

import { Buton } from '@/components/Buton';
import { Girdi } from '@/components/Girdi';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { OnayButonu } from '@/components/OnayButonu';
import { Secenekler } from '@/components/Secenekler';
import { gorevEkle, gorevGuncelle, gorevSil, type GorevTemelRolu, TEMEL_ROL_ETIKETLERI } from '@/lib/gorevler';
import { useTema } from '@/lib/tema';
import type { Gorev } from '@/lib/tipler';
import { useToast } from '@/lib/toast';

const mesajaCevir = (e: unknown) => (e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');

const TEMEL_ROL_SECENEKLERI: { deger: GorevTemelRolu; etiket: string }[] = [
  { deger: 'kurum_admin', etiket: TEMEL_ROL_ETIKETLERI.kurum_admin },
  { deger: 'ogretmen', etiket: TEMEL_ROL_ETIKETLERI.ogretmen },
];

const TEMEL_ROL_ACIKLAMALARI: Record<GorevTemelRolu, string> = {
  kurum_admin: 'Bağlı olduğu birimin ve altındaki birimlerin verisini yönetir.',
  ogretmen: 'Yalnızca atandığı sınıfları ve o sınıfların öğrencilerini görür.',
};

type Props = {
  // Yeni rolde null.
  gorev: Gorev | null;
  kokKurumId: string;
  saltOkunur: boolean;
  onKaydedildi: () => void;
  onSilindi: () => void;
  // Form ile silme kartı arasında gösterilir (Roller panelinde rolün menüleri).
  children?: ReactNode;
};

export function GorevFormu({ gorev, kokKurumId, saltOkunur, onKaydedildi, onSilindi, children }: Props) {
  const tema = useTema();
  const toast = useToast();
  const [ad, setAd] = useState(gorev?.ad ?? '');
  const [aciklama, setAciklama] = useState(gorev?.aciklama ?? '');
  const [temelRol, setTemelRol] = useState<GorevTemelRolu>((gorev?.temel_rol as GorevTemelRolu | undefined) ?? 'kurum_admin');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [silmeHatasi, setSilmeHatasi] = useState<string | null>(null);

  const kaydet = async () => {
    setGonderiliyor(true);
    setHata(null);
    try {
      if (gorev) await gorevGuncelle(gorev.id, { ad, aciklama });
      else await gorevEkle(kokKurumId, { ad, temelRol, aciklama });
      toast(gorev ? 'Rol kaydedildi' : 'Rol tanımlandı');
      onKaydedildi();
    } catch (e) {
      setHata(mesajaCevir(e));
    } finally {
      setGonderiliyor(false);
    }
  };

  const sil = async () => {
    if (!gorev) return;
    setSilmeHatasi(null);
    try {
      await gorevSil(gorev.id);
      toast('Rol silindi');
      onSilindi();
    } catch (e) {
      setSilmeHatasi(mesajaCevir(e));
    }
  };

  return (
    <>
      <Kart>
        <Girdi
          etiket="Rol adı"
          placeholder="örn. İstişare üyesi"
          value={ad}
          onChangeText={setAd}
          editable={!saltOkunur && !gonderiliyor}
          maxLength={40}
        />
        {gorev ? (
          <Girdi etiket="Dayandığı rol (değiştirilemez)" value={TEMEL_ROL_ETIKETLERI[temelRol]} editable={false} />
        ) : (
          <Secenekler etiket="Dayandığı rol" secenekler={TEMEL_ROL_SECENEKLERI} secili={temelRol} onSec={setTemelRol} pasif={gonderiliyor} />
        )}
        <Text style={tema.yazi.kucuk}>
          {TEMEL_ROL_ACIKLAMALARI[temelRol]} Tanımlı rol bu yetkiyi değiştirmez; kişinin unvanını ve hangi menüleri
          gördüğünü belirler.
        </Text>
        <Girdi
          etiket="Açıklama (isteğe bağlı)"
          value={aciklama}
          onChangeText={setAciklama}
          editable={!saltOkunur && !gonderiliyor}
          maxLength={300}
          multiline
        />
        <HataMesaji mesaj={hata} />
        {saltOkunur ? (
          <Text style={tema.yazi.kucuk}>Rolleri yalnızca ana kurumun yöneticisi değiştirebilir.</Text>
        ) : (
          <Buton baslik={gorev ? 'Kaydet' : 'Rolü Tanımla'} onPress={kaydet} yukleniyor={gonderiliyor} />
        )}
      </Kart>

      {children}

      {gorev && !saltOkunur ? (
        <Kart>
          <Text style={tema.yazi.kucuk}>
            Bu rolde kişiler varken rol silinemez; önce Kullanıcılar ekranından rollerini değiştirin.
          </Text>
          <HataMesaji mesaj={silmeHatasi} />
          <OnayButonu etiket="Rolü Sil" onOnay={sil} />
        </Kart>
      ) : null}
    </>
  );
}
