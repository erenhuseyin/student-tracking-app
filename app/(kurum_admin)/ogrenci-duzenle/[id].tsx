// Erişim: yalnızca kurum_admin
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ogrenciGetir, ogrenciGuncelle, tcknAta, veliPininiSifirla } from '@/lib/ogrenciler';

export default function OgrenciDuzenle() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [adSoyad, setAdSoyad] = useState('');
  const [dogumTarihi, setDogumTarihi] = useState('');
  const [tckn, setTckn] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const [tcknGirdisi, setTcknGirdisi] = useState('');
  const [tcknGonderiliyor, setTcknGonderiliyor] = useState(false);
  const [tcknHata, setTcknHata] = useState<string | null>(null);

  const [pinOnayBekleniyor, setPinOnayBekleniyor] = useState(false);
  const [pinGonderiliyor, setPinGonderiliyor] = useState(false);
  const [pinHata, setPinHata] = useState<string | null>(null);
  const [pinBasarili, setPinBasarili] = useState(false);

  useEffect(() => {
    let iptalEdildi = false;
    ogrenciGetir(id)
      .then((o) => {
        if (iptalEdildi) return;
        setAdSoyad(o.ad_soyad);
        setDogumTarihi(o.dogum_tarihi);
        setTckn(o.tckn);
      })
      .catch((e: Error) => {
        if (!iptalEdildi) setHata(e.message);
      })
      .finally(() => {
        if (!iptalEdildi) setYukleniyor(false);
      });
    return () => {
      iptalEdildi = true;
    };
  }, [id]);

  const kaydet = async () => {
    setGonderiliyor(true);
    setHata(null);
    try {
      await ogrenciGuncelle(id, adSoyad, dogumTarihi);
      router.back();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');
    } finally {
      setGonderiliyor(false);
    }
  };

  const tcknAtaTikla = async () => {
    setTcknGonderiliyor(true);
    setTcknHata(null);
    try {
      await tcknAta(id, tcknGirdisi.trim());
      setTckn(tcknGirdisi.trim());
    } catch (e) {
      setTcknHata(e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');
    } finally {
      setTcknGonderiliyor(false);
    }
  };

  const pinSifirlaTikla = async () => {
    setPinGonderiliyor(true);
    setPinHata(null);
    try {
      await veliPininiSifirla(id);
      setPinBasarili(true);
      setPinOnayBekleniyor(false);
    } catch (e) {
      setPinHata(e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');
    } finally {
      setPinGonderiliyor(false);
    }
  };

  if (yukleniyor) {
    return <ActivityIndicator style={styles.yukleniyor} />;
  }

  return (
    <View style={styles.kapsayici}>
      <Text style={styles.baslik}>Öğrenciyi Düzenle</Text>

      <TextInput style={styles.girdi} placeholder="Ad soyad" value={adSoyad} onChangeText={setAdSoyad} editable={!gonderiliyor} />
      <TextInput
        style={styles.girdi}
        placeholder="Doğum tarihi (YYYY-AA-GG)"
        value={dogumTarihi}
        onChangeText={setDogumTarihi}
        editable={!gonderiliyor}
        onSubmitEditing={kaydet}
      />

      {hata ? <Text style={styles.hataMetni}>{hata}</Text> : null}

      <Pressable style={[styles.buton, gonderiliyor && styles.butonPasif]} onPress={kaydet} disabled={gonderiliyor}>
        {gonderiliyor ? <ActivityIndicator color="#fff" /> : <Text style={styles.butonMetni}>Kaydet</Text>}
      </Pressable>

      <View style={styles.bolum}>
        <Text style={styles.bolumBasligi}>TCKN</Text>
        {tckn ? (
          <Text style={styles.salt}>{tckn} (değiştirilemez)</Text>
        ) : (
          <>
            <TextInput
              style={styles.girdi}
              placeholder="11 haneli TCKN"
              value={tcknGirdisi}
              onChangeText={setTcknGirdisi}
              keyboardType="number-pad"
              maxLength={11}
              editable={!tcknGonderiliyor}
            />
            {tcknHata ? <Text style={styles.hataMetni}>{tcknHata}</Text> : null}
            <Pressable
              style={[styles.buton, tcknGonderiliyor && styles.butonPasif]}
              onPress={tcknAtaTikla}
              disabled={tcknGonderiliyor}
            >
              {tcknGonderiliyor ? <ActivityIndicator color="#fff" /> : <Text style={styles.butonMetni}>TCKN Ata</Text>}
            </Pressable>
          </>
        )}
      </View>

      {tckn ? (
        <View style={styles.bolum}>
          <Text style={styles.bolumBasligi}>Veli PIN&apos;i</Text>
          {pinBasarili ? (
            <Text style={styles.basariMetni}>PIN &quot;1234&quot; olarak sıfırlandı.</Text>
          ) : pinOnayBekleniyor ? (
            <View style={styles.onaySatiri}>
              <Text style={styles.onayMetni}>Emin misiniz? PIN &quot;1234&quot; olacak.</Text>
              {pinGonderiliyor ? (
                <ActivityIndicator size="small" />
              ) : (
                <>
                  <Pressable onPress={pinSifirlaTikla}>
                    <Text style={styles.evetMetni}>Evet, sıfırla</Text>
                  </Pressable>
                  <Pressable onPress={() => setPinOnayBekleniyor(false)}>
                    <Text style={styles.vazgecMetni}>Vazgeç</Text>
                  </Pressable>
                </>
              )}
            </View>
          ) : (
            <Pressable onPress={() => setPinOnayBekleniyor(true)}>
              <Text style={styles.sifirlaMetni}>Veli PIN&apos;ini Sıfırla</Text>
            </Pressable>
          )}
          {pinHata ? <Text style={styles.hataMetni}>{pinHata}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  kapsayici: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  yukleniyor: {
    flex: 1,
  },
  baslik: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  girdi: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  hataMetni: {
    color: '#c62828',
  },
  buton: {
    backgroundColor: '#208aef',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  butonPasif: {
    opacity: 0.6,
  },
  butonMetni: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  bolum: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 10,
  },
  bolumBasligi: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  salt: {
    fontSize: 16,
  },
  basariMetni: {
    color: '#2e7d32',
  },
  onaySatiri: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  onayMetni: {
    color: '#666',
    fontSize: 13,
  },
  evetMetni: {
    color: '#c62828',
    fontWeight: '600',
  },
  vazgecMetni: {
    color: '#666',
  },
  sifirlaMetni: {
    color: '#c62828',
  },
});
