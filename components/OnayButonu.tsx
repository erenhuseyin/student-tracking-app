// İki adımlı onay: `Alert.alert` kullanılmaz (web'de tarayıcı confirm()'e sarılabilir, bu proje
// için istenmiyor). Tetikleyiciye basılınca aynı yerde soru + onay/vazgeç çıkar.
// Tetikleyici `ikon` verilirse ikon buton, verilmezse tehlike butonudur.
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Buton } from '@/components/Buton';
import type { IkonAdi } from '@/components/Ikon';
import { IkonButon } from '@/components/IkonButon';
import { bosluk, dokunmaAlani, renkler, yazi } from '@/lib/tema';

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
  const [onayBekleniyor, setOnayBekleniyor] = useState(false);
  const [calisiyor, setCalisiyor] = useState(false);

  if (!onayBekleniyor) {
    return ikon ? (
      <IkonButon ikon={ikon} etiket={etiket} renk={renkler.hata} onPress={() => setOnayBekleniyor(true)} />
    ) : (
      <Buton tur="tehlike" baslik={etiket} onPress={() => setOnayBekleniyor(true)} />
    );
  }

  return (
    <View style={styles.onaySatiri}>
      <Text style={yazi.kucuk}>{soru}</Text>
      {calisiyor ? (
        <ActivityIndicator size="small" color={renkler.hata} />
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

const styles = StyleSheet.create({
  onaySatiri: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: bosluk.m,
    minHeight: dokunmaAlani.normal,
  },
  secenek: {
    minHeight: dokunmaAlani.normal,
    justifyContent: 'center',
  },
  evetMetni: {
    color: renkler.hata,
    fontWeight: '600',
    fontSize: 14,
  },
  vazgecMetni: {
    color: renkler.metinIkincil,
    fontSize: 14,
  },
});
