// Erişim: yalnızca kurum_admin. Roller sabittir (yönetici, öğretmen, veli); burada her rolün ne
// yaptığı ve — öğretmen ile veli için — hangi bölümleri gördüğü yer alır. Bölümleri yalnızca
// kök kurumun (müşterinin) yöneticisi açıp kapatır (RLS de bunu zorlar); şube yöneticisi salt okunur görür.
import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Ekran } from '@/components/Ekran';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { OnayKutusu } from '@/components/OnayKutusu';
import { Rozet } from '@/components/Rozet';
import { Yukleniyor } from '@/components/Yukleniyor';
import { bolumGorunurlugunuAyarla, kapaliBolumleriGetir, type KapaliBolum, rolSayilariniGetir } from '@/lib/bolumler';
import { AYARLANABILIR_BOLUMLER, type AyarlanabilirRol, ROL_ETIKETLERI } from '@/lib/menu';
import { useOturum } from '@/lib/oturum';
import { type Tema, useTema } from '@/lib/tema';

type Sayilar = Awaited<ReturnType<typeof rolSayilariniGetir>>;

const ROL_ACIKLAMALARI: Record<'kurum_admin' | AyarlanabilirRol, string> = {
  kurum_admin:
    'Sınıfları, öğrencileri ve personeli yönetir. Ana kurumun yöneticisi şubeleri de yönetir. Yöneticinin bölümleri kapatılamaz.',
  ogretmen: 'Yalnızca atandığı sınıfları ve o sınıfların öğrencilerini görür.',
  veli: 'Yalnızca kendi çocuğunun kayıtlarını görür.',
};

const AYARLANABILIR_ROLLER: AyarlanabilirRol[] = ['ogretmen', 'veli'];

export default function Roller() {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const { kurum, kokKurum } = useOturum();
  const kokKurumMu = kurum !== null && kurum.ust_kurum_id === null;
  const kokKurumId = kokKurum?.id;

  const [sayilar, setSayilar] = useState<Sayilar | null>(null);
  const [kapalilar, setKapalilar] = useState<KapaliBolum[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [degisen, setDegisen] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!kokKurumId) return;
      let iptalEdildi = false;
      setHata(null);
      Promise.all([rolSayilariniGetir(), kapaliBolumleriGetir(kokKurumId)])
        .then(([s, k]) => {
          if (iptalEdildi) return;
          setSayilar(s);
          setKapalilar(k);
        })
        .catch((e: Error) => {
          if (!iptalEdildi) setHata(e.message);
        });
      return () => {
        iptalEdildi = true;
      };
    }, [kokKurumId]),
  );

  const degistir = async (rol: AyarlanabilirRol, anahtar: string, acik: boolean) => {
    if (!kokKurumId) return;
    setDegisen(`${rol}:${anahtar}`);
    setHata(null);
    try {
      await bolumGorunurlugunuAyarla(kokKurumId, rol, anahtar, acik);
      setKapalilar((mevcut) => {
        const digerleri = (mevcut ?? []).filter((k) => !(k.rol === rol && k.anahtar === anahtar));
        return acik ? digerleri : [...digerleri, { rol, anahtar }];
      });
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
    } finally {
      setDegisen(null);
    }
  };

  const baslik = (rol: 'kurum_admin' | AyarlanabilirRol) => (
    <View style={styles.baslik}>
      <Text style={tema.yazi.bolum}>{ROL_ETIKETLERI[rol]}</Text>
      {sayilar ? <Rozet metin={`${sayilar[rol]} kişi`} renk={tema.renkler.ana} zemin={tema.renkler.anaSoluk} /> : null}
    </View>
  );

  return (
    <Ekran kaydirilabilir>
      <Stack.Screen options={{ title: 'Roller ve Yetkiler' }} />

      <HataMesaji mesaj={hata} />
      {!kapalilar && !hata ? <Yukleniyor /> : null}

      <Kart>
        {baslik('kurum_admin')}
        <Text style={tema.yazi.kucuk}>{ROL_ACIKLAMALARI.kurum_admin}</Text>
      </Kart>

      {kapalilar
        ? AYARLANABILIR_ROLLER.map((rol) => (
            <Kart key={rol}>
              {baslik(rol)}
              <Text style={tema.yazi.kucuk}>{ROL_ACIKLAMALARI[rol]}</Text>
              <Text style={styles.altBaslik}>Gördüğü bölümler</Text>
              {AYARLANABILIR_BOLUMLER[rol].map((b) => (
                <View key={b.anahtar} style={styles.bolum}>
                  <OnayKutusu
                    etiket={b.etiket}
                    secili={!kapalilar.some((k) => k.rol === rol && k.anahtar === b.anahtar)}
                    calisiyor={degisen === `${rol}:${b.anahtar}`}
                    pasif={!kokKurumMu || degisen !== null}
                    onDegis={(acik) => degistir(rol, b.anahtar, acik)}
                  />
                  <Text style={tema.yazi.kucuk}>{b.aciklama}</Text>
                </View>
              ))}
            </Kart>
          ))
        : null}

      <Text style={tema.yazi.kucuk}>
        {kokKurumMu
          ? 'Kapattığınız bölüm o roldeki herkesin uygulamasında gizlenir (şubeler dahil); değişiklik kişinin bir sonraki girişinde görünür. Bu ayar yalnızca ekranları gizler: kimin hangi veriye erişebildiği role bağlıdır ve buradan değişmez. Bildirimler bu ayardan etkilenmez.'
          : 'Bu ayarları yalnızca ana kurumun yöneticisi değiştirebilir.'}
      </Text>
    </Ekran>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    baslik: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: t.bosluk.m,
    },
    altBaslik: {
      ...t.yazi.etiket,
    },
    bolum: {
      gap: t.bosluk.xs,
    },
  });
}
