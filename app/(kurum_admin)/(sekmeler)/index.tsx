// Erişim: yalnızca kurum_admin. Açılış ekranı: kurumun özeti (altındaki tüm birimler dahil; RLS
// belirler) ve doğrudan altındaki birimlerin kırılımı. Kurum yeni açıldıysa ilk adımları gösterir.
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { HataMesaji } from '@/components/HataMesaji';
import { Ikon } from '@/components/Ikon';
import { Kart } from '@/components/Kart';
import { ListeSatiri } from '@/components/ListeSatiri';
import { MetrikKarti } from '@/components/MetrikKarti';
import { Yukleniyor } from '@/components/Yukleniyor';
import { yuzdeMetni } from '@/lib/katilim';
import { useOturum } from '@/lib/oturum';
import { useOzellik } from '@/lib/ozellikler';
import { type YoneticiOzeti, yoneticiOzetiniGetir } from '@/lib/ozet';
import { seviyeAdiCogul } from '@/lib/seviye';
import { type Tema, useTema } from '@/lib/tema';

export default function KurumAdminOzet() {
  const router = useRouter();
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const { kurum } = useOturum();
  const basvuruAcik = useOzellik('basvuru');
  const [ozet, setOzet] = useState<YoneticiOzeti | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [yenileniyor, setYenileniyor] = useState(false);

  const kurumId = kurum?.id;

  const yenile = useCallback(async () => {
    if (!kurumId) return;
    setHata(null);
    try {
      setOzet(await yoneticiOzetiniGetir(basvuruAcik, kurumId));
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Özet alınamadı.');
    }
  }, [basvuruAcik, kurumId]);

  useFocusEffect(
    useCallback(() => {
      yenile();
    }, [yenile]),
  );

  const elleYenile = async () => {
    setYenileniyor(true);
    await yenile();
    setYenileniyor(false);
  };

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
    <Ekran>
      <ScrollView
        style={styles.kaydirma}
        contentContainerStyle={styles.icerik}
        refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={elleYenile} tintColor={tema.renkler.anaParlak} />}
      >
        {kurum ? <Text style={tema.yazi.bolum}>{kurum.ad}</Text> : null}
        <HataMesaji mesaj={hata} />
        {!ozet && !hata ? <Yukleniyor /> : null}

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

            <View style={styles.metrikler}>
              <MetrikKarti deger={ozet.ogrenciSayisi} etiket="Öğrenci" ikon="people-outline" />
              <MetrikKarti deger={ozet.sinifSayisi} etiket="Sınıf" ikon="school-outline" />
            </View>
            <View style={styles.metrikler}>
              <MetrikKarti deger={ozet.ogretmenSayisi} etiket="Öğretmen" ikon="person-outline" />
              <MetrikKarti
                deger={yuzdeMetni(ozet.haftalikKatilim)}
                etiket="Bu haftaki katılım"
                ikon="stats-chart-outline"
                renk={tema.katilimRengi(ozet.haftalikKatilim).renk}
              />
            </View>

            <Kart>
              <Text style={tema.yazi.bolum}>Bugünkü yoklama</Text>
              {ozet.bugunDersiOlanSinifSayisi === 0 ? (
                <Text style={tema.yazi.kucuk}>
                  Bugün ders günü olan sınıf yok. Ders günleri sınıfın programından ya da öğretmenin belirlediği günlerden
                  gelir.
                </Text>
              ) : ozet.yoklamasiAlinmayanSiniflar.length === 0 ? (
                <View style={styles.satir}>
                  <Ikon ad="checkmark-circle" boyut={22} renk={tema.renkler.basari} />
                  <Text style={styles.satirMetni}>
                    Bugün dersi olan {ozet.bugunDersiOlanSinifSayisi} sınıfın yoklaması alındı.
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.satir}>
                    <Ikon ad="alert-circle" boyut={22} renk={tema.renkler.uyari} />
                    <Text style={styles.satirMetni}>
                      {ozet.yoklamasiAlinmayanSiniflar.length} sınıfın yoklaması henüz alınmadı.
                    </Text>
                  </View>
                  {ozet.yoklamasiAlinmayanSiniflar.map((s) => (
                    <ListeSatiri key={s.id} baslik={s.ad} onPress={() => router.push(`/sinif-katilim/${s.id}`)} />
                  ))}
                </>
              )}
            </Kart>

            {kurum && ozet.altBirimler.length > 0 ? (
              <Kart>
                <Text style={tema.yazi.bolum}>{seviyeAdiCogul(kurum.seviye + 1)}</Text>
                {ozet.altBirimler.map((b) => (
                  <ListeSatiri
                    key={b.id}
                    baslik={b.ad}
                    altBaslik={`${b.ogrenciSayisi} öğrenci · bu hafta ${yuzdeMetni(b.haftalikKatilim)}`}
                    onPress={() => router.push(`/sube/${b.id}`)}
                  />
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
      </ScrollView>
    </Ekran>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    kaydirma: {
      flex: 1,
    },
    icerik: {
      gap: t.bosluk.m,
      paddingBottom: t.bosluk.l,
    },
    metrikler: {
      flexDirection: 'row',
      gap: t.bosluk.m,
    },
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
