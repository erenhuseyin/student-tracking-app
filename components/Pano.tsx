// Pano (dashboard): seçilen birimin ve altındaki tüm birimlerin özeti — sayılar, katılım, haftalık
// eğilim, alt birim karşılaştırması, "en"ler, yoklama düzeni, eğitim ilerlemesi ve il haritası.
//
// Erişim: yönetici (kurum_admin) birim seçer: tüm kurum ya da müşterinin herhangi bir birimi —
// kendi kapsamı dışındakiler dahil, ama yalnızca toplam olarak. Öğretmen (`sabit`) yalnızca kendi
// birimini görür; birim seçimi ve harita yoktur. Veli pano görmez. Yetkiyi sunucu denetler
// (lib/pano.ts); burada öğrenci, veli ya da sınıf adı gösterilmez.
import { useFocusEffect } from 'expo-router';
import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Buton } from '@/components/Buton';
import { CubukGrafik } from '@/components/CubukGrafik';
import { Ekran } from '@/components/Ekran';
import { HataMesaji } from '@/components/HataMesaji';
import { Ikon } from '@/components/Ikon';
import { IlerlemeCubugu } from '@/components/IlerlemeCubugu';
import { Kart } from '@/components/Kart';
import { KatilimDagilimi } from '@/components/KatilimDagilimi';
import { MetrikKarti } from '@/components/MetrikKarti';
import { Rozet } from '@/components/Rozet';
import { Secenekler } from '@/components/Secenekler';
import { Sayfalama } from '@/components/Sayfalama';
import { Secim } from '@/components/Secim';
import { Tablo, type TabloSiralamasi, type TabloSutunu } from '@/components/Tablo';
import { TurkiyeHaritasi } from '@/components/TurkiyeHaritasi';
import { Yukleniyor } from '@/components/Yukleniyor';
import type { HaritaOlcusu } from '@/lib/haritaRenkleri';
import { yuzdeMetni } from '@/lib/katilim';
import { useOturum } from '@/lib/oturum';
import { useOzellik } from '@/lib/ozellikler';
import {
  enleriBul,
  ilEtiketi,
  oran,
  PANO_DONEMLERI,
  type PanoBirimi,
  type PanoDonemi,
  type PanoIli,
  panoIlleriniGetir,
  type PanoOzeti,
  panoOzetiniGetir,
  panoCinsiyetiniGetir,
  cinsiyetMetni,
  type PanoCinsiyet,
} from '@/lib/pano';
import { EN_FAZLA_SEVIYE, seviyeAdi, seviyeAdiCogul, seviyeAdiKucuk } from '@/lib/seviye';
import { haftaAraligiBicimle } from '@/lib/tarih';
import { type Tema, useKirilma, useTema } from '@/lib/tema';

// 'YYYY-AA-GG' -> '07.09' (grafik ekseni; dar sütuna sığsın diye sayısal)
const kisaTarih = (t: string) => `${t.slice(8, 10)}.${t.slice(5, 7)}`;

// İl tablosunda ilk gösterilen il sayısı (gerisi "Tüm iller" ile).
const IL_SINIRI = 8;
// Alt birim tablosunun sayfa boyutu (ağaç büyükken kart ekranı uzatmasın).
const BIRIM_SAYFA_BOYUTU = 10;

const HARITA_OLCULERI: { deger: HaritaOlcusu; etiket: string }[] = [
  { deger: 'katilim', etiket: 'Katılım oranı' },
  { deger: 'ogrenci', etiket: 'Öğrenci sayısı' },
];

type Props = {
  // Öğretmen: birim sabittir (kendi kurumu); seçim, alta inme ve harita yoktur.
  sabit?: boolean;
  // Panonun altına eklenen, çağıranın kendi kapsamına ait kartlar (ör. bugünkü yoklama listesi).
  alt?: ReactNode;
};

export function Pano({ sabit = false, alt }: Props) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const genisPencere = useKirilma() === 'masaustu';
  const masaustu = tema.duzen === 'web' && genisPencere;
  // Telefonda tablolar yatay kaymasın diye yalnızca ad, öğrenci ve katılım sütunları gösterilir.
  const mobil = tema.duzen === 'mobil';
  const { kurum, kokKurum } = useOturum();
  const icerikAcik = useOzellik('icerik_takibi');

  const [secilenId, setSecilenId] = useState<string | null>(null);
  const [donem, setDonem] = useState<PanoDonemi>('dort_hafta');
  const [ozet, setOzet] = useState<PanoOzeti | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  // Birim seçimi için müşterinin tüm ağacı (yönetici kendi dışındaki birimlerin adını RLS ile
  // okuyamaz; pano fonksiyonu birim adlarını verir).
  const [agac, setAgac] = useState<PanoBirimi[]>([]);
  const [iller, setIller] = useState<PanoIli[] | null>(null);
  const [haritaOlcusu, setHaritaOlcusu] = useState<HaritaOlcusu>('katilim');
  const [secilenIl, setSecilenIl] = useState<PanoIli | null>(null);
  const [tumIller, setTumIller] = useState(false);
  const [cinsiyet, setCinsiyet] = useState<PanoCinsiyet | null>(null);
  const [siralama, setSiralama] = useState<TabloSiralamasi>({ anahtar: 'ogrenci', yon: 'azalan' });
  const [birimSayfasi, setBirimSayfasi] = useState(0);

  const birimId = secilenId ?? kurum?.id ?? null;
  const kokId = kokKurum?.id ?? null;

  useFocusEffect(
    useCallback(() => {
      if (!birimId) return;
      let iptalEdildi = false;
      setHata(null);
      panoOzetiniGetir(birimId, donem)
        .then((veri) => {
          if (!iptalEdildi) setOzet(veri);
        })
        .catch((e: Error) => {
          if (!iptalEdildi) setHata(e.message);
        });
      // Okunamazsa (ör. veritabanı güncellenmemiş) kırılım satırı gösterilmez.
      panoCinsiyetiniGetir(birimId)
        .then((veri) => {
          if (!iptalEdildi) setCinsiyet(veri);
        })
        .catch(() => {
          if (!iptalEdildi) setCinsiyet(null);
        });
      return () => {
        iptalEdildi = true;
      };
    }, [birimId, donem]),
  );

  useFocusEffect(
    useCallback(() => {
      if (sabit || !kokId) return;
      let iptalEdildi = false;
      // Ağaç ve harita okunamazsa pano yine çalışır; seçim kutusu ve harita boş kalır.
      panoOzetiniGetir(kokId, 'hafta')
        .then((veri) => {
          if (!iptalEdildi) setAgac(veri.birimler);
        })
        .catch(() => {});
      panoIlleriniGetir(donem)
        .then((veri) => {
          if (!iptalEdildi) setIller(veri);
        })
        .catch(() => {
          if (!iptalEdildi) setIller([]);
        });
      return () => {
        iptalEdildi = true;
      };
    }, [sabit, kokId, donem]),
  );

  const birimSec = (id: string) => {
    setSecilenId(id);
    setSecilenIl(null);
    setBirimSayfasi(0);
  };

  // Kademeli birim süzgeci: her seviye için bir seçim kutusu (adları markadan). Bir kutunun
  // seçenekleri üstündeki kutuda seçilen birimin doğrudan altındakilerdir; üstü seçilmemişse ya da
  // altında birim yoksa kutu pasiftir. Seçili zincir `birimId`den yukarı yürünerek türetilir; böylece
  // haritadan, tablodan ya da yol satırından yapılan seçim de kutulara yansır.
  const filtreler = useMemo(() => {
    if (!kokId) return [];
    const dugum = new Map(agac.map((b) => [b.id, b]));
    const zincir = new Map<number, string>();
    for (let b = birimId ? dugum.get(birimId) : undefined; b; b = b.ust_kurum_id ? dugum.get(b.ust_kurum_id) : undefined) {
      zincir.set(b.seviye, b.id);
    }
    const enDerin = Math.min(EN_FAZLA_SEVIYE, Math.max(1, ...agac.map((b) => b.seviye)));
    return Array.from({ length: enDerin - 1 }, (_, i) => {
      const seviye = i + 2;
      const ustId = seviye === 2 ? kokId : (zincir.get(seviye - 1) ?? null);
      const secenekler = ustId
        ? agac
            .filter((b) => b.ust_kurum_id === ustId)
            .map((b) => ({ deger: b.id, etiket: b.ad }))
            .sort((x, y) => x.etiket.localeCompare(y.etiket, 'tr'))
        : [];
      return { seviye, ustId, secenekler, secili: zincir.get(seviye) ?? null };
    });
  }, [agac, kokId, birimId]);

  const altBirimler = useMemo(() => {
    if (!ozet) return [];
    const dogrudan = ozet.birimler.filter((b) => b.ust_kurum_id === ozet.birim.id);
    const deger = (b: PanoBirimi): number | string => {
      if (siralama.anahtar === 'ad') return b.ad;
      if (siralama.anahtar === 'katilim') return oran(b.katildi, b.gelmedi) ?? -1;
      if (siralama.anahtar === 'duzen') return b.planli === 0 ? -1 : b.alinan / b.planli;
      return b[siralama.anahtar as 'ogrenci' | 'sinif' | 'ogretmen'];
    };
    const yon = siralama.yon === 'artan' ? 1 : -1;
    return [...dogrudan].sort((a, b) => {
      const [x, y] = [deger(a), deger(b)];
      return (typeof x === 'string' ? x.localeCompare(y as string, 'tr') : x - (y as number)) * yon;
    });
  }, [ozet, siralama]);

  const katilimRozeti = useCallback(
    (katildi: number, gelmedi: number) => {
      const o = oran(katildi, gelmedi);
      const r = tema.katilimRengi(o);
      return <Rozet metin={yuzdeMetni(o)} renk={r.renk} zemin={r.soluk} />;
    },
    [tema],
  );

  const birimSutunlari = useMemo<TabloSutunu<PanoBirimi>[]>(() => {
    const sutunlar: TabloSutunu<PanoBirimi>[] = [
      {
        anahtar: 'ad',
        baslik: 'Birim',
        // Telefonda dar sütunda tek satıra kırpılınca birimler ayırt edilemiyor ("Genç Ha…").
        icerik: (b) =>
          mobil ? (
            <Text style={tema.yazi.govde} numberOfLines={2}>
              {b.ad}
            </Text>
          ) : (
            b.ad
          ),
        siralanabilir: true,
      },
      { anahtar: 'ogrenci', baslik: 'Öğrenci', icerik: (b) => b.ogrenci, genislik: mobil ? 68 : 90, hizalama: 'sag', siralanabilir: true },
      { anahtar: 'sinif', baslik: 'Sınıf', icerik: (b) => b.sinif, genislik: 80, hizalama: 'sag', siralanabilir: true, ikincil: true },
      { anahtar: 'ogretmen', baslik: 'Öğretmen', icerik: (b) => b.ogretmen, genislik: 100, hizalama: 'sag', siralanabilir: true, ikincil: true },
      { anahtar: 'katilim', baslik: 'Katılım', icerik: (b) => katilimRozeti(b.katildi, b.gelmedi), genislik: mobil ? 76 : 110, siralanabilir: true },
      {
        anahtar: 'duzen',
        baslik: 'Yoklama Düzeni',
        icerik: (b) => (b.planli === 0 ? '—' : `%${Math.round((b.alinan / b.planli) * 100)}`),
        genislik: 140,
        hizalama: 'sag',
        siralanabilir: true,
        ikincil: true,
      },
    ];
    return mobil ? sutunlar.filter((s) => !s.ikincil) : sutunlar;
  }, [katilimRozeti, mobil, tema]);

  const ilSutunlari = useMemo<TabloSutunu<PanoIli>[]>(() => {
    const sutunlar: TabloSutunu<PanoIli>[] = [
      { anahtar: 'il', baslik: 'İl', icerik: ilEtiketi },
      { anahtar: 'ogrenci', baslik: 'Öğrenci', icerik: (i) => i.ogrenci, genislik: mobil ? 64 : 90, hizalama: 'sag' },
      { anahtar: 'alt', baslik: 'Alt Birim', icerik: (i) => i.alt_birim, genislik: 100, hizalama: 'sag', ikincil: true },
      { anahtar: 'katilim', baslik: 'Katılım', icerik: (i) => katilimRozeti(i.katildi, i.gelmedi), genislik: mobil ? 76 : 110 },
    ];
    return mobil ? sutunlar.filter((s) => !s.ikincil) : sutunlar;
  }, [katilimRozeti, mobil]);

  const ilSec = (il: PanoIli) => {
    if (il.dugumler.length === 1) birimSec(il.dugumler[0].id);
    else setSecilenIl(il);
  };

  if (!ozet) {
    return <Ekran kaydirilabilir>{hata ? <HataMesaji mesaj={hata} /> : <Yukleniyor />}</Ekran>;
  }

  const { sayilar, katilim, yoklama_duzeni: duzen, egitim } = ozet;
  const donemOrani = oran(katilim.geldi + katilim.gec, katilim.gelmedi);
  const oncekiOran = oran(ozet.onceki_katilim.katildi, ozet.onceki_katilim.gelmedi);
  const fark = donemOrani !== null && oncekiOran !== null ? Math.round((donemOrani - oncekiOran) * 100) : null;
  const altSeviye = ozet.birim.seviye + 1;
  const enler = enleriBul(altBirimler, seviyeAdiKucuk(altSeviye));
  // Öğrencisi çok olan il önce; tablo kartı uzatmasın diye ilk IL_SINIRI il gösterilir, gerisi
  // "Tüm iller" ile açılır (birimi olup henüz öğrencisi olmayan iller sona düşer).
  const sonIller = [...(iller ?? [])].sort((a, b) => b.ogrenci - a.ogrenci || b.alt_birim - a.alt_birim);
  const gorunenIller = tumIller ? sonIller : sonIller.slice(0, IL_SINIRI);
  // Birim değişince sayfa sıfırlanır; sayfa listenin sonunu aşarsa (ör. dönem değişti) son sayfaya düşer.
  const birimSayfaSayisi = Math.max(1, Math.ceil(altBirimler.length / BIRIM_SAYFA_BOYUTU));
  const gecerliBirimSayfasi = Math.min(birimSayfasi, birimSayfaSayisi - 1);
  const gorunenAltBirimler = altBirimler.slice(
    gecerliBirimSayfasi * BIRIM_SAYFA_BOYUTU,
    (gecerliBirimSayfasi + 1) * BIRIM_SAYFA_BOYUTU,
  );

  // Harita (telefonda il tablosu) birim seçtiği için süzgeçlerin hemen altında durur.
  const haritaKarti =
    sabit || iller === null ? null : (
      <Kart>
        <Text style={tema.yazi.bolum}>İllere göre (tüm kurum)</Text>
        {iller.length === 0 ? (
          <Text style={tema.yazi.kucuk}>
            Haritada görünmesi için birimlere il atayın: ilgili birimin düzenleme ekranında &quot;İl&quot; alanı. Bir
            birime atanan il, altındaki birimler için de geçerlidir.
          </Text>
        ) : (
          <>
            <View style={styles.olcuAlani}>
              <Secenekler secenekler={HARITA_OLCULERI} secili={haritaOlcusu} onSec={setHaritaOlcusu} />
            </View>
            <View style={styles.izgara}>
              {masaustu ? (
                <View style={styles.haritaAlani}>
                  <TurkiyeHaritasi iller={iller} olcu={haritaOlcusu} seciliIl={secilenIl?.il_kodu ?? null} onIlSec={ilSec} />
                </View>
              ) : null}
              <View style={styles.ilTablosu}>
                <Tablo veri={gorunenIller} sutunlar={ilSutunlari} anahtar={(i) => String(i.il_kodu)} onPress={ilSec} />
                {sonIller.length > IL_SINIRI ? (
                  <Buton
                    tur="ikincil"
                    ikon={tumIller ? 'chevron-up' : 'chevron-down'}
                    baslik={tumIller ? 'Daha az göster' : `Tüm iller (${sonIller.length})`}
                    onPress={() => setTumIller((t) => !t)}
                  />
                ) : null}
              </View>
            </View>
            {secilenIl ? (
              <View style={styles.yol}>
                <Text style={tema.yazi.kucuk}>
                  {ilEtiketi(secilenIl)}
                  {secilenIl.dugumler.length === 0 ? ': bu ile doğrudan atanmış birim yok.' : ' birimleri:'}
                </Text>
                {secilenIl.dugumler.map((d) => (
                  <Pressable key={d.id} accessibilityRole="button" onPress={() => birimSec(d.id)}>
                    <Text style={styles.yolBaglantisi}>{d.ad}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </>
        )}
      </Kart>
    );

  return (
    <Ekran kaydirilabilir genis>
      <View style={styles.ustSatir}>
        {sabit ? null : (
          filtreler.map((f) => (
            <View key={f.seviye} style={styles.secimAlani}>
              <Secim
                etiket={seviyeAdi(f.seviye)}
                secenekler={f.secenekler}
                secili={f.secili}
                // Seçim kaldırılınca bir üst seviyede seçili birime (yoksa tüm kuruma) dönülür.
                onSec={(id) => birimSec(id ?? f.ustId ?? kokId ?? '')}
                bosEtiket="Tümü"
                pasif={f.secenekler.length === 0}
              />
            </View>
          ))
        )}
        <View style={styles.donemAlani}>
          <Secenekler etiket="Dönem" secenekler={PANO_DONEMLERI} secili={donem} onSec={setDonem} />
        </View>
      </View>

      {haritaKarti}

      <View style={styles.yol}>
        {ozet.birim.yol.map((d, i) => {
          const son = i === ozet.birim.yol.length - 1;
          return (
            <View key={d.id} style={styles.yolOgesi}>
              {i > 0 ? <Ikon ad="chevron-forward" boyut={14} renk={tema.renkler.kenarlik} /> : null}
              {son || sabit ? (
                <Text style={son ? tema.yazi.bolum : tema.yazi.kucuk}>{d.ad}</Text>
              ) : (
                <Pressable accessibilityRole="button" accessibilityLabel={`${d.ad} birimine çık`} onPress={() => birimSec(d.id)}>
                  <Text style={styles.yolBaglantisi}>{d.ad}</Text>
                </Pressable>
              )}
            </View>
          );
        })}
        <Text style={tema.yazi.kucuk}>· {seviyeAdi(ozet.birim.seviye)}</Text>
      </View>
      <HataMesaji mesaj={hata} />

      <View style={styles.izgara}>
        <MetrikKarti deger={sayilar.ogrenci} etiket="Öğrenci" ikon="people-outline" />
        <MetrikKarti deger={sayilar.sinif} etiket="Sınıf" ikon="school-outline" />
        <MetrikKarti deger={sayilar.ogretmen} etiket="Öğretmen" ikon="person-outline" />
        {sayilar.alt_birim > 0 ? <MetrikKarti deger={sayilar.alt_birim} etiket="Alt birim" ikon="business-outline" /> : null}
      </View>
      <Text style={tema.yazi.kucuk}>
        Dönemde {sayilar.yeni_kayit} yeni kayıt · {sayilar.pasif_ogrenci} pasif (ayrılmış) öğrenci · veli girişi açık:{' '}
        {sayilar.veli_girisi_acik}/{sayilar.ogrenci} · {sayilar.yonetici} yönetici
      </Text>
      {cinsiyet ? (
        <Text style={tema.yazi.kucuk}>
          Öğrenci: {cinsiyetMetni(cinsiyet.ogrenci)} · Öğretmen: {cinsiyetMetni(cinsiyet.ogretmen)}
        </Text>
      ) : null}

      <View style={styles.izgara}>
        <View style={styles.hucre}>
          <Kart>
            <Text style={tema.yazi.bolum}>Katılım</Text>
            <View style={styles.oranSatiri}>
              <Text style={tema.yazi.metrik}>{yuzdeMetni(donemOrani)}</Text>
              {fark !== null ? (
                <View style={styles.fark}>
                  <Ikon
                    ad={fark > 0 ? 'trending-up' : fark < 0 ? 'trending-down' : 'remove'}
                    boyut={18}
                    renk={fark > 0 ? tema.renkler.basari : fark < 0 ? tema.renkler.hata : tema.renkler.metinIkincil}
                  />
                  <Text style={tema.yazi.kucuk}>
                    önceki döneme göre {fark > 0 ? `${fark} puan arttı` : fark < 0 ? `${-fark} puan düştü` : 'aynı'}
                  </Text>
                </View>
              ) : null}
            </View>
            <KatilimDagilimi sayilar={katilim} />
            <Text style={tema.yazi.kucuk}>Geç gelen katılmış sayılır; mazeretli orana girmez.</Text>
          </Kart>
        </View>

        <View style={styles.hucre}>
          <Kart>
            <Text style={tema.yazi.bolum}>Haftalık katılım (son 12 hafta)</Text>
            <CubukGrafik
              cubuklar={ozet.haftalik.map((h) => {
                const o = oran(h.katildi, h.gelmedi);
                return {
                  anahtar: h.hafta,
                  etiket: kisaTarih(h.hafta),
                  deger: o,
                  ipucu:
                    o === null
                      ? `${haftaAraligiBicimle(h.hafta)}: yoklama yok`
                      : `${haftaAraligiBicimle(h.hafta)}: ${yuzdeMetni(o)} · ${h.katildi + h.gelmedi} yoklama`,
                };
              })}
            />
          </Kart>
        </View>
      </View>

      {altBirimler.length > 0 ? (
        <Kart>
          <Text style={tema.yazi.bolum}>{seviyeAdiCogul(altSeviye)}</Text>
          {sabit ? null : <Text style={tema.yazi.kucuk}>Satıra dokununca o birimin özetine inilir.</Text>}
          <Tablo
            veri={gorunenAltBirimler}
            sutunlar={birimSutunlari}
            anahtar={(b) => b.id}
            onPress={sabit ? undefined : (b) => birimSec(b.id)}
            siralama={siralama}
            onSirala={(anahtar) => {
              setSiralama((s) => ({ anahtar, yon: s.anahtar === anahtar && s.yon === 'azalan' ? 'artan' : 'azalan' }));
              setBirimSayfasi(0);
            }}
            enAzGenislik={mobil ? undefined : 720}
          />
          {altBirimler.length > BIRIM_SAYFA_BOYUTU ? (
            <Sayfalama
              sayfa={gecerliBirimSayfasi}
              sayfaBoyutu={BIRIM_SAYFA_BOYUTU}
              toplam={altBirimler.length}
              onDegis={setBirimSayfasi}
            />
          ) : null}
        </Kart>
      ) : null}

      {enler.length > 0 ? (
        <View style={styles.izgara}>
          {enler.map((e) => (
            <Pressable
              key={e.anahtar}
              accessibilityRole="button"
              accessibilityLabel={`${e.baslik}: ${e.birim.ad}, ${e.deger}`}
              disabled={sabit}
              onPress={() => birimSec(e.birim.id)}
              style={({ pressed }) => [styles.en, pressed && styles.basili]}
            >
              <View style={styles.enBasligi}>
                <Ikon
                  ad={e.ton === 'dikkat' ? 'alert-circle-outline' : 'trophy-outline'}
                  boyut={16}
                  renk={e.ton === 'dikkat' ? tema.renkler.uyari : tema.renkler.anaParlak}
                />
                <Text style={[tema.yazi.kucuk, styles.esnek]} numberOfLines={1}>
                  {e.baslik}
                </Text>
              </View>
              <Text style={tema.yazi.bolum} numberOfLines={1}>
                {e.birim.ad}
              </Text>
              <Text style={tema.yazi.kucuk}>{e.deger}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.izgara}>
        <View style={styles.hucre}>
          <Kart>
            <Text style={tema.yazi.bolum}>Yoklama düzeni</Text>
            <Text style={tema.yazi.govde}>
              {duzen.bugun_dersi_olan === 0
                ? 'Bugün ders günü olan sınıf yok.'
                : `Bugün dersi olan ${duzen.bugun_dersi_olan} sınıfın ${duzen.bugun_alinan}'inin yoklaması alındı.`}
            </Text>
            {duzen.planli > 0 ? (
              <IlerlemeCubugu tamam={duzen.alinan} toplam={duzen.planli} etiket="Dönemde yoklaması alınan dersler" />
            ) : (
              <Text style={tema.yazi.kucuk}>Bu dönemde planlı ders günü yok (sınıfların ders günleri belirlenmemiş olabilir).</Text>
            )}
          </Kart>
        </View>

        {icerikAcik ? (
          <View style={styles.hucre}>
            <Kart>
              <Text style={tema.yazi.bolum}>Eğitim ilerlemesi</Text>
              {egitim.toplam_konu > 0 ? (
                <IlerlemeCubugu tamam={egitim.islenen_konu} toplam={egitim.toplam_konu} etiket="İşlenen konu" />
              ) : (
                <Text style={tema.yazi.kucuk}>Sınıflara kademe atanmamış; konu ilerlemesi hesaplanamıyor.</Text>
              )}
              <Text style={tema.yazi.govde}>
                Ezber: {egitim.ezber_tamam} tamamlandı, {egitim.ezber_devam} devam ediyor
              </Text>
              <Text style={tema.yazi.govde}>
                Kitap: dönemde {egitim.kitap_biten} bitti, {egitim.kitap_okunan} okunuyor
              </Text>
              <Text style={tema.yazi.govde}>Gelişim kaydı: dönemde {egitim.gelisim_kaydi}</Text>
            </Kart>
          </View>
        ) : null}
      </View>

      {alt}
    </Ekran>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    esnek: {
      flex: 1,
    },
    ustSatir: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'flex-end',
      gap: t.bosluk.m,
    },
    // Satır sarılır; dar telefonda tek kalan öğe taban genişliğinden de daralabilmeli (RN'de
    // flexShrink varsayılanı 0, yoksa kutu ekrandan taşar).
    secimAlani: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 180,
      maxWidth: 280,
    },
    donemAlani: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 300,
      maxWidth: 440,
    },
    yol: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: t.bosluk.s,
    },
    yolOgesi: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.s,
    },
    yolBaglantisi: {
      ...t.yazi.govde,
      color: t.renkler.ana,
      textDecorationLine: 'underline',
    },
    izgara: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: t.bosluk.m,
    },
    hucre: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 340,
      minWidth: 0,
    },
    haritaAlani: {
      flexGrow: 2,
      flexShrink: 1,
      flexBasis: 560,
      minWidth: 0,
    },
    ilTablosu: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 420,
      minWidth: 0,
      gap: t.bosluk.s,
    },
    olcuAlani: {
      maxWidth: 360,
    },
    oranSatiri: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: t.bosluk.m,
    },
    fark: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.xs,
    },
    en: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 200,
      gap: t.bosluk.xs,
      padding: t.bosluk.l,
      borderRadius: t.yaricap.l,
      borderWidth: 1,
      borderColor: t.renkler.ayirici,
      backgroundColor: t.renkler.yuzey,
    },
    enBasligi: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.bosluk.xs,
    },
    basili: {
      opacity: 0.6,
    },
  });
}
