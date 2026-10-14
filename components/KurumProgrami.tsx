// Yöneticinin "herkesin programı" görünümü: yönettiği birim ve altındaki tüm sınıfların dersleri,
// sınıf, birim ve hoca adıyla. Birim ve hoca süzgeci; web'de haftalık ızgara (gün sütunları),
// telefonda gün seçimi. Salt okunur: program sınıf ekranından düzenlenir; derse dokununca o sınıfın
// programı açılır. Erişim: yalnızca kurum_admin (RLS; genel merkez yöneticisi tüm ağacı görür).
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BosDurum } from '@/components/BosDurum';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { Secenekler } from '@/components/Secenekler';
import { Secim } from '@/components/Secim';
import { Yukleniyor } from '@/components/Yukleniyor';
import { type ProgramSatiri, saatiKisalt, tumProgramiGetir } from '@/lib/dersProgrami';
import { birimSecenekleri, kurumAdlariniGetir, type KurumOzeti, kurumYolu } from '@/lib/kurumlar';
import { useOturum } from '@/lib/oturum';
import { bugununTarihi, GUN_ADLARI, GUN_KISA_ADLARI, isoGun } from '@/lib/tarih';
import { type Tema, useTema } from '@/lib/tema';

const GUN_SECENEKLERI = GUN_KISA_ADLARI.map((etiket, i) => ({ deger: String(i + 1), etiket }));

export function KurumProgrami() {
  const router = useRouter();
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const { kurum, kokKurum } = useOturum();
  const web = tema.duzen === 'web';
  const [dersler, setDersler] = useState<ProgramSatiri[] | null>(null);
  const [kurumlar, setKurumlar] = useState<KurumOzeti[]>([]);
  const [hata, setHata] = useState<string | null>(null);
  const [birimId, setBirimId] = useState<string | null>(null);
  const [hocaId, setHocaId] = useState<string | null>(null);
  const [gun, setGun] = useState(() => String(isoGun(bugununTarihi())));

  useFocusEffect(
    useCallback(() => {
      let iptalEdildi = false;
      setHata(null);
      tumProgramiGetir()
        .then((veri) => {
          if (!iptalEdildi) setDersler(veri);
        })
        .catch((e: Error) => {
          if (!iptalEdildi) setHata(e.message);
        });
      // Birim adları okunamazsa birim süzgeci ve yolu gösterilmez.
      kurumAdlariniGetir()
        .then((veri) => {
          if (!iptalEdildi) setKurumlar(veri);
        })
        .catch(() => {});
      return () => {
        iptalEdildi = true;
      };
    }, []),
  );

  const birimAdi = useCallback(
    (kurumId: string) => kurumYolu(kurumlar, kurumId, kokKurum?.id) || (kurumlar.find((k) => k.id === kurumId)?.ad ?? ''),
    [kurumlar, kokKurum?.id],
  );

  const hocalar = useMemo(() => {
    const harita = new Map<string, string>();
    for (const d of dersler ?? []) for (const h of d.hocalar) harita.set(h.id, h.ad_soyad);
    return [...harita].map(([deger, etiket]) => ({ deger, etiket })).sort((a, b) => a.etiket.localeCompare(b.etiket, 'tr'));
  }, [dersler]);

  const suzulmus = (dersler ?? []).filter(
    (d) =>
      (!birimId || kurumlar.find((k) => k.id === d.kurum_id)?.yol.includes(birimId)) &&
      (!hocaId || d.hocalar.some((h) => h.id === hocaId)),
  );
  const gununDersleri = (g: number) =>
    suzulmus.filter((d) => d.gun === g).sort((a, b) => a.baslangic_saati.localeCompare(b.baslangic_saati));

  const birimler = kurum ? birimSecenekleri(kurumlar, kurum.id) : [];

  const dersKarti = (d: ProgramSatiri, sikisik: boolean) => (
    <Pressable
      key={d.id}
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/ders-programi/[sinifId]', params: { sinifId: d.sinif_id } })}
      style={({ pressed }) => [sikisik ? styles.hucreDers : styles.ders, pressed && styles.basili]}
    >
      <Text style={styles.saat}>
        {saatiKisalt(d.baslangic_saati)}–{saatiKisalt(d.bitis_saati)}
      </Text>
      <View style={styles.metinler}>
        <Text style={tema.yazi.govde} numberOfLines={sikisik ? 2 : undefined}>
          {d.ders_adi}
        </Text>
        <Text style={tema.yazi.kucuk} numberOfLines={sikisik ? 2 : undefined}>
          {[d.sinif_adi, d.hocalar.map((h) => h.ad_soyad).join(', ') || null].filter(Boolean).join(' · ')}
        </Text>
        {birimler.length > 1 ? (
          <Text style={tema.yazi.kucuk} numberOfLines={1}>
            {birimAdi(d.kurum_id)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );

  return (
    <View style={styles.kapsayici}>
      <View style={styles.suzgecler}>
        {birimler.length > 1 ? (
          <View style={styles.suzgec}>
            <Secim etiket="Birim" secenekler={birimler} secili={birimId} onSec={setBirimId} bosEtiket="Tümü" />
          </View>
        ) : null}
        {hocalar.length > 0 ? (
          <View style={styles.suzgec}>
            <Secim etiket="Hoca" secenekler={hocalar} secili={hocaId} onSec={setHocaId} bosEtiket="Tümü" />
          </View>
        ) : null}
      </View>
      {web ? null : <Secenekler secenekler={GUN_SECENEKLERI} secili={gun} onSec={setGun} />}
      <HataMesaji mesaj={hata} />
      {!dersler && !hata ? <Yukleniyor /> : null}

      {dersler && dersler.length === 0 ? (
        <BosDurum ikon="calendar-outline" baslik="Ders programı yok" aciklama="Program sınıf ekranından girilir." />
      ) : null}

      {dersler && dersler.length > 0 && web ? (
        <ScrollView horizontal style={styles.kaydirma} contentContainerStyle={styles.izgara}>
          {GUN_ADLARI.map((ad, i) => {
            const liste = gununDersleri(i + 1);
            return (
              <View key={ad} style={styles.sutun}>
                <Text style={[tema.yazi.etiket, styles.sutunBasligi]}>
                  {ad} · {liste.length}
                </Text>
                <ScrollView contentContainerStyle={styles.sutunIcerigi}>
                  {liste.length === 0 ? <Text style={tema.yazi.kucuk}>Ders yok</Text> : liste.map((d) => dersKarti(d, true))}
                </ScrollView>
              </View>
            );
          })}
        </ScrollView>
      ) : null}

      {dersler && dersler.length > 0 && !web ? (
        <ScrollView style={styles.kaydirma} contentContainerStyle={styles.icerik}>
          {gununDersleri(Number(gun)).length === 0 ? (
            <BosDurum ikon="calendar-outline" baslik={`${GUN_ADLARI[Number(gun) - 1]} günü ders yok`} />
          ) : (
            <Kart>{gununDersleri(Number(gun)).map((d) => dersKarti(d, false))}</Kart>
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    kapsayici: {
      flex: 1,
      gap: t.bosluk.m,
    },
    suzgecler: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: t.bosluk.m,
    },
    suzgec: {
      flexBasis: 240,
      flexGrow: t.duzen === 'web' ? 0 : 1,
    },
    kaydirma: {
      flex: 1,
    },
    icerik: {
      gap: t.bosluk.m,
      paddingBottom: t.bosluk.l,
    },
    izgara: {
      flexGrow: 1,
      gap: t.bosluk.s,
      paddingBottom: t.bosluk.l,
    },
    sutun: {
      flex: 1,
      minWidth: 150,
      borderWidth: 1,
      borderColor: t.renkler.ayirici,
      borderRadius: t.yaricap.l,
      backgroundColor: t.renkler.yuzey,
      overflow: 'hidden',
    },
    sutunBasligi: {
      paddingHorizontal: t.bosluk.m,
      paddingVertical: t.bosluk.s,
      backgroundColor: t.renkler.vurguSoluk,
    },
    sutunIcerigi: {
      gap: t.bosluk.s,
      padding: t.bosluk.s,
    },
    ders: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.m,
      minHeight: t.dokunmaAlani.normal,
      paddingVertical: t.bosluk.xs,
    },
    hucreDers: {
      gap: t.bosluk.xs,
      padding: t.bosluk.s,
      borderRadius: t.yaricap.m,
      backgroundColor: t.renkler.zemin,
    },
    saat: {
      ...t.yazi.govde,
      fontFamily: t.yaziTipi.yariKalin,
      fontVariant: ['tabular-nums'],
      minWidth: t.duzen === 'web' ? undefined : 96,
    },
    metinler: {
      flexShrink: 1,
      minWidth: 0,
    },
    basili: {
      opacity: 0.7,
    },
  });
}
