// Tek bir personelin yönetimi: ad, sınıf atamaları (öğretmen), giriş kodu, pasifleştirme.
// Kurum admini ve süper admin ekranları paylaşır.
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { Buton } from '@/components/Buton';
import { Girdi } from '@/components/Girdi';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { OnayButonu } from '@/components/OnayButonu';
import { OnayKutusu } from '@/components/OnayKutusu';
import { PersonelDurumRozeti } from '@/components/PersonelDurumRozeti';
import { Yukleniyor } from '@/components/Yukleniyor';
import { useOturum } from '@/lib/oturum';
import {
  ogretmenSinifAta,
  ogretmenSinifIdleriniGetir,
  ogretmenSinifKaldir,
  PERSONEL_ROL_ETIKETLERI,
  personelAdGuncelle,
  personelAktifligiDegistir,
  personelGetir,
  personelKodGonder,
  type PersonelRolu,
} from '@/lib/personel';
import { siniflariGetir } from '@/lib/siniflar';
import { useTema } from '@/lib/tema';
import type { Kullanici, Sinif } from '@/lib/tipler';

const mesajaCevir = (e: unknown) => (e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');

type PersonelVerisi = { personel: Kullanici; siniflar: Sinif[]; atananlar: string[] };

// Öğretmen için kurumunun sınıfları ve atandıkları da gelir; yöneticide ikisi de boştur.
async function personelVerisiniGetir(id: string): Promise<PersonelVerisi> {
  const personel = await personelGetir(id);
  if (personel.rol !== 'ogretmen' || !personel.kurum_id) return { personel, siniflar: [], atananlar: [] };
  const [siniflar, atananlar] = await Promise.all([siniflariGetir(personel.kurum_id), ogretmenSinifIdleriniGetir(personel.id)]);
  return { personel, siniflar, atananlar };
}

export function PersonelDetay({ id }: { id: string }) {
  const tema = useTema();
  const { kullanici } = useOturum();
  const [personel, setPersonel] = useState<Kullanici | null>(null);
  const [adSoyad, setAdSoyad] = useState('');
  const [siniflar, setSiniflar] = useState<Sinif[]>([]);
  const [atananlar, setAtananlar] = useState<string[]>([]);
  const [yuklemeHatasi, setYuklemeHatasi] = useState<string | null>(null);

  const [adKaydediliyor, setAdKaydediliyor] = useState(false);
  const [adMesaji, setAdMesaji] = useState<{ tur: 'hata' | 'basari'; metin: string } | null>(null);
  const [degisenSinifId, setDegisenSinifId] = useState<string | null>(null);
  const [sinifHatasi, setSinifHatasi] = useState<string | null>(null);
  const [kodGonderiliyor, setKodGonderiliyor] = useState(false);
  const [kodMesaji, setKodMesaji] = useState<{ tur: 'hata' | 'basari'; metin: string } | null>(null);
  const [hesapHatasi, setHesapHatasi] = useState<string | null>(null);
  const [hesapDegisiyor, setHesapDegisiyor] = useState(false);

  const uygula = (veri: PersonelVerisi) => {
    setPersonel(veri.personel);
    setAdSoyad(veri.personel.ad_soyad);
    setSiniflar(veri.siniflar);
    setAtananlar(veri.atananlar);
  };

  useEffect(() => {
    let iptalEdildi = false;
    personelVerisiniGetir(id)
      .then((veri) => {
        if (!iptalEdildi) uygula(veri);
      })
      .catch((e) => {
        if (!iptalEdildi) setYuklemeHatasi(mesajaCevir(e));
      });
    return () => {
      iptalEdildi = true;
    };
  }, [id]);

  if (yuklemeHatasi) return <HataMesaji mesaj={yuklemeHatasi} />;
  if (!personel) return <Yukleniyor />;

  const kendisi = personel.id === kullanici?.id;

  const adKaydet = async () => {
    setAdKaydediliyor(true);
    setAdMesaji(null);
    try {
      await personelAdGuncelle(personel.id, adSoyad);
      setAdMesaji({ tur: 'basari', metin: 'Kaydedildi.' });
    } catch (e) {
      setAdMesaji({ tur: 'hata', metin: mesajaCevir(e) });
    } finally {
      setAdKaydediliyor(false);
    }
  };

  const sinifDegistir = async (sinifId: string, secili: boolean) => {
    if (!personel.kurum_id) return;
    setDegisenSinifId(sinifId);
    setSinifHatasi(null);
    try {
      if (secili) await ogretmenSinifAta(personel.kurum_id, personel.id, sinifId);
      else await ogretmenSinifKaldir(personel.id, sinifId);
      setAtananlar((mevcut) => (secili ? [...mevcut, sinifId] : mevcut.filter((s) => s !== sinifId)));
    } catch (e) {
      setSinifHatasi(mesajaCevir(e));
    } finally {
      setDegisenSinifId(null);
    }
  };

  const kodGonder = async () => {
    setKodGonderiliyor(true);
    setKodMesaji(null);
    try {
      await personelKodGonder(personel.id);
      setKodMesaji({ tur: 'basari', metin: `Giriş kodu ${personel.eposta ?? 'e-posta adresine'} gönderildi.` });
    } catch (e) {
      setKodMesaji({ tur: 'hata', metin: mesajaCevir(e) });
    } finally {
      setKodGonderiliyor(false);
    }
  };

  const aktifligiDegistir = async (aktif: boolean) => {
    setHesapHatasi(null);
    setHesapDegisiyor(true);
    try {
      await personelAktifligiDegistir(personel.id, aktif);
      uygula(await personelVerisiniGetir(personel.id));
    } catch (e) {
      setHesapHatasi(mesajaCevir(e));
    } finally {
      setHesapDegisiyor(false);
    }
  };

  return (
    <>
      <Kart>
        <PersonelDurumRozeti personel={personel} />
        <Girdi etiket="Ad soyad" value={adSoyad} onChangeText={setAdSoyad} editable={!adKaydediliyor} />
        <Girdi etiket="E-posta (değiştirilemez)" value={personel.eposta ?? '—'} editable={false} />
        <Girdi etiket="Görev" value={PERSONEL_ROL_ETIKETLERI[personel.rol as PersonelRolu] ?? personel.rol} editable={false} />
        <HataMesaji mesaj={adMesaji?.metin} tur={adMesaji?.tur} />
        <Buton baslik="Kaydet" onPress={adKaydet} yukleniyor={adKaydediliyor} />
      </Kart>

      {personel.rol === 'ogretmen' && personel.aktif ? (
        <Kart>
          <Text style={tema.yazi.bolum}>Sınıfları</Text>
          {siniflar.length === 0 ? <Text style={tema.yazi.kucuk}>Bu kurumda henüz sınıf yok.</Text> : null}
          {siniflar.map((s) => (
            <OnayKutusu
              key={s.id}
              etiket={`${s.ad} · ${s.donem}`}
              secili={atananlar.includes(s.id)}
              calisiyor={degisenSinifId === s.id}
              pasif={degisenSinifId !== null}
              onDegis={(secili) => sinifDegistir(s.id, secili)}
            />
          ))}
          <HataMesaji mesaj={sinifHatasi} />
        </Kart>
      ) : null}

      {personel.aktif ? (
        <Kart>
          <Text style={tema.yazi.bolum}>Giriş</Text>
          <Text style={tema.yazi.kucuk}>
            Davet e-postası ulaşmadıysa ya da şifre unutulduysa yeni bir giriş kodu gönderin. Kişi uygulamada
            &quot;Davet kodum var&quot; ile kodu girip şifresini belirler.
          </Text>
          <HataMesaji mesaj={kodMesaji?.metin} tur={kodMesaji?.tur} />
          <Buton tur="ikincil" ikon="mail-outline" baslik="Giriş Kodu Gönder" onPress={kodGonder} yukleniyor={kodGonderiliyor} />
        </Kart>
      ) : null}

      {kendisi ? null : (
        <Kart>
          <Text style={tema.yazi.bolum}>Hesap</Text>
          <Text style={tema.yazi.kucuk}>
            {personel.aktif
              ? 'Pasifleştirilen kişi uygulamaya giremez ve sınıf atamaları kaldırılır. Girdiği kayıtlar silinmez.'
              : 'Bu hesap pasif. Aktifleştirirseniz kişi yeniden giriş yapabilir; sınıflarını tekrar atamanız gerekir.'}
          </Text>
          <HataMesaji mesaj={hesapHatasi} />
          {personel.aktif ? (
            <OnayButonu
              etiket="Hesabı Pasifleştir"
              soru="Emin misiniz?"
              onayEtiketi="Evet, pasifleştir"
              onOnay={() => aktifligiDegistir(false)}
            />
          ) : (
            <Buton baslik="Hesabı Aktifleştir" onPress={() => aktifligiDegistir(true)} yukleniyor={hesapDegisiyor} />
          )}
        </Kart>
      )}
    </>
  );
}
