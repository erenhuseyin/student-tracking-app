// Erişim: yalnızca kurum_admin. Açılış ekranı: pano (components/Pano) — yönetici tüm kurumun ya da
// seçtiği birimin toplamlarını görür. Altındaki kartlar yöneticinin KENDİ kapsamına aittir (RLS):
// yeni kurumda ilk adımlar, bugün yoklaması alınmamış sınıflar (adlarıyla), bekleyen başvurular.
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Buton } from '@/components/Buton';
import { HataMesaji } from '@/components/HataMesaji';
import { Ikon } from '@/components/Ikon';
import { Kart } from '@/components/Kart';
import { ListeSatiri } from '@/components/ListeSatiri';
import { Pano } from '@/components/Pano';
import { useOturum } from '@/lib/oturum';
import { useOzellik } from '@/lib/ozellikler';
import { type YoneticiOzeti, yoneticiOzetiniGetir } from '@/lib/ozet';
import { type Tema, useTema } from '@/lib/tema';

export default function KurumAdminOzet() {
  const router = useRouter();
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const { kurum } = useOturum();
  const basvuruAcik = useOzellik('basvuru');
  const [ozet, setOzet] = useState<YoneticiOzeti | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let iptalEdildi = false;
      setHata(null);
      yoneticiOzetiniGetir(basvuruAcik)
        .then((veri) => {
          if (!iptalEdildi) setOzet(veri);
        })
        .catch((e: Error) => {
          if (!iptalEdildi) setHata(e.message);
        });
      return () => {
        iptalEdildi = true;
      };
    }, [basvuruAcik]),
  );

  // Yeni kurum: sırayla sınıf, öğrenci, öğretmen. Üçü de tamamlanınca rehber kaybolur.
  const adimlar = ozet
    ? [
        { tamam: ozet.sinifSayisi > 0, metin: 'İlk sınıfı ekleyin', rota: '/siniflar' as const },
        { tamam: ozet.ogrenciSayisi > 0, metin: 'Sınıfa öğrenci ekleyin', rota: '/siniflar' as const },
        { tamam: ozet.ogretmenSayisi > 0, metin: 'Öğretmen davet edip sınıfa atayın', rota: '/personel' as const },
      ]
    : [];
  const kurulumBitti = adimlar.every((a) => a.tamam);

  return (
    <Pano
      alt={
        <>
          <HataMesaji mesaj={hata} />
          {ozet ? (
            <>
              {kurulumBitti ? null : (
                <Kart>
                  <Text style={tema.yazi.bolum}>Başlarken</Text>
                  {adimlar.map((a) => (
                    <ListeSatiri
                      key={a.metin}
                      baslik={a.metin}
                      sol={
                        <Ikon
                          ad={a.tamam ? 'checkmark-circle' : 'ellipse-outline'}
                          boyut={24}
                          renk={a.tamam ? tema.renkler.basari : tema.renkler.metinIkincil}
                        />
                      }
                      onPress={a.tamam ? undefined : () => router.push(a.rota)}
                    />
                  ))}
                </Kart>
              )}

              {ozet.yoklamasiAlinmayanSiniflar.length > 0 ? (
                <Kart>
                  <Text style={tema.yazi.bolum}>{kurum ? `${kurum.ad}: bugün yoklaması alınmayanlar` : 'Bugün yoklaması alınmayanlar'}</Text>
                  <View style={styles.satir}>
                    <Ikon ad="alert-circle" boyut={22} renk={tema.renkler.uyari} />
                    <Text style={styles.satirMetni}>
                      Bugün dersi olan {ozet.bugunDersiOlanSinifSayisi} sınıftan {ozet.yoklamasiAlinmayanSiniflar.length}
                      &apos;inin yoklaması henüz alınmadı.
                    </Text>
                  </View>
                  {ozet.yoklamasiAlinmayanSiniflar.map((s) => (
                    <ListeSatiri key={s.id} baslik={s.ad} onPress={() => router.push(`/sinif-katilim/${s.id}`)} />
                  ))}
                </Kart>
              ) : null}

              {basvuruAcik && ozet.bekleyenBasvuruSayisi > 0 ? (
                <Buton
                  tur="ikincil"
                  ikon="mail-unread-outline"
                  baslik={`${ozet.bekleyenBasvuruSayisi} bekleyen başvuru`}
                  onPress={() => router.push('/basvurular')}
                />
              ) : null}
            </>
          ) : null}
        </>
      }
    />
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    satir: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.s,
    },
    satirMetni: {
      ...t.yazi.govde,
      flex: 1,
    },
  });
}
