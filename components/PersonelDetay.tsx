// Tek bir personelin yönetimi: ad, görev, sınıf atamaları (öğretmen), giriş kodu, pasifleştirme;
// daveti henüz kabul etmemiş kişide e-posta düzeltme ve davet iptali.
// Kurum admini ve süper admin ekranları paylaşır.
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { Buton } from '@/components/Buton';
import { Girdi } from '@/components/Girdi';
import { HataMesaji } from '@/components/HataMesaji';
import { Kart } from '@/components/Kart';
import { OnayButonu } from '@/components/OnayButonu';
import { OnayKutusu } from '@/components/OnayKutusu';
import { PersonelDurumRozeti } from '@/components/PersonelDurumRozeti';
import { Secenekler } from '@/components/Secenekler';
import { Yukleniyor } from '@/components/Yukleniyor';
import { useOturum } from '@/lib/oturum';
import {
  ogretmenSinifAta,
  ogretmenSinifIdleriniGetir,
  ogretmenSinifKaldir,
  PERSONEL_ROL_ETIKETLERI,
  personelAdGuncelle,
  personelAktifligiDegistir,
  personelDavetIptal,
  personelEpostaDegistir,
  personelGetir,
  personelKodGonder,
  personelRolDegistir,
  type PersonelRolu,
} from '@/lib/personel';
import { siniflariGetir } from '@/lib/siniflar';
import { useTema } from '@/lib/tema';
import type { Kullanici, Sinif } from '@/lib/tipler';

const ROL_SECENEKLERI: { deger: PersonelRolu; etiket: string }[] = [
  { deger: 'ogretmen', etiket: PERSONEL_ROL_ETIKETLERI.ogretmen },
  { deger: 'kurum_admin', etiket: PERSONEL_ROL_ETIKETLERI.kurum_admin },
];

const mesajaCevir = (e: unknown) => (e instanceof Error ? e.message : 'İşlem yapılamadı, lütfen tekrar deneyin.');

type PersonelVerisi = {
  personel: Kullanici;
  siniflar: Sinif[];
  atananlar: string[];
};

// Öğretmen için kurumunun sınıfları ve atandıkları da gelir; yöneticide ikisi de boştur.
async function personelVerisiniGetir(id: string): Promise<PersonelVerisi> {
  const personel = await personelGetir(id);
  if (personel.rol !== 'ogretmen' || !personel.kurum_id) return { personel, siniflar: [], atananlar: [] };
  const [siniflar, atananlar] = await Promise.all([
    siniflariGetir(personel.kurum_id),
    ogretmenSinifIdleriniGetir(personel.id),
  ]);
  return { personel, siniflar, atananlar };
}

export function PersonelDetay({ id }: { id: string }) {
  const router = useRouter();
  const tema = useTema();
  const { kullanici } = useOturum();
  const [personel, setPersonel] = useState<Kullanici | null>(null);
  const [adSoyad, setAdSoyad] = useState('');
  const [siniflar, setSiniflar] = useState<Sinif[]>([]);
  const [atananlar, setAtananlar] = useState<string[]>([]);
  const [yuklemeHatasi, setYuklemeHatasi] = useState<string | null>(null);

  const [adKaydediliyor, setAdKaydediliyor] = useState(false);
  const [adMesaji, setAdMesaji] = useState<{
    tur: 'hata' | 'basari';
    metin: string;
  } | null>(null);
  const [degisenSinifId, setDegisenSinifId] = useState<string | null>(null);
  const [sinifHatasi, setSinifHatasi] = useState<string | null>(null);
  const [kodGonderiliyor, setKodGonderiliyor] = useState(false);
  const [kodMesaji, setKodMesaji] = useState<{
    tur: 'hata' | 'basari';
    metin: string;
  } | null>(null);
  const [hesapHatasi, setHesapHatasi] = useState<string | null>(null);
  const [hesapDegisiyor, setHesapDegisiyor] = useState(false);
  const [eposta, setEposta] = useState('');
  const [epostaKaydediliyor, setEpostaKaydediliyor] = useState(false);
  const [epostaMesaji, setEpostaMesaji] = useState<{
    tur: 'hata' | 'basari';
    metin: string;
  } | null>(null);
  const [rolDegisiyor, setRolDegisiyor] = useState(false);
  const [rolHatasi, setRolHatasi] = useState<string | null>(null);

  const uygula = (veri: PersonelVerisi) => {
    setPersonel(veri.personel);
    setAdSoyad(veri.personel.ad_soyad);
    setEposta(veri.personel.eposta ?? '');
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
  // Kişi hesabını kullanmaya başlamadıysa adres düzeltilebilir ve davet tümüyle silinebilir.
  const davetBekliyor = personel.aktif && !personel.sifre_belirlendi;
  // Süper admin yalnızca kurum yöneticisi yönetir; görev değişikliği kurum yöneticisinin işidir.
  const rolDegisebilir = kullanici?.rol === 'kurum_admin' && !kendisi && personel.aktif;

  const rolDegistir = async (rol: PersonelRolu) => {
    if (rol === personel.rol) return;
    setRolDegisiyor(true);
    setRolHatasi(null);
    try {
      await personelRolDegistir(personel.id, rol);
      uygula(await personelVerisiniGetir(personel.id));
    } catch (e) {
      setRolHatasi(mesajaCevir(e));
    } finally {
      setRolDegisiyor(false);
    }
  };

  const epostaKaydet = async () => {
    setEpostaKaydediliyor(true);
    setEpostaMesaji(null);
    try {
      const sonuc = await personelEpostaDegistir(personel.id, eposta);
      uygula(await personelVerisiniGetir(personel.id));
      setEpostaMesaji(
        sonuc.eposta_gonderildi
          ? {
              tur: 'basari',
              metin: 'Adres değiştirildi ve yeni adrese giriş kodu gönderildi.',
            }
          : {
              tur: 'hata',
              metin: 'Adres değiştirildi ama kod e-postası gönderilemedi. Aşağıdan yeniden gönderin.',
            },
      );
    } catch (e) {
      setEpostaMesaji({ tur: 'hata', metin: mesajaCevir(e) });
    } finally {
      setEpostaKaydediliyor(false);
    }
  };

  const davetiIptalEt = async () => {
    setHesapHatasi(null);
    try {
      await personelDavetIptal(personel.id);
      router.back();
    } catch (e) {
      setHesapHatasi(mesajaCevir(e));
    }
  };

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
      setKodMesaji({
        tur: 'basari',
        metin: `Giriş kodu ${personel.eposta ?? 'e-posta adresine'} gönderildi.`,
      });
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
        {davetBekliyor ? null : (
          <Girdi etiket="E-posta (değiştirilemez)" value={personel.eposta ?? '—'} editable={false} />
        )}
        {rolDegisebilir ? null : (
          <Girdi
            etiket="Görev"
            value={PERSONEL_ROL_ETIKETLERI[personel.rol as PersonelRolu] ?? personel.rol}
            editable={false}
          />
        )}
        <HataMesaji mesaj={adMesaji?.metin} tur={adMesaji?.tur} />
        <Buton baslik="Kaydet" onPress={adKaydet} yukleniyor={adKaydediliyor} />
      </Kart>

      {davetBekliyor ? (
        <Kart>
          <Text style={tema.yazi.bolum}>E-posta</Text>
          <Text style={tema.yazi.kucuk}>
            Bu kişi daveti henüz kabul etmedi. Adres yanlış yazıldıysa düzeltin; giriş kodu yeni adrese gönderilir.
          </Text>
          <Girdi
            etiket="E-posta"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="off"
            value={eposta}
            onChangeText={setEposta}
            editable={!epostaKaydediliyor}
          />
          <HataMesaji mesaj={epostaMesaji?.metin} tur={epostaMesaji?.tur} />
          <Buton
            tur="ikincil"
            baslik="Adresi Değiştir ve Kod Gönder"
            onPress={epostaKaydet}
            yukleniyor={epostaKaydediliyor}
            pasif={eposta.trim().toLowerCase() === (personel.eposta ?? '')}
          />
        </Kart>
      ) : null}

      {rolDegisebilir ? (
        <Kart>
          <Secenekler
            etiket="Görev"
            secenekler={ROL_SECENEKLERI}
            secili={personel.rol as PersonelRolu}
            onSec={rolDegistir}
            pasif={rolDegisiyor || atananlar.length > 0}
          />
          <Text style={tema.yazi.kucuk}>
            {atananlar.length > 0
              ? 'Görevi değiştirmek için önce aşağıdaki sınıf atamalarını kaldırın.'
              : 'Yönetici bu kurumun sınıflarını, öğrencilerini ve personelini yönetir; öğretmen yalnızca atandığı sınıfları görür.'}
          </Text>
          <HataMesaji mesaj={rolHatasi} />
        </Kart>
      ) : null}

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
          <Buton
            tur="ikincil"
            ikon="mail-outline"
            baslik="Giriş Kodu Gönder"
            onPress={kodGonder}
            yukleniyor={kodGonderiliyor}
          />
        </Kart>
      ) : null}

      {kendisi ? null : (
        <Kart>
          <Text style={tema.yazi.bolum}>Hesap</Text>
          <Text style={tema.yazi.kucuk}>
            {davetBekliyor
              ? 'Bu kişi daveti henüz kabul etmedi; iptal ederseniz hesabı tümüyle silinir.'
              : personel.aktif
                ? 'Pasifleştirilen kişi uygulamaya giremez ve sınıf atamaları kaldırılır. Girdiği kayıtlar silinmez.'
                : 'Bu hesap pasif. Aktifleştirirseniz kişi yeniden giriş yapabilir; sınıflarını tekrar atamanız gerekir.'}
          </Text>
          <HataMesaji mesaj={hesapHatasi} />
          {davetBekliyor ? (
            <OnayButonu
              etiket="Daveti İptal Et"
              soru="Hesap tümüyle silinsin mi?"
              onayEtiketi="Evet, iptal et"
              onOnay={davetiIptalEt}
            />
          ) : personel.aktif ? (
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
