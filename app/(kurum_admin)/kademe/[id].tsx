// Erişim: yalnızca kök kurumun kurum_admin'i düzenler; şube admini salt okunur görür (RLS).
// Bir kademenin dersleri, konuları ve ezber maddeleri. Konular ve maddeler çok satırlı kutuya
// yapıştırılarak toplu eklenir (her satır bir kayıt).
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Buton } from '@/components/Buton';
import { Chip } from '@/components/Chip';
import { Ekran } from '@/components/Ekran';
import { Girdi } from '@/components/Girdi';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { OnayButonu } from '@/components/OnayButonu';
import { Yukleniyor } from '@/components/Yukleniyor';
import {
  dersEkle,
  dersSil,
  ezberleriEkle,
  ezberMaddesiSil,
  kademeAdiniGuncelle,
  kademeGetir,
  type KademeIcerigi,
  kademeIceriginiGetir,
  kademeSil,
  konulariEkle,
  konuSil,
  topluEklemeMesaji,
} from '@/lib/icerik';
import { useOturum } from '@/lib/oturum';
import { type Tema, useTema } from '@/lib/tema';
import { useToast } from '@/lib/toast';

const EZBER = 'ezber';
const mesajaCevir = (e: unknown) => (e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');

export default function KademeDetay() {
  const router = useRouter();
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { kurum } = useOturum();
  const duzenlenebilir = kurum !== null && kurum.ust_kurum_id === null;

  const [ad, setAd] = useState('');
  const [icerik, setIcerik] = useState<KademeIcerigi | null>(null);
  // Seçili sekme: bir dersin id'si ya da ezber listesi.
  const [secili, setSecili] = useState<string>(EZBER);
  const [yeniDers, setYeniDers] = useState('');
  const [topluMetin, setTopluMetin] = useState('');
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const yenile = useCallback(async () => {
    const [k, i] = await Promise.all([kademeGetir(id), kademeIceriginiGetir(id)]);
    setAd(k.ad);
    setIcerik(i);
    return i;
  }, [id]);

  useEffect(() => {
    let iptalEdildi = false;
    Promise.all([kademeGetir(id), kademeIceriginiGetir(id)])
      .then(([k, i]) => {
        if (iptalEdildi) return;
        setAd(k.ad);
        setIcerik(i);
        setSecili(i.dersler[0]?.id ?? EZBER);
      })
      .catch((e) => {
        if (!iptalEdildi) setHata(mesajaCevir(e));
      });
    return () => {
      iptalEdildi = true;
    };
  }, [id]);

  const calistir = async (islem: () => Promise<unknown>, basariMesaji?: string) => {
    setMesgul(true);
    setHata(null);
    try {
      await islem();
      await yenile();
      if (basariMesaji) toast(basariMesaji);
    } catch (e) {
      setHata(mesajaCevir(e));
    } finally {
      setMesgul(false);
    }
  };

  if (!icerik) {
    return (
      <Ekran>
        <Stack.Screen options={{ title: 'Kademe' }} />
        {hata ? <HataMesaji mesaj={hata} /> : <Yukleniyor />}
      </Ekran>
    );
  }

  const seciliDers = icerik.dersler.find((d) => d.id === secili) ?? null;
  const satirlar = seciliDers ? seciliDers.konular : icerik.ezberler;
  const tekil = seciliDers ? 'konu' : 'ezber maddesi';

  const topluEkle = () =>
    calistir(async () => {
      if (!kurum) return;
      const sonuc = seciliDers
        ? await konulariEkle(kurum.id, seciliDers.id, topluMetin, seciliDers.konular.length)
        : await ezberleriEkle(kurum.id, id, topluMetin, icerik.ezberler.length);
      setTopluMetin('');
      toast(topluEklemeMesaji(sonuc, tekil));
    });

  return (
    <Ekran kaydirilabilir>
      <Stack.Screen options={{ title: ad || 'Kademe' }} />
      <HataMesaji mesaj={hata} />

      {duzenlenebilir ? (
        <Kart>
          <Girdi etiket="Kademe adı" value={ad} onChangeText={setAd} editable={!mesgul} maxLength={60} />
          <Buton tur="ikincil" baslik="Adı Kaydet" onPress={() => calistir(() => kademeAdiniGuncelle(id, ad), 'Kaydedildi')} pasif={mesgul} />
        </Kart>
      ) : (
        <Text style={tema.yazi.kucuk}>Kademeleri ana kurumun yöneticisi düzenler.</Text>
      )}

      <View style={styles.cipler}>
        {icerik.dersler.map((d) => (
          <Chip key={d.id} etiket={`${d.ad} (${d.konular.length})`} secili={secili === d.id} onPress={() => setSecili(d.id)} />
        ))}
        <Chip etiket={`Ek ezber (${icerik.ezberler.length})`} secili={secili === EZBER} onPress={() => setSecili(EZBER)} />
      </View>

      {duzenlenebilir ? (
        <Kart>
          <Girdi etiket="Yeni ders (örn. Siyer)" value={yeniDers} onChangeText={setYeniDers} editable={!mesgul} maxLength={60} />
          <Buton
            tur="ikincil"
            ikon="add"
            baslik="Ders Ekle"
            pasif={mesgul}
            onPress={() =>
              calistir(async () => {
                if (!kurum) return;
                await dersEkle(kurum.id, id, yeniDers, icerik.dersler.length + 1);
                setYeniDers('');
              }, 'Ders eklendi')
            }
          />
        </Kart>
      ) : null}

      <Kart>
        <Text style={tema.yazi.bolum}>{seciliDers ? `${seciliDers.ad} konuları` : 'Bu kademeye özel ezber maddeleri'}</Text>
        {seciliDers ? null : (
          <Text style={tema.yazi.kucuk}>Ortak ezber listesine ek olarak yalnızca bu kademenin sınıflarında görünür.</Text>
        )}
        {satirlar.length === 0 ? <Text style={tema.yazi.kucuk}>Henüz {tekil} yok.</Text> : null}
        {satirlar.map((s, i) => (
          <View key={s.id} style={styles.satir}>
            <Text style={styles.satirMetni}>
              {i + 1}. {s.ad}
            </Text>
            {duzenlenebilir ? (
              <OnayButonu
                ikon="close-circle-outline"
                etiket={`${s.ad} sil`}
                onOnay={() => calistir(() => (seciliDers ? konuSil(s.id) : ezberMaddesiSil(s.id)))}
              />
            ) : null}
          </View>
        ))}
      </Kart>

      {duzenlenebilir ? (
        <Kart>
          <Girdi
            etiket={seciliDers ? 'Konu ekle (her satıra bir konu)' : 'Ezber maddesi ekle (her satıra bir madde)'}
            value={topluMetin}
            onChangeText={setTopluMetin}
            editable={!mesgul}
            multiline
            textAlignVertical="top"
            style={styles.toplu}
          />
          <Buton ikon="add" baslik="Listeye Ekle" onPress={topluEkle} yukleniyor={mesgul} />
        </Kart>
      ) : null}

      {duzenlenebilir ? (
        <Kart>
          <Text style={tema.yazi.kucuk}>
            Silinen ders ya da kademeyle birlikte konuları, ezber maddeleri ve sınıfların bunlara ait tüm takip kayıtları da
            silinir; geri alınamaz.
          </Text>
          {seciliDers ? (
            <OnayButonu
              etiket={`"${seciliDers.ad}" Dersini Sil`}
              onOnay={() =>
                calistir(async () => {
                  await dersSil(seciliDers.id);
                  setSecili(EZBER);
                }, 'Ders silindi')
              }
            />
          ) : null}
          <OnayButonu
            etiket="Kademeyi Sil"
            onOnay={async () => {
              try {
                await kademeSil(id);
                toast('Kademe silindi');
                // Ekran adresle açıldıysa (web'de yenileme) geri gidecek ekran yoktur.
                if (router.canGoBack()) router.back();
                else router.replace('/kademeler');
              } catch (e) {
                setHata(mesajaCevir(e));
              }
            }}
          />
        </Kart>
      ) : null}
    </Ekran>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    cipler: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: t.bosluk.s,
    },
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
