// Veli ana ekranında bir çocuğun özeti: bugünkü yoklama, bu haftaki katılım, son gelişim kaydı.
// Dokununca çocuğun ayrıntı ekranı açılır. Kurumun veliler için kapattığı bölümün satırı gösterilmez.
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { DurumRozeti } from '@/components/DurumRozeti';
import { Ikon } from '@/components/Ikon';
import { katilimMetni, yuzdeMetni } from '@/lib/katilim';
import { tarihiBicimle } from '@/lib/tarih';
import { type Tema, useTema } from '@/lib/tema';
import type { CocukOzeti } from '@/lib/veliOzet';

type Props = {
  ozet: CocukOzeti;
  yoklamaAcik: boolean;
  gelisimAcik: boolean;
  onPress: () => void;
};

export function CocukOzetKarti({ ozet, yoklamaAcik, gelisimAcik, onPress }: Props) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const { ogrenci, hafta, sonGelisim } = ozet;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${ogrenci.ad_soyad}, ayrıntıları aç`}
      onPress={onPress}
      style={({ pressed }) => [styles.kart, pressed && styles.basili]}
    >
      <View style={styles.ust}>
        <Avatar ad={ogrenci.ad_soyad} boyut={48} />
        <View style={styles.kimlik}>
          <Text style={tema.yazi.bolum} numberOfLines={2}>
            {ogrenci.ad_soyad}
          </Text>
          {ozet.sinifAdi ? <Text style={tema.yazi.kucuk}>{ozet.sinifAdi}</Text> : null}
        </View>
        <Ikon ad="chevron-forward" boyut={20} />
      </View>

      {yoklamaAcik ? (
        <>
          <View style={styles.satir}>
            <Text style={styles.etiket}>Bugün</Text>
            <DurumRozeti durum={ozet.bugun} />
          </View>
          <View style={styles.satir}>
            <Text style={styles.etiket}>Bu hafta</Text>
            <Text style={styles.deger}>
              {hafta.alinan === 0 ? (
                'Henüz yoklama alınmadı'
              ) : (
                <>
                  <Text style={[styles.oran, { color: tema.katilimRengi(hafta.oran).renk }]}>{yuzdeMetni(hafta.oran)}</Text>
                  {`  ${katilimMetni(hafta) ?? ''}`}
                </>
              )}
            </Text>
          </View>
        </>
      ) : null}

      {gelisimAcik ? (
        <View style={styles.gelisim}>
          <Text style={styles.etiket}>Son gelişim kaydı</Text>
          {sonGelisim ? (
            <>
              <Text style={styles.deger}>
                {sonGelisim.kategoriAdi} · {tarihiBicimle(sonGelisim.tarih)}
              </Text>
              <Text style={tema.yazi.kucuk} numberOfLines={2}>
                {sonGelisim.notMetni}
              </Text>
            </>
          ) : (
            <Text style={tema.yazi.kucuk}>Henüz kayıt girilmedi</Text>
          )}
        </View>
      ) : null}
    </Pressable>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    kart: {
      gap: t.bosluk.m,
      padding: t.bosluk.l,
      borderRadius: t.yaricap.l,
      borderWidth: 1,
      borderColor: t.renkler.ayirici,
      backgroundColor: t.renkler.yuzey,
    },
    basili: {
      backgroundColor: t.renkler.anaSoluk,
    },
    ust: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.m,
    },
    kimlik: {
      flex: 1,
      gap: t.bosluk.xs,
    },
    satir: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: t.bosluk.m,
      minHeight: 28,
    },
    etiket: {
      ...t.yazi.etiket,
    },
    deger: {
      ...t.yazi.govde,
      flexShrink: 1,
      textAlign: 'right',
    },
    oran: {
      fontFamily: t.yaziTipi.kalin,
    },
    gelisim: {
      gap: t.bosluk.xs,
      paddingTop: t.bosluk.m,
      borderTopWidth: 1,
      borderTopColor: t.renkler.ayirici,
    },
  });
}
