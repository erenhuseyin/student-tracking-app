// İki adımlı onay: `Alert.alert` kullanılmaz (web'de tarayıcı confirm()'e sarılabilir, bu proje
// için istenmiyor). Tetikleyiciye basılınca 'mobil' düzende aynı yerde soru + onay/vazgeç çıkar,
// 'web' düzeninde küçük bir diyalog açılır.
// Tetikleyici `ikon` verilirse ikon buton, verilmezse tehlike butonudur.
import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

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

  const onayla = async () => {
    setCalisiyor(true);
    await onOnay();
    setCalisiyor(false);
    setOnayBekleniyor(false);
  };

  // 'web' düzeninde soru küçük bir diyalogda sorulur; tetikleyici yerinde kalır.
  if (tema.duzen === 'web') {
    return (
      <>
        {ikon ? (
          <IkonButon ikon={ikon} etiket={etiket} renk={tema.renkler.hata} onPress={() => {}} />
        ) : (
          <Buton tur="tehlike" baslik={etiket} onPress={() => {}} />
        )}
        <Modal visible transparent animationType="fade" onRequestClose={() => setOnayBekleniyor(false)}>
          <Pressable accessibilityLabel="Vazgeç" style={styles.perde} onPress={() => setOnayBekleniyor(false)}>
            <Pressable accessibilityRole="alert" style={styles.diyalog} onPress={() => {}}>
              <Text style={tema.yazi.bolum}>{soru}</Text>
              <View style={styles.diyalogEylemleri}>
                <Buton tur="ikincil" baslik="Vazgeç" pasif={calisiyor} onPress={() => setOnayBekleniyor(false)} />
                <Buton tur="tehlike" baslik={onayEtiketi} yukleniyor={calisiyor} onPress={onayla} />
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </>
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
            onPress={onayla}
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
    perde: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: t.bosluk.xl,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    diyalog: {
      width: '100%',
      maxWidth: 400,
      gap: t.bosluk.xl,
      padding: t.bosluk.xl,
      borderRadius: t.yaricap.l,
      borderWidth: 1,
      borderColor: t.renkler.ayirici,
      backgroundColor: t.renkler.yuzey,
    },
    diyalogEylemleri: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: t.bosluk.s,
    },
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
