// Erişim: yalnızca veli. Kuruma tek yönlü öneri/görüş gönderir; kurum uygulamadan yanıt yazmaz.
// Veli yalnızca kendi gönderdiklerini görür.
import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { Girdi } from '@/components/Girdi';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { etkinlikZamaniniBicimle } from '@/lib/duyurular';
import { ONERI_AZAMI_UZUNLUK, oneriGonder, onerilerimiGetir } from '@/lib/oneriler';
import { useOturum } from '@/lib/oturum';
import { type Tema, useTema } from '@/lib/tema';
import { useToast } from '@/lib/toast';
import type { Oneri } from '@/lib/tipler';

const mesajaCevir = (e: unknown) => (e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');

export default function OneriGonder() {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const toast = useToast();
  const { kullanici } = useOturum();
  const [metin, setMetin] = useState('');
  const [gonderilenler, setGonderilenler] = useState<Oneri[]>([]);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const kullaniciId = kullanici?.id;

  const yenile = useCallback(async () => {
    if (!kullaniciId) return;
    try {
      setGonderilenler(await onerilerimiGetir(kullaniciId));
    } catch (e) {
      setHata(mesajaCevir(e));
    }
  }, [kullaniciId]);

  useFocusEffect(
    useCallback(() => {
      yenile();
    }, [yenile]),
  );

  const gonder = async () => {
    if (!kullanici?.kurum_id) return;
    setGonderiliyor(true);
    setHata(null);
    try {
      await oneriGonder(kullanici.kurum_id, kullanici.id, metin);
      setMetin('');
      toast('Öneriniz iletildi');
      await yenile();
    } catch (e) {
      setHata(mesajaCevir(e));
    } finally {
      setGonderiliyor(false);
    }
  };

  return (
    <Ekran kaydirilabilir>
      <Stack.Screen options={{ title: 'Öneri Gönder' }} />

      <Kart>
        <Text style={tema.yazi.govde}>
          Önerinizi ya da görüşünüzü kurum yönetimine iletin. Bu bir mesajlaşma değildir; uygulamadan yanıt gelmez.
          Acil durumlar için kurumu arayın.
        </Text>
        <Girdi
          etiket="Öneriniz"
          value={metin}
          onChangeText={setMetin}
          editable={!gonderiliyor}
          multiline
          maxLength={ONERI_AZAMI_UZUNLUK}
          textAlignVertical="top"
          style={styles.metin}
        />
        <HataMesaji mesaj={hata} />
        <Buton baslik="Gönder" onPress={gonder} yukleniyor={gonderiliyor} buyuk />
      </Kart>

      {gonderilenler.length > 0 ? (
        <Kart>
          <Text style={tema.yazi.bolum}>Gönderdikleriniz</Text>
          {gonderilenler.map((o) => (
            <View key={o.id} style={styles.gonderilen}>
              <Text style={tema.yazi.govde}>{o.metin}</Text>
              <Text style={tema.yazi.kucuk}>
                {etkinlikZamaniniBicimle(o.olusturma_tarihi)} · {o.okundu ? 'Yönetim okudu' : 'İletildi'}
              </Text>
            </View>
          ))}
        </Kart>
      ) : null}
    </Ekran>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    metin: {
      minHeight: 140,
    },
    gonderilen: {
      gap: t.bosluk.xs,
      paddingTop: t.bosluk.m,
      borderTopWidth: 1,
      borderTopColor: t.renkler.ayirici,
    },
  });
}
