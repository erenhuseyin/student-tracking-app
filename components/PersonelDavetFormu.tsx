// Yeni personel (öğretmen / yönetici) davet formu. Hesap sunucuda açılır ve kişiye e-postayla
// giriş kodu gider; şifresini kendisi belirler. `roller` tek elemanlıysa rol seçimi gösterilmez
// (süper admin yalnızca yönetici davet edebilir).
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { Buton } from '@/components/Buton';
import { Girdi } from '@/components/Girdi';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { OnayKutusu } from '@/components/OnayKutusu';
import { Secenekler } from '@/components/Secenekler';
import { Secim } from '@/components/Secim';
import { gorevAta } from '@/lib/gorevler';
import { PERSONEL_ROL_ETIKETLERI, personelDavetEt, type PersonelRolu } from '@/lib/personel';
import { siniflariGetir } from '@/lib/siniflar';
import { useTema } from '@/lib/tema';
import type { Gorev, Sinif } from '@/lib/tipler';
import { useToast } from '@/lib/toast';

type Props = {
  kurumId: string;
  roller: PersonelRolu[];
  // Verilirse seçilen role uygun görevler arasından tanımlı görev de seçilebilir.
  gorevler?: Gorev[];
  // Tablo + panel ekranlarında (bkz. VeriEkrani) davet bitince çağrılır; verilmezse önceki ekrana dönülür.
  onTamam?: () => void;
};

export function PersonelDavetFormu({ kurumId, roller, gorevler = [], onTamam }: Props) {
  const router = useRouter();
  const toast = useToast();
  const tema = useTema();
  const [adSoyad, setAdSoyad] = useState('');
  const [eposta, setEposta] = useState('');
  const [rol, setRol] = useState<PersonelRolu>(roller[0]);
  const [gorevId, setGorevId] = useState<string | null>(null);
  const uygunGorevler = gorevler.filter((g) => g.temel_rol === rol);
  const bitir = () => (onTamam ? onTamam() : router.back());
  const [siniflar, setSiniflar] = useState<Sinif[]>([]);
  const [seciliSiniflar, setSeciliSiniflar] = useState<string[]>([]);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  // Hesap açıldı ama e-posta gönderilemedi: form kapanır, yöneticiye ne yapacağı söylenir.
  const [epostaGitmedi, setEpostaGitmedi] = useState(false);

  const ogretmenSecilebilir = roller.includes('ogretmen');

  useEffect(() => {
    if (!ogretmenSecilebilir) return;
    let iptalEdildi = false;
    siniflariGetir(kurumId)
      .then((veri) => {
        if (!iptalEdildi) setSiniflar(veri);
      })
      .catch(() => {
        // Sınıflar yüklenemezse davet yine yapılabilir; atama sonradan personel ekranından yapılır.
      });
    return () => {
      iptalEdildi = true;
    };
  }, [kurumId, ogretmenSecilebilir]);

  const davetEt = async () => {
    setGonderiliyor(true);
    setHata(null);
    try {
      const sonuc = await personelDavetEt({ kurumId, adSoyad, eposta, rol, sinifIdleri: seciliSiniflar });
      // Hesap açıldı; görev atanamazsa davet geri alınmaz, görev kişinin ekranından sonradan atanır.
      if (gorevId) await gorevAta(sonuc.kullanici_id, gorevId).catch(() => {});
      if (sonuc.eposta_gonderildi) {
        toast('Personel eklendi, davet e-postası gönderildi');
        bitir();
      }
      else setEpostaGitmedi(true);
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');
    } finally {
      setGonderiliyor(false);
    }
  };

  if (epostaGitmedi) {
    return (
      <Kart>
        <HataMesaji mesaj="Hesap oluşturuldu ama giriş kodu e-postası gönderilemedi." />
        <Text style={tema.yazi.kucuk}>
          Personel listesinden bu kişiyi açıp &quot;Giriş kodu gönder&quot;e dokunarak tekrar deneyebilirsiniz.
        </Text>
        <Buton baslik="Tamam" onPress={bitir} />
      </Kart>
    );
  }

  return (
    <Kart>
      {roller.length > 1 ? (
        <Secenekler
          etiket="Rol"
          secenekler={roller.map((r) => ({ deger: r, etiket: PERSONEL_ROL_ETIKETLERI[r] }))}
          secili={rol}
          onSec={(r) => {
            setRol(r);
            setGorevId(null);
          }}
          pasif={gonderiliyor}
        />
      ) : null}
      {uygunGorevler.length > 0 ? (
        <Secim
          etiket="Tanımlı görev (isteğe bağlı)"
          secenekler={uygunGorevler.map((g) => ({ deger: g.id, etiket: g.ad }))}
          secili={gorevId}
          onSec={setGorevId}
          bosEtiket="Yok"
          pasif={gonderiliyor}
        />
      ) : null}
      <Girdi etiket="Ad soyad" value={adSoyad} onChangeText={setAdSoyad} editable={!gonderiliyor} autoFocus />
      <Girdi
        etiket="E-posta"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={eposta}
        onChangeText={setEposta}
        editable={!gonderiliyor}
      />

      {rol === 'ogretmen' && siniflar.length > 0 ? (
        <>
          <Text style={tema.yazi.etiket}>Sınıfları (sonradan değiştirilebilir)</Text>
          {siniflar.map((s) => (
            <OnayKutusu
              key={s.id}
              etiket={`${s.ad} · ${s.donem}`}
              secili={seciliSiniflar.includes(s.id)}
              pasif={gonderiliyor}
              onDegis={(secili) =>
                setSeciliSiniflar((mevcut) => (secili ? [...mevcut, s.id] : mevcut.filter((id) => id !== s.id)))
              }
            />
          ))}
        </>
      ) : null}

      <Text style={tema.yazi.kucuk}>
        Bu adrese bir giriş kodu gönderilir. Kişi uygulamada &quot;Davet kodum var&quot; ile kodu girip şifresini
        kendisi belirler.
      </Text>
      <HataMesaji mesaj={hata} />
      <Buton ikon="mail-outline" baslik="Davet Gönder" onPress={davetEt} yukleniyor={gonderiliyor} />
    </Kart>
  );
}
