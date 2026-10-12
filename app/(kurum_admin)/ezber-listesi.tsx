// Erişim: kurum_admin; yalnızca kök kurumun (müşterinin) yöneticisi düzenler, alt birim yöneticisi
// salt okunur görür (RLS). Müşterinin ortak ezber listesi: tüm kademeler ve kademesi olmayan
// sınıflar bu listeyi kullanır. Maddeler çok satırlı kutuya yapıştırılarak, isteğe bağlı bir grup
// adıyla ("Dualar", "Sureler") toplu eklenir.
import { Stack } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { Girdi } from '@/components/Girdi';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { OnayButonu } from '@/components/OnayButonu';
import { Yukleniyor } from '@/components/Yukleniyor';
import { ezberGruplari, ezberleriEkle, ezberListesiniGetir, ezberMaddesiSil } from '@/lib/icerik';
import { useOturum } from '@/lib/oturum';
import { type Tema, useTema } from '@/lib/tema';
import { useToast } from '@/lib/toast';
import type { EzberMaddesi } from '@/lib/tipler';

const mesajaCevir = (e: unknown) => (e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');

export default function EzberListesi() {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const toast = useToast();
  const { kurum } = useOturum();
  const duzenlenebilir = kurum !== null && kurum.ust_kurum_id === null;

  const [maddeler, setMaddeler] = useState<EzberMaddesi[] | null>(null);
  const [grup, setGrup] = useState('');
  const [topluMetin, setTopluMetin] = useState('');
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const yenile = useCallback(async () => setMaddeler(await ezberListesiniGetir(null)), []);

  useEffect(() => {
    let iptalEdildi = false;
    ezberListesiniGetir(null)
      .then((liste) => {
        if (!iptalEdildi) setMaddeler(liste);
      })
      .catch((e) => {
        if (!iptalEdildi) setHata(mesajaCevir(e));
      });
    return () => {
      iptalEdildi = true;
    };
  }, []);

  const calistir = async (islem: () => Promise<unknown>) => {
    setMesgul(true);
    setHata(null);
    try {
      await islem();
      await yenile();
    } catch (e) {
      setHata(mesajaCevir(e));
    } finally {
      setMesgul(false);
    }
  };

  if (!maddeler) {
    return (
      <Ekran>
        <Stack.Screen options={{ title: 'Ezber Listesi' }} />
        {hata ? <HataMesaji mesaj={hata} /> : <Yukleniyor />}
      </Ekran>
    );
  }

  const ekle = () =>
    calistir(async () => {
      if (!kurum) return;
      // Sıra listenin sonundan sürer (silinen maddelerin bıraktığı boşluklar sırayı bozmaz).
      const sonSira = Math.max(0, ...maddeler.map((m) => m.sira));
      const eklenen = await ezberleriEkle(kurum.id, null, topluMetin, sonSira, grup);
      setTopluMetin('');
      toast(`${eklenen} ezber maddesi eklendi`);
    });

  return (
    <Ekran kaydirilabilir>
      <Stack.Screen options={{ title: 'Ezber Listesi' }} />
      <HataMesaji mesaj={hata} />
      <Text style={tema.yazi.kucuk}>
        Bu liste tüm kademelerde ve kademesi olmayan sınıflarda kullanılır.
        {duzenlenebilir ? '' : ' Listeyi ana kurumun yöneticisi düzenler.'}
      </Text>

      {maddeler.length === 0 ? <Text style={tema.yazi.govde}>Henüz ezber maddesi yok.</Text> : null}
      {ezberGruplari(maddeler).map((g) => (
        <Kart key={g.grup ?? '__grupsuz__'}>
          <Text style={tema.yazi.bolum}>
            {g.grup ?? 'Grupsuz'} ({g.maddeler.length})
          </Text>
          {g.maddeler.map((m, i) => (
            <View key={m.id} style={styles.satir}>
              <Text style={styles.satirMetni}>
                {i + 1}. {m.ad}
              </Text>
              {duzenlenebilir ? (
                <OnayButonu ikon="close-circle-outline" etiket={`${m.ad} sil`} onOnay={() => calistir(() => ezberMaddesiSil(m.id))} />
              ) : null}
            </View>
          ))}
        </Kart>
      ))}

      {duzenlenebilir ? (
        <Kart>
          <Girdi etiket="Grup (isteğe bağlı; örn. Sureler)" value={grup} onChangeText={setGrup} editable={!mesgul} maxLength={60} />
          <Girdi
            etiket="Ezber maddesi ekle (her satıra bir madde)"
            value={topluMetin}
            onChangeText={setTopluMetin}
            editable={!mesgul}
            multiline
            textAlignVertical="top"
            style={styles.toplu}
          />
          <Buton ikon="add" baslik="Listeye Ekle" onPress={ekle} yukleniyor={mesgul} />
          <Text style={tema.yazi.kucuk}>
            Silinen maddeyle birlikte öğrencilerin o maddeye ait ezber kayıtları da silinir; geri alınamaz.
          </Text>
        </Kart>
      ) : null}
    </Ekran>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    satir: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.s,
      minHeight: t.dokunmaAlani.normal,
    },
    satirMetni: {
      ...t.yazi.govde,
      flex: 1,
    },
    toplu: {
      minHeight: 140,
    },
  });
}
