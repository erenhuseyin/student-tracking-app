// Erişim: yalnızca kurum_admin (yönettiği kurumların öğrencileri; RLS). Tüm öğrencilerde ada göre
// arama ve aktif/pasif süzgeci. Sonuçlar sunucuda süzülür ve sayfalanır.
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Text } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Buton } from '@/components/Buton';
import { Ekran } from '@/components/Ekran';
import { Girdi } from '@/components/Girdi';
import { IkonButon } from '@/components/IkonButon';
import { Liste } from '@/components/Liste';
import { ListeSatiri } from '@/components/ListeSatiri';
import { Secenekler } from '@/components/Secenekler';
import { kurumAdlariniGetir, kurumYolu } from '@/lib/kurumlar';
import { OGRENCI_SAYFA_BOYUTU, ogrencileriAra } from '@/lib/ogrenciler';
import { useOturum } from '@/lib/oturum';
import { siniflariGetir } from '@/lib/siniflar';
import { useTema } from '@/lib/tema';
import type { Kurum, Ogrenci } from '@/lib/tipler';

type Durum = 'aktif' | 'pasif';
const DURUMLAR: { deger: Durum; etiket: string }[] = [
  { deger: 'aktif', etiket: 'Aktif' },
  { deger: 'pasif', etiket: 'Pasif' },
];
const ARAMA_GECIKMESI_MS = 350;

export default function Ogrenciler() {
  const router = useRouter();
  const tema = useTema();
  const { kurum } = useOturum();
  const [kurumlar, setKurumlar] = useState<Pick<Kurum, 'id' | 'ad' | 'yol'>[]>([]);
  const [yazilan, setYazilan] = useState('');
  const [arama, setArama] = useState('');
  const [durum, setDurum] = useState<Durum>('aktif');
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[] | null>(null);
  const [toplam, setToplam] = useState(0);
  const [sayfa, setSayfa] = useState(0);
  const [sinifAdlari, setSinifAdlari] = useState<Map<string, string>>(new Map());
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  // Her tuş vuruşunda sorgu atmamak için yazma bitince aranır.
  useEffect(() => {
    const zamanlayici = setTimeout(() => setArama(yazilan), ARAMA_GECIKMESI_MS);
    return () => clearTimeout(zamanlayici);
  }, [yazilan]);

  const getir = useCallback(
    async (istenenSayfa: number) => {
      setYukleniyor(true);
      setHata(null);
      try {
        const sonuc = await ogrencileriAra({ arama, sinifId: null, durum }, istenenSayfa);
        setOgrenciler((mevcut) => (istenenSayfa === 0 ? sonuc.ogrenciler : [...(mevcut ?? []), ...sonuc.ogrenciler]));
        setToplam(sonuc.toplam);
        setSayfa(istenenSayfa);
      } catch (e) {
        setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
      } finally {
        setYukleniyor(false);
      }
    },
    [arama, durum],
  );

  useFocusEffect(
    useCallback(() => {
      getir(0);
      siniflariGetir()
        .then((s) => setSinifAdlari(new Map(s.map((x) => [x.id, x.ad]))))
        .catch(() => {});
      kurumAdlariniGetir()
        .then(setKurumlar)
        .catch(() => {});
    }, [getir]),
  );

  const dahaVar = ogrenciler !== null && ogrenciler.length < toplam;

  return (
    <Ekran>
      <Stack.Screen options={{ title: 'Öğrenciler' }} />
      <Girdi etiket="Ada göre ara" value={yazilan} onChangeText={setYazilan} autoCorrect={false} returnKeyType="search" />
      <Secenekler secenekler={DURUMLAR} secili={durum} onSec={setDurum} />
      <Liste
        veri={ogrenciler}
        hata={hata}
        onYenile={() => getir(0)}
        anahtar={(o) => o.id}
        bosIkon="search-outline"
        bosBaslik={arama ? 'Eşleşen öğrenci yok' : durum === 'pasif' ? 'Pasif öğrenci yok' : 'Henüz öğrenci yok'}
        ust={<Text style={tema.yazi.kucuk}>{toplam} öğrenci</Text>}
        satir={(o) => (
          <ListeSatiri
            baslik={o.ad_soyad}
            altBaslik={[sinifAdlari.get(o.sinif_id), kurumYolu(kurumlar, o.kurum_id, kurum?.id)].filter(Boolean).join(' · ') || null}
            sol={<Avatar ad={o.ad_soyad} />}
            sag={<IkonButon ikon="create-outline" etiket="Düzenle" onPress={() => router.push(`/ogrenci-duzenle/${o.id}`)} />}
          />
        )}
        alt={
          dahaVar ? (
            <Buton
              tur="ikincil"
              baslik={`Daha Fazla Göster (${Math.min(OGRENCI_SAYFA_BOYUTU, toplam - (ogrenciler?.length ?? 0))})`}
              onPress={() => getir(sayfa + 1)}
              yukleniyor={yukleniyor}
            />
          ) : undefined
        }
      />
    </Ekran>
  );
}
