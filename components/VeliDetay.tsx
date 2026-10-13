// Kullanıcılar tablosunda seçilen velinin paneli. Veli hesabı çocuğun kullanıcı adıyla açılır ve adı
// değiştirilemez; burada bağlı çocuklar görünür ve veli girişinin PIN'i sıfırlanır.
// Erişim: yalnızca kurum_admin (RLS: yönettiği kurumların velileri ve öğrencileri).
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { Girdi } from '@/components/Girdi';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { OnayButonu } from '@/components/OnayButonu';
import { Yukleniyor } from '@/components/Yukleniyor';
import { kullaniciGetir, veliCocuklariniGetir } from '@/lib/kullanicilar';
import { veliPininiSifirla } from '@/lib/ogrenciler';
import { useTema } from '@/lib/tema';
import type { Kullanici, Ogrenci } from '@/lib/tipler';

const mesajaCevir = (e: unknown) => (e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');

type Props = {
  id: string;
  // Çocuğun sınıfı ve birimi (ör. "Kâşif 1 · İstanbul › Sancaktepe").
  ogrenciAltBasligi?: (ogrenci: Ogrenci) => string;
};

export function VeliDetay({ id, ogrenciAltBasligi }: Props) {
  const tema = useTema();
  const [veli, setVeli] = useState<Kullanici | null>(null);
  const [cocuklar, setCocuklar] = useState<Ogrenci[]>([]);
  const [yuklemeHatasi, setYuklemeHatasi] = useState<string | null>(null);
  const [pinMesaji, setPinMesaji] = useState<{ ogrenciId: string; tur: 'hata' | 'basari'; metin: string } | null>(null);

  useEffect(() => {
    let iptalEdildi = false;
    Promise.all([kullaniciGetir(id), veliCocuklariniGetir(id)])
      .then(([k, c]) => {
        if (iptalEdildi) return;
        setVeli(k);
        setCocuklar(c);
      })
      .catch((e) => {
        if (!iptalEdildi) setYuklemeHatasi(mesajaCevir(e));
      });
    return () => {
      iptalEdildi = true;
    };
  }, [id]);

  if (yuklemeHatasi) return <HataMesaji mesaj={yuklemeHatasi} />;
  if (!veli) return <Yukleniyor />;

  const pinSifirla = async (ogrenciId: string) => {
    setPinMesaji(null);
    try {
      await veliPininiSifirla(ogrenciId);
      setPinMesaji({ ogrenciId, tur: 'basari', metin: 'PIN "1234" olarak sıfırlandı; veli ilk girişte yenisini belirler.' });
    } catch (e) {
      setPinMesaji({ ogrenciId, tur: 'hata', metin: mesajaCevir(e) });
    }
  };

  return (
    <>
      <Kart>
        <Girdi etiket="Ad soyad (değiştirilemez)" value={veli.ad_soyad} editable={false} />
        <Text style={tema.yazi.kucuk}>
          Veli hesabı öğrenci eklenince açılır; veli çocuğunun kullanıcı adı ve PIN ile giriş yapar.
          {veli.aktif ? '' : ' Bu hesap pasif.'}
        </Text>
      </Kart>

      {cocuklar.length === 0 ? (
        <Kart>
          <Text style={tema.yazi.kucuk}>Bu veliye bağlı öğrenci görünmüyor.</Text>
        </Kart>
      ) : null}
      {cocuklar.map((c) => (
        <Kart key={c.id}>
          <Text style={tema.yazi.bolum}>{c.ad_soyad}</Text>
          {ogrenciAltBasligi ? <Text style={tema.yazi.kucuk}>{ogrenciAltBasligi(c)}</Text> : null}
          {c.kullanici_adi ? (
            <>
              <Text style={tema.yazi.govde}>Kullanıcı adı: {c.kullanici_adi}</Text>
              <Text style={tema.yazi.kucuk}>
                PIN unutulduysa ya da hesap kilitlendiyse bu öğrencinin veli girişini sıfırlayın.
              </Text>
              {pinMesaji?.ogrenciId === c.id ? <HataMesaji mesaj={pinMesaji.metin} tur={pinMesaji.tur} /> : null}
              <OnayButonu
                etiket="Veli PIN'ini Sıfırla"
                soru={'Emin misiniz? PIN "1234" olacak.'}
                onayEtiketi="Evet, sıfırla"
                onOnay={() => pinSifirla(c.id)}
              />
            </>
          ) : (
            <Text style={tema.yazi.kucuk}>Bu öğrenci için veli girişi açılmamış.</Text>
          )}
        </Kart>
      ))}
    </>
  );
}
