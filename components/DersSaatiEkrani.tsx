// Programa ders ekleme/düzenleme (kurum admini ve sınıfın öğretmeni). `id` verilirse o ders
// düzenlenir, verilmezse `sinifId` sınıfına yeni ders eklenir. Yetkiyi RLS verir.
import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Buton } from '@/components/Buton';
import { Chip } from '@/components/Chip';
import { Ekran } from '@/components/Ekran';
import { Girdi } from '@/components/Girdi';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { OnayButonu } from '@/components/OnayButonu';
import { Secenekler } from '@/components/Secenekler';
import { Yukleniyor } from '@/components/Yukleniyor';
import {
  dersSaatiEkle,
  dersSaatiGetir,
  dersSaatiGuncelle,
  dersSaatindenGirdiye,
  dersSaatiSil,
  kullanilanDersAdlari,
} from '@/lib/dersProgrami';
import { sinifGetir } from '@/lib/siniflar';
import { GUN_KISA_ADLARI } from '@/lib/tarih';
import { type Tema, useTema } from '@/lib/tema';
import { useToast } from '@/lib/toast';
import type { DersSaati, Sinif } from '@/lib/tipler';

const GUN_SECENEKLERI = GUN_KISA_ADLARI.map((etiket, i) => ({ deger: String(i + 1), etiket }));
const EN_FAZLA_ONERI = 12;

export function DersSaatiEkrani({ sinifId, id }: { sinifId: string; id?: string }) {
  const router = useRouter();
  const tema = useTema();
  const toast = useToast();
  const styles = useMemo(() => olustur(tema), [tema]);
  const [sinif, setSinif] = useState<Sinif | null>(null);
  const [mevcut, setMevcut] = useState<DersSaati | null>(null);
  const [oneriler, setOneriler] = useState<string[]>([]);
  const [hazir, setHazir] = useState(false);

  const [gun, setGun] = useState('');
  const [baslangic, setBaslangic] = useState('');
  const [bitis, setBitis] = useState('');
  const [dersAdi, setDersAdi] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([sinifGetir(sinifId), id ? dersSaatiGetir(id) : null, kullanilanDersAdlari()])
      .then(([s, ders, adlar]) => {
        setSinif(s);
        setOneriler(adlar);
        if (ders) {
          const girdi = dersSaatindenGirdiye(ders);
          setMevcut(ders);
          setGun(String(girdi.gun));
          setBaslangic(girdi.baslangic);
          setBitis(girdi.bitis);
          setDersAdi(girdi.dersAdi);
        }
        setHazir(true);
      })
      .catch((e: Error) => setHata(e.message));
  }, [sinifId, id]);

  const kaydet = async () => {
    if (!sinif) return;
    setGonderiliyor(true);
    setHata(null);
    try {
      const girdi = { gun: gun ? Number(gun) : null, baslangic, bitis, dersAdi };
      if (mevcut) await dersSaatiGuncelle(mevcut, girdi);
      else await dersSaatiEkle(sinif.kurum_id, sinif.id, girdi);
      toast(mevcut ? 'Ders kaydedildi' : 'Ders eklendi');
      router.back();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');
      setGonderiliyor(false);
    }
  };

  const gorunenOneriler = oneriler.filter((o) => o !== dersAdi.trim()).slice(0, EN_FAZLA_ONERI);

  return (
    <Ekran kaydirilabilir>
      <Stack.Screen options={{ title: sinif ? `${sinif.ad} · ${id ? 'Dersi Düzenle' : 'Ders Ekle'}` : 'Ders' }} />

      {hazir ? (
        <Kart>
          <Secenekler etiket="Gün" secenekler={GUN_SECENEKLERI} secili={gun} onSec={setGun} pasif={gonderiliyor} />
          <View style={styles.saatler}>
            <View style={styles.saat}>
              <Girdi
                etiket="Başlangıç (örn. 09:00)"
                value={baslangic}
                onChangeText={setBaslangic}
                editable={!gonderiliyor}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>
            <View style={styles.saat}>
              <Girdi
                etiket="Bitiş (örn. 09:40)"
                value={bitis}
                onChangeText={setBitis}
                editable={!gonderiliyor}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>
          </View>
          <Girdi etiket="Ders" value={dersAdi} onChangeText={setDersAdi} editable={!gonderiliyor} maxLength={60} />
          {gorunenOneriler.length > 0 ? (
            <View style={styles.oneriler}>
              <Text style={tema.yazi.kucuk}>Daha önce kullanılanlar</Text>
              <View style={styles.cipler}>
                {gorunenOneriler.map((o) => (
                  <Chip key={o} etiket={o} secili={false} onPress={() => setDersAdi(o)} pasif={gonderiliyor} />
                ))}
              </View>
            </View>
          ) : null}
          <HataMesaji mesaj={hata} />
          <Buton baslik="Kaydet" onPress={kaydet} yukleniyor={gonderiliyor} />
          {mevcut ? (
            <OnayButonu
              etiket="Dersi Sil"
              onOnay={async () => {
                try {
                  await dersSaatiSil(mevcut);
                  toast('Ders silindi');
                  router.back();
                } catch (e) {
                  setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
                }
              }}
            />
          ) : null}
        </Kart>
      ) : hata ? (
        <HataMesaji mesaj={hata} />
      ) : (
        <Yukleniyor />
      )}
    </Ekran>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    saatler: {
      flexDirection: 'row',
      gap: t.bosluk.m,
    },
    saat: {
      flex: 1,
      minWidth: 0,
    },
    oneriler: {
      gap: t.bosluk.xs,
    },
    cipler: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: t.bosluk.s,
    },
  });
}
