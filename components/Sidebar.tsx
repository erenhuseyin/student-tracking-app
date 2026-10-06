// Tablet (768-1023, yalnızca ikon) ve masaüstü (>=1024, ikon + etiket) genişlikte yan gezinme.
// Saf görsel bir bileşendir — yeni bir navigator değildir, verilen `href`'ler mevcut route'lara
// işaret eder; `Stack.Protected` yapısı ve route adları değişmez.
import { Link, type Href, usePathname } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Ikon, type IkonAdi } from '@/components/Ikon';
import { type Tema, useKirilma, useTema } from '@/lib/tema';

export type SidebarOgesi = {
  href: Href;
  etiket: string;
  ikon: IkonAdi;
};

export function Sidebar({ ogeler }: { ogeler: SidebarOgesi[] }) {
  const tema = useTema();
  const kirilma = useKirilma();
  const yol = usePathname();
  const styles = useMemo(() => olustur(tema), [tema]);
  const daraltilmis = kirilma === 'tablet';

  return (
    <View style={[styles.kenar, daraltilmis && styles.kenarDar]}>
      {ogeler.map((oge) => {
        const secili = typeof oge.href === 'string' && (yol === oge.href || yol.startsWith(`${oge.href}/`));
        return (
          <Link key={typeof oge.href === 'string' ? oge.href : oge.etiket} href={oge.href} asChild>
            <View style={[styles.satir, secili && styles.seciliSatir]}>
              <Ikon ad={oge.ikon} boyut={20} renk={secili ? tema.renkler.ana : tema.renkler.metinIkincil} />
              {daraltilmis ? null : (
                <Text style={[styles.etiket, secili && styles.seciliEtiket]} numberOfLines={1}>
                  {oge.etiket}
                </Text>
              )}
            </View>
          </Link>
        );
      })}
    </View>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    kenar: {
      width: 220,
      gap: t.bosluk.xs,
      paddingVertical: t.bosluk.l,
      paddingHorizontal: t.bosluk.s,
      borderRightWidth: 1,
      borderRightColor: t.renkler.ayirici,
      backgroundColor: t.renkler.yuzey,
    },
    kenarDar: {
      width: 64,
      alignItems: 'center',
    },
    satir: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.m,
      minHeight: t.dokunmaAlani.normal,
      paddingHorizontal: t.bosluk.m,
      borderRadius: t.yaricap.m,
    },
    seciliSatir: {
      backgroundColor: t.renkler.anaSoluk,
    },
    etiket: {
      ...t.yazi.govde,
      color: t.renkler.metinIkincil,
    },
    seciliEtiket: {
      color: t.renkler.ana,
      fontFamily: t.yaziTipi.yariKalin,
    },
  });
}
