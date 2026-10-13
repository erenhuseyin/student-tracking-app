// 'web' düzeninin kalıcı kenar çubuğu (bkz. components/WebKabuk): rolün TÜM bölümleri — telefondaki
// sekmeler ve Menü ekranının satırları — tek listede; altta kullanıcı (profil), tema ve çıkış.
// Öğeler lib/menu.ts'ten gelir, yani bölüm kapatma ve menü yetkisi süzgeçleri telefondakiyle aynıdır.
// 768-1023 px arasında daralır (yalnızca ikon).
import { type Href, usePathname, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Ikon, type IkonAdi } from '@/components/Ikon';
import { MarkaLogosu, markaLogosuVar } from '@/components/MarkaLogosu';
import { marka } from '@/lib/marka';
import { rolEtiketi, rolYolu, useMenu } from '@/lib/menu';
import { useOturum } from '@/lib/oturum';
import { type Tema, useKirilma, useTema } from '@/lib/tema';
import { type TemaTercihi, useTemaTercihi } from '@/lib/temaTercihi';

const TEMALAR: { deger: TemaTercihi; etiket: string; ikon: IkonAdi }[] = [
  { deger: 'sistem', etiket: 'Sistem teması', ikon: 'desktop-outline' },
  { deger: 'acik', etiket: 'Açık tema', ikon: 'sunny-outline' },
  { deger: 'karanlik', etiket: 'Karanlık tema', ikon: 'moon-outline' },
];

type Vurgu = { hovered?: boolean; pressed: boolean };

// Bölümün detay ekranları (öğe anahtarı -> adres önekleri): detaydayken de bölüm seçili görünür.
const ALT_ROTALAR: Record<string, string[]> = {
  siniflar: ['/sinif', '/yeni-sinif', '/sinif-duzenle', '/sinif-katilim', '/toplu-ogrenci', '/yeni-ogrenci', '/ogrenci-duzenle'],
  personel: ['/yeni-personel'],
  duyurular: ['/yeni-duyuru', '/duyuru-duzenle'],
  subeler: ['/sube', '/yeni-sube', '/sube-duzenle', '/sube-personel'],
  basvurular: ['/basvuru'],
  kademeler: ['/kademe', '/ezber-listesi'],
  siniflarim: ['/sinifim', '/yoklama', '/haftalik-yoklama', '/ders-gunleri', '/ogrenci-gelisim', '/yeni-gelisim-kaydi', '/gelisim-kaydi-duzenle'],
  cocuklarim: ['/cocuk', '/devamsizlik-bildir'],
  kurumlar: ['/kurum', '/yeni-kurum'],
};

export function Sidebar() {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const dar = useKirilma() === 'tablet';
  const router = useRouter();
  const yol = usePathname();
  const { kullanici, kurum, gorev, cikisYap } = useOturum();
  const { sekmeler, menuSatirlari } = useMenu();
  const { tercih, tercihiAyarla } = useTemaTercihi();
  const [cikisSoruluyor, setCikisSoruluyor] = useState(false);

  // Telefondaki "Menü" sekmesinin web'de karşılığı yoktur: satırları zaten bu çubuktadır.
  const ustOgeler = sekmeler
    .filter((s) => s.gorunur && s.anahtar !== 'menu')
    .map((s) => ({ anahtar: s.anahtar, etiket: s.etiket, ikon: s.ikon, href: (s.sekme === 'index' ? '/' : `/${s.sekme}`) as Href }));
  const altOgeler = menuSatirlari.map((m) => ({ anahtar: m.anahtar, etiket: m.etiket, ikon: m.ikon, href: m.rota }));

  const git = (href: Href) => {
    // Bir bölümden diğerine geçerken açık detay ekranları kapanır: "geri" bir önceki bölüme değil,
    // bölümün kendi içindeki üst ekrana götürmelidir.
    if (router.canDismiss()) router.dismissAll();
    // Adres kullanıcının rol grubuna sabitlenir (aynı adres başka rol gruplarında da var).
    router.navigate(kullanici && typeof href === 'string' ? rolYolu(kullanici.rol, href) : href);
  };

  const oge = (o: { anahtar: string; etiket: string; ikon: IkonAdi; href: Href }) => {
    const adres = typeof o.href === 'string' ? o.href : '';
    const altinda = (onek: string) => yol === onek || yol.startsWith(`${onek}/`);
    const secili = (adres === '/' ? yol === '/' : altinda(adres)) || (ALT_ROTALAR[o.anahtar] ?? []).some(altinda);
    return (
      <Pressable
        key={o.anahtar}
        accessibilityRole="link"
        accessibilityLabel={o.etiket}
        accessibilityState={{ selected: secili }}
        onPress={() => git(o.href)}
        style={({ hovered, pressed }: Vurgu) => [
          styles.satir,
          dar && styles.satirDar,
          (hovered || pressed) && styles.vurgulu,
          secili && styles.seciliSatir,
        ]}
      >
        <Ikon ad={o.ikon} boyut={20} renk={secili ? tema.renkler.ana : tema.renkler.metinIkincil} />
        {dar ? null : (
          <Text style={[styles.etiket, secili && styles.seciliEtiket]} numberOfLines={1}>
            {o.etiket}
          </Text>
        )}
      </Pressable>
    );
  };

  return (
    <View role="navigation" style={[styles.kenar, dar && styles.kenarDar]}>
      <View style={[styles.marka, dar && styles.ortali]}>
        {markaLogosuVar && !dar ? (
          <MarkaLogosu yukseklik={40} />
        ) : (
          <>
            <View style={styles.markaIsareti}>
              <Text style={styles.markaHarfi}>{marka.ad.charAt(0)}</Text>
            </View>
            {dar ? null : (
              <Text style={styles.markaAdi} numberOfLines={1}>
                {marka.ad}
              </Text>
            )}
          </>
        )}
      </View>

      <ScrollView style={styles.liste} contentContainerStyle={styles.listeIcerigi}>
        {ustOgeler.map(oge)}
        {altOgeler.length > 0 ? <View style={styles.ayirici} /> : null}
        {altOgeler.map(oge)}
      </ScrollView>

      <View style={styles.alt}>
        <View style={[styles.temalar, dar && styles.temalarDar]}>
          {TEMALAR.map((t) => {
            const secili = t.deger === tercih;
            return (
              <Pressable
                key={t.deger}
                accessibilityRole="radio"
                accessibilityLabel={t.etiket}
                accessibilityState={{ checked: secili }}
                onPress={() => tercihiAyarla(t.deger)}
                style={({ hovered, pressed }: Vurgu) => [
                  styles.temaDugmesi,
                  (hovered || pressed) && styles.vurgulu,
                  secili && styles.seciliSatir,
                ]}
              >
                <Ikon ad={t.ikon} boyut={16} renk={secili ? tema.renkler.ana : tema.renkler.metinIkincil} />
              </Pressable>
            );
          })}
        </View>

        {kullanici ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Profil: ${kullanici.ad_soyad}`}
            onPress={() => git('/profil')}
            style={({ hovered, pressed }: Vurgu) => [styles.kullanici, dar && styles.ortali, (hovered || pressed) && styles.vurgulu]}
          >
            <Avatar ad={kullanici.ad_soyad} boyut={32} />
            {dar ? null : (
              <View style={styles.esnek}>
                <Text style={styles.kullaniciAdi} numberOfLines={1}>
                  {kullanici.ad_soyad}
                </Text>
                <Text style={styles.kucuk} numberOfLines={1}>
                  {rolEtiketi(kullanici.rol, kurum, gorev?.ad)}
                </Text>
              </View>
            )}
          </Pressable>
        ) : null}

        {cikisSoruluyor && !dar ? (
          <View style={styles.cikisOnayi}>
            <Text style={[styles.kucuk, styles.esnek]}>Çıkış yapılsın mı?</Text>
            <Pressable accessibilityRole="button" onPress={cikisYap} style={styles.onaySecenegi}>
              <Text style={styles.onayEvet}>Evet</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setCikisSoruluyor(false)} style={styles.onaySecenegi}>
              <Text style={styles.kucuk}>Vazgeç</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Çıkış yap"
            // Daraltılmış çubukta soruya yer yok; ikon doğrudan çıkış yapar.
            onPress={() => (dar ? cikisYap() : setCikisSoruluyor(true))}
            style={({ hovered, pressed }: Vurgu) => [styles.satir, dar && styles.satirDar, (hovered || pressed) && styles.vurgulu]}
          >
            <Ikon ad="log-out-outline" boyut={20} renk={tema.renkler.metinIkincil} />
            {dar ? null : <Text style={styles.etiket}>Çıkış yap</Text>}
          </Pressable>
        )}
      </View>
    </View>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    kenar: {
      width: 240,
      borderRightWidth: 1,
      borderRightColor: t.renkler.ayirici,
      backgroundColor: t.renkler.yuzey,
    },
    kenarDar: {
      width: 64,
    },
    esnek: {
      flex: 1,
    },
    ortali: {
      justifyContent: 'center',
    },
    marka: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.m,
      height: 64,
      paddingHorizontal: t.bosluk.l,
      borderBottomWidth: 1,
      borderBottomColor: t.renkler.ayirici,
    },
    markaIsareti: {
      width: 32,
      height: 32,
      borderRadius: t.yaricap.s,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.renkler.ana,
    },
    markaHarfi: {
      fontFamily: t.yaziTipi.kalin,
      fontSize: 16,
      color: t.renkler.anaUzeriMetin,
    },
    markaAdi: {
      ...t.yazi.govde,
      flex: 1,
      fontFamily: t.yaziTipi.yariKalin,
    },
    liste: {
      flex: 1,
    },
    listeIcerigi: {
      gap: 2,
      padding: t.bosluk.s,
    },
    ayirici: {
      height: 1,
      marginVertical: t.bosluk.s,
      backgroundColor: t.renkler.ayirici,
    },
    satir: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.m,
      height: 38,
      paddingHorizontal: t.bosluk.m,
      borderRadius: t.yaricap.s,
    },
    satirDar: {
      justifyContent: 'center',
      paddingHorizontal: 0,
    },
    vurgulu: {
      backgroundColor: t.renkler.ayirici,
    },
    seciliSatir: {
      backgroundColor: t.renkler.anaSoluk,
    },
    etiket: {
      ...t.yazi.kucuk,
      flex: 1,
      fontSize: 14,
      fontFamily: t.yaziTipi.orta,
    },
    seciliEtiket: {
      color: t.renkler.ana,
      fontFamily: t.yaziTipi.yariKalin,
    },
    alt: {
      gap: 2,
      padding: t.bosluk.s,
      borderTopWidth: 1,
      borderTopColor: t.renkler.ayirici,
    },
    temalar: {
      flexDirection: 'row',
      gap: 2,
      padding: 2,
      borderRadius: t.yaricap.s,
      borderWidth: 1,
      borderColor: t.renkler.ayirici,
    },
    temalarDar: {
      flexDirection: 'column',
    },
    temaDugmesi: {
      flex: 1,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 6,
    },
    kullanici: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.m,
      padding: t.bosluk.s,
      borderRadius: t.yaricap.s,
    },
    kullaniciAdi: {
      ...t.yazi.kucuk,
      fontSize: 14,
      fontFamily: t.yaziTipi.yariKalin,
      color: t.renkler.metin,
    },
    kucuk: {
      ...t.yazi.kucuk,
      fontSize: 12,
    },
    cikisOnayi: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.s,
      height: 38,
      paddingHorizontal: t.bosluk.m,
    },
    onaySecenegi: {
      paddingVertical: t.bosluk.xs,
      paddingHorizontal: t.bosluk.xs,
    },
    onayEvet: {
      ...t.yazi.kucuk,
      fontSize: 12,
      fontFamily: t.yaziTipi.yariKalin,
      color: t.renkler.hata,
    },
  });
}
