// İki adımlı onay: `Alert.alert` kullanılmaz (web'de tarayıcı confirm()'e sarılabilir, bu proje
// için istenmiyor). Tetikleyiciye basılınca aynı yerde soru + onay/vazgeç çıkar.
// Tetikleyici `ikon` verilirse ikon buton, verilmezse tehlike butonudur.
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Buton } from '@/components/Buton';
import type { IkonAdi } from '@/components/Ikon';
import { IkonButon } from '@/components/IkonButon';
import { type Tema, useTema } from '@/lib/tema';

type Props = {
  onOnay: () => Promise<void>;
  etiket?: string;
  ikon?: IkonAdi;
  soru?: string;
  onayEtiketi?: string;
};

export function OnayButonu({
  onOnay,
  etiket = 'Sil',
  ikon,
  soru = 'Emin misiniz?',
  onayEtiketi = 'Evet, sil',
}: Props) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const [onayBekleniyor, setOnayBekleniyor] = useState(false);
  const [calisiyor, setCalisiyor] = useState(false);

  if (!onayBekleniyor) {
    return ikon ? (
      <IkonButon ikon={ikon} etiket={etiket} renk={tema.renkler.hata} onPress={() => setOnayBekleniyor(true)} />
    ) : (
      <Buton tur="tehlike" baslik={etiket} onPress={() => setOnayBekleniyor(true)} />
    );
  }

  return (
    <View style={styles.onaySatiri}>
      <Text style={styles.soru}>{soru}</Text>
      {calisiyor ? (
        <ActivityIndicator size="small" color={tema.renkler.hata} />
      ) : (
        <>
          <Pressable
            accessibilityRole="button"
            style={styles.secenek}
            onPress={async () => {
              setCalisiyor(true);
              await onOnay();
              setCalisiyor(false);
              setOnayBekleniyor(false);
            }}
          >
            <Text style={styles.evetMetni}>{onayEtiketi}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={styles.secenek} onPress={() => setOnayBekleniyor(false)}>
            <Text style={styles.vazgecMetni}>Vazgeç</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    onaySatiri: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: t.bosluk.m,
      minHeight: t.dokunmaAlani.normal,
    },
    soru: {
      ...t.yazi.kucuk,
    },
    secenek: {
      minHeight: t.dokunmaAlani.normal,
      justifyContent: 'center',
    },
    evetMetni: {
      ...t.yazi.kucuk,
      fontFamily: t.yaziTipi.yariKalin,
      color: t.renkler.hata,
    },
    vazgecMetni: {
      ...t.yazi.kucuk,
    },
  });
}
