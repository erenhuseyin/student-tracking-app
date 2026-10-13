// Açılır tek seçimli kutu (filtreler ve çok seçenekli form alanları). Seçenekler bir pencerede
// listelenir: 'mobil' düzende ekranın ortasında, 'web' düzeninde kutunun hemen altında (açılır liste).
// Az seçenekte (2-3) `Secenekler` daha uygundur.
// `bosEtiket` verilirse listenin başına "seçim yok" satırı eklenir (ör. filtrede "Tümü").
import { useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Ikon } from '@/components/Ikon';
import { type Tema, useTema } from '@/lib/tema';

type Props<T extends string> = {
  etiket: string;
  secenekler: { deger: T; etiket: string }[];
  secili: T | null;
  onSec: (deger: T | null) => void;
  bosEtiket?: string;
  pasif?: boolean;
};

export function Secim<T extends string>({ etiket, secenekler, secili, onSec, bosEtiket, pasif = false }: Props<T>) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const [acik, setAcik] = useState(false);
  const web = tema.duzen === 'web';
  const kutu = useRef<View>(null);
  // 'web' düzeninde listenin açılacağı yer: kutunun pencere içindeki konumu.
  const [yer, setYer] = useState<{ x: number; y: number; genislik: number } | null>(null);

  const ac = () => {
    if (!web || !kutu.current) {
      setAcik(true);
      return;
    }
    kutu.current.measureInWindow((x, y, genislik, yukseklik) => {
      setYer({ x, y: y + yukseklik + 4, genislik });
      setAcik(true);
    });
  };
  const seciliEtiket = secenekler.find((s) => s.deger === secili)?.etiket ?? bosEtiket ?? 'Seçin';
  const satirlar: { deger: T | null; etiket: string }[] = [
    ...(bosEtiket ? [{ deger: null, etiket: bosEtiket }] : []),
    ...secenekler,
  ];

  const sec = (deger: T | null) => {
    setAcik(false);
    onSec(deger);
  };

  return (
    <View style={styles.kapsayici}>
      <Text style={styles.etiket}>{etiket}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${etiket}: ${seciliEtiket}`}
        accessibilityState={{ disabled: pasif, expanded: acik }}
        ref={kutu}
        disabled={pasif}
        onPress={ac}
        style={[styles.kutu, pasif && styles.pasif]}
      >
        <Text style={[styles.deger, secili === null && styles.bosDeger]} numberOfLines={1}>
          {seciliEtiket}
        </Text>
        <Ikon ad="chevron-down" boyut={18} renk={tema.renkler.metinIkincil} />
      </Pressable>

      <Modal visible={acik} transparent animationType={web ? 'none' : 'fade'} onRequestClose={() => setAcik(false)}>
        <Pressable
          accessibilityLabel="Kapat"
          style={web && yer ? styles.webPerde : styles.perde}
          onPress={() => setAcik(false)}
        >
          {/* İçteki Pressable, listeye dokunmanın perdeye (kapatmaya) geçmesini engeller. */}
          <Pressable
            style={web && yer ? [styles.acilirListe, { left: yer.x, top: yer.y, minWidth: yer.genislik }] : styles.pencere}
            onPress={() => {}}
          >
            {web && yer ? null : <Text style={styles.pencereBasligi}>{etiket}</Text>}
            <ScrollView style={styles.liste}>
              {satirlar.map((s) => {
                const seciliMi = s.deger === secili;
                return (
                  <Pressable
                    key={s.deger ?? '__bos__'}
                    accessibilityRole="button"
                    accessibilityState={{ selected: seciliMi }}
                    onPress={() => sec(s.deger)}
                    style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                      styles.secenek,
                      hovered && styles.uzerinde,
                      seciliMi && styles.seciliSecenek,
                      pressed && styles.basili,
                    ]}
                  >
                    <Text style={styles.secenekMetni}>{s.etiket}</Text>
                    {seciliMi ? <Ikon ad="checkmark" boyut={20} renk={tema.renkler.ana} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    kapsayici: {
      gap: t.bosluk.xs,
    },
    etiket: {
      ...t.yazi.etiket,
    },
    kutu: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.s,
      minHeight: t.dokunmaAlani.normal,
      backgroundColor: t.renkler.yuzey,
      borderWidth: 1,
      borderColor: t.renkler.kenarlik,
      borderRadius: t.yaricap.m,
      paddingHorizontal: t.bosluk.l,
    },
    pasif: {
      backgroundColor: t.renkler.ayirici,
    },
    deger: {
      ...t.yazi.govde,
      flex: 1,
    },
    bosDeger: {
      color: t.renkler.metinIkincil,
    },
    perde: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: t.bosluk.xl,
    },
    pencere: {
      width: '100%',
      maxWidth: 420,
      maxHeight: '80%',
      backgroundColor: t.renkler.yuzey,
      borderRadius: t.yaricap.l,
      borderWidth: 1,
      borderColor: t.renkler.ayirici,
      padding: t.bosluk.l,
      gap: t.bosluk.m,
    },
    webPerde: {
      flex: 1,
    },
    acilirListe: {
      position: 'absolute',
      maxWidth: 420,
      maxHeight: 320,
      backgroundColor: t.renkler.yuzey,
      borderRadius: t.yaricap.m,
      borderWidth: 1,
      borderColor: t.renkler.kenarlik,
      padding: t.bosluk.xs,
      boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
    },
    uzerinde: {
      backgroundColor: t.renkler.ayirici,
    },
    pencereBasligi: {
      ...t.yazi.bolum,
    },
    liste: {
      flexGrow: 0,
    },
    secenek: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.m,
      minHeight: t.dokunmaAlani.normal,
      paddingHorizontal: t.bosluk.m,
      borderRadius: t.yaricap.s,
    },
    seciliSecenek: {
      backgroundColor: t.renkler.anaSoluk,
    },
    secenekMetni: {
      ...t.yazi.govde,
      flex: 1,
    },
    basili: {
      opacity: 0.6,
    },
  });
}
