// Erişim: yalnızca kurum_admin. "Roller": üç sistem rolü (Yönetici, Öğretmen, Veli — değiştirilemez)
// ve müşterinin tanımladığı roller tek tabloda (lib/roller.ts). Tanımlı rol = ad + dayandığı sistem
// rolü (veride `gorev`); veriye erişimi sistem rolü belirler (RLS), tanımlı rol kişinin unvanını ve
// hangi menüleri gördüğünü belirler. Seçilen rolün tanımı ve menüleri sağ paneldedir.
// Rolleri ve menüleri yalnızca kök kurumun (genel merkezin) yöneticisi değiştirir (RLS de bunu
// zorlar); alt birim yöneticisi salt okunur görür, ama kapsamındaki kişilere rol verebilir (Kullanıcılar).
import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Text } from 'react-native';

import { Girdi } from '@/components/Girdi';
import { GorevFormu } from '@/components/GorevFormu';
import { Kart } from '@/components/Kart';
import { ListeSatiri } from '@/components/ListeSatiri';
import { RolMenuleri } from '@/components/RolMenuleri';
import { Rozet } from '@/components/Rozet';
import { Secim } from '@/components/Secim';
import type { TabloSiralamasi, TabloSutunu } from '@/components/Tablo';
import { VeriEkrani } from '@/components/VeriEkrani';
import { kapaliBolumleriGetir, type KapaliBolum, rolSayilariniGetir } from '@/lib/bolumler';
import { gorevKisiSayilariniGetir, gorevleriGetir, type GorevTemelRolu } from '@/lib/gorevler';
import { ROL_ETIKETLERI } from '@/lib/menu';
import { useOturum } from '@/lib/oturum';
import { useTema } from '@/lib/tema';
import type { Gorev } from '@/lib/tipler';

type SistemRolu = 'kurum_admin' | 'ogretmen' | 'veli';
type Satir = {
  anahtar: string;
  ad: string;
  temelRol: SistemRolu;
  tur: 'sistem' | 'ozel';
  kisi: number;
  aciklama: string;
  gorev: Gorev | null;
};

const SISTEM_ROLLERI: SistemRolu[] = ['kurum_admin', 'ogretmen', 'veli'];
const SISTEM_ACIKLAMALARI: Record<SistemRolu, string> = {
  kurum_admin:
    'Bağlı olduğu birimin ve altındaki tüm birimlerin sınıflarını, öğrencilerini ve kullanıcılarını yönetir; üstündeki ya da yanındaki birimleri göremez.',
  ogretmen: 'Yalnızca atandığı sınıfları ve o sınıfların öğrencilerini görür; yoklama ve gelişim kaydı girer.',
  veli: 'Yalnızca kendi çocuğunun kayıtlarını görür.',
};
const TEMEL_ROL_SECENEKLERI = SISTEM_ROLLERI.map((r) => ({ deger: r, etiket: ROL_ETIKETLERI[r] }));
const TUR_SECENEKLERI: { deger: Satir['tur']; etiket: string }[] = [
  { deger: 'sistem', etiket: 'Sistem rolü' },
  { deger: 'ozel', etiket: 'Tanımlı rol' },
];

type Secili = { tur: 'kayit'; anahtar: string } | { tur: 'yeni' } | null;

export default function Roller() {
  const tema = useTema();
  const { kurum, kokKurum } = useOturum();
  const kokKurumMu = kurum !== null && kurum.ust_kurum_id === null;
  const kokKurumId = kokKurum?.id;

  const [satirlar, setSatirlar] = useState<Satir[] | null>(null);
  const [kapalilar, setKapalilar] = useState<KapaliBolum[]>([]);
  const [hata, setHata] = useState<string | null>(null);
  const [arama, setArama] = useState('');
  const [temelRol, setTemelRol] = useState<SistemRolu | null>(null);
  const [tur, setTur] = useState<Satir['tur'] | null>(null);
  const [siralama, setSiralama] = useState<TabloSiralamasi | null>(null);
  const [secili, setSecili] = useState<Secili>(null);

  const yenile = useCallback(async () => {
    setHata(null);
    try {
      const [gorevler, kisiSayilari, rolSayilari, kapali] = await Promise.all([
        gorevleriGetir(),
        gorevKisiSayilariniGetir(),
        rolSayilariniGetir(),
        kokKurumId ? kapaliBolumleriGetir(kokKurumId) : Promise.resolve([]),
      ]);
      setKapalilar(kapali);
      setSatirlar([
        ...SISTEM_ROLLERI.map<Satir>((r) => ({
          anahtar: r,
          ad: ROL_ETIKETLERI[r],
          temelRol: r,
          tur: 'sistem',
          kisi: rolSayilari[r],
          aciklama: SISTEM_ACIKLAMALARI[r],
          gorev: null,
        })),
        ...gorevler.map<Satir>((g) => ({
          anahtar: g.id,
          ad: g.ad,
          temelRol: g.temel_rol as GorevTemelRolu,
          tur: 'ozel',
          kisi: kisiSayilari.get(g.id) ?? 0,
          aciklama: g.aciklama ?? '',
          gorev: g,
        })),
      ]);
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
    }
  }, [kokKurumId]);

  useFocusEffect(
    useCallback(() => {
      yenile();
    }, [yenile]),
  );

  // Liste kısa olduğu için (birkaç on rol) istemcide süzülür ve sıralanır.
  const gorunen = useMemo(() => {
    if (!satirlar) return null;
    const aranan = arama.trim().toLocaleLowerCase('tr');
    const suzulen = satirlar.filter(
      (s) =>
        (!aranan || s.ad.toLocaleLowerCase('tr').includes(aranan)) &&
        (!temelRol || s.temelRol === temelRol) &&
        (!tur || s.tur === tur),
    );
    if (!siralama) return suzulen;
    const yon = siralama.yon === 'artan' ? 1 : -1;
    return [...suzulen].sort((a, b) =>
      siralama.anahtar === 'kisi' ? (a.kisi - b.kisi) * yon : a.ad.localeCompare(b.ad, 'tr') * yon,
    );
  }, [satirlar, arama, temelRol, tur, siralama]);

  const turRozeti = useCallback(
    (s: Satir) =>
      s.tur === 'sistem' ? (
        <Rozet metin="Sistem" renk={tema.renkler.metinIkincil} zemin={tema.renkler.ayirici} />
      ) : (
        <Rozet metin="Tanımlı" renk={tema.renkler.ana} zemin={tema.renkler.anaSoluk} />
      ),
    [tema],
  );

  const sutunlar = useMemo<TabloSutunu<Satir>[]>(
    () => [
      { anahtar: 'ad', baslik: 'Rol', icerik: (s) => s.ad, siralanabilir: true },
      { anahtar: 'temel', baslik: 'Dayandığı Rol', icerik: (s) => (s.tur === 'sistem' ? '—' : ROL_ETIKETLERI[s.temelRol]) },
      { anahtar: 'tur', baslik: 'Tür', icerik: turRozeti, genislik: 120 },
      { anahtar: 'kisi', baslik: 'Kişi', icerik: (s) => s.kisi, genislik: 90, hizalama: 'sag', siralanabilir: true },
    ],
    [turRozeti],
  );

  const seciliSatir = secili?.tur === 'kayit' ? (satirlar?.find((s) => s.anahtar === secili.anahtar) ?? null) : null;
  // Menü değişikliği listeyi yeniden okumadan seçili satıra yansır.
  const gorevGuncellendi = (gorev: Gorev) =>
    setSatirlar((mevcut) => (mevcut ?? []).map((s) => (s.gorev?.id === gorev.id ? { ...s, gorev } : s)));
  const kapatVeYenile = () => {
    setSecili(null);
    yenile();
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Roller' }} />
      <VeriEkrani
        arama={<Girdi etiket="Rol ara" value={arama} onChangeText={setArama} autoCorrect={false} />}
        filtreler={[
          <Secim key="temel" etiket="Dayandığı rol" secenekler={TEMEL_ROL_SECENEKLERI} secili={temelRol} onSec={setTemelRol} bosEtiket="Tümü" />,
          <Secim key="tur" etiket="Tür" secenekler={TUR_SECENEKLERI} secili={tur} onSec={setTur} bosEtiket="Tümü" />,
        ]}
        etkinFiltreSayisi={[temelRol, tur].filter(Boolean).length}
        yeniEtiket={kokKurumMu ? 'Yeni Rol' : undefined}
        onYeni={() => setSecili({ tur: 'yeni' })}
        veri={gorunen}
        hata={hata}
        anahtar={(s) => s.anahtar}
        sutunlar={sutunlar}
        kart={(s) => (
          <ListeSatiri
            baslik={s.ad}
            altBaslik={s.tur === 'sistem' ? `${s.kisi} kişi` : `${ROL_ETIKETLERI[s.temelRol]} rolüne dayanır · ${s.kisi} kişi`}
            sag={turRozeti(s)}
            onPress={() => setSecili({ tur: 'kayit', anahtar: s.anahtar })}
          />
        )}
        bosIkon="shield-checkmark-outline"
        bosBaslik="Eşleşen rol yok"
        seciliAnahtar={seciliSatir?.anahtar ?? null}
        onSec={(s) => setSecili({ tur: 'kayit', anahtar: s.anahtar })}
        siralama={siralama}
        onSirala={(anahtar) =>
          setSiralama((s) => ({ anahtar, yon: s?.anahtar === anahtar && s.yon === 'artan' ? 'azalan' : 'artan' }))
        }
        onYenile={yenile}
        panelBasligi={secili?.tur === 'yeni' ? 'Yeni Rol' : seciliSatir?.ad}
        onPanelKapat={() => setSecili(null)}
        panel={
          secili?.tur === 'yeni' && kokKurum ? (
            <GorevFormu key="yeni" gorev={null} kokKurumId={kokKurum.id} saltOkunur={false} onKaydedildi={kapatVeYenile} onSilindi={kapatVeYenile} />
          ) : seciliSatir?.gorev && kokKurum ? (
            <>
              <GorevFormu
                key={seciliSatir.gorev.id}
                gorev={seciliSatir.gorev}
                kokKurumId={kokKurum.id}
                saltOkunur={!kokKurumMu}
                onKaydedildi={yenile}
                onSilindi={kapatVeYenile}
              >
                <RolMenuleri
                  key={`menu-${seciliSatir.anahtar}`}
                  temelRol={seciliSatir.temelRol}
                  gorev={seciliSatir.gorev}
                  kokKurumId={kokKurum.id}
                  kapalilar={kapalilar}
                  degistirebilir={kokKurumMu}
                  onKapalilarDegisti={setKapalilar}
                  onGorevDegisti={gorevGuncellendi}
                />
                <Kart>
                  <Text style={tema.yazi.kucuk}>
                    {seciliSatir.kisi} kişi bu rolde. Rol kişilere Kullanıcılar ekranından verilir.
                  </Text>
                </Kart>
              </GorevFormu>
            </>
          ) : seciliSatir && kokKurum ? (
            <>
              <Kart>
                <Text style={tema.yazi.govde}>{seciliSatir.aciklama}</Text>
                <Text style={tema.yazi.kucuk}>
                  {seciliSatir.kisi} kişi. Sistem rolleri değiştirilemez ve silinemez
                  {seciliSatir.temelRol === 'veli'
                    ? '.'
                    : '; bu role dayanan kendi rollerinizi tanımlayabilirsiniz (ör. İstişare üyesi, Abi).'}
                </Text>
              </Kart>
              <RolMenuleri
                key={`menu-${seciliSatir.anahtar}`}
                temelRol={seciliSatir.temelRol}
                gorev={null}
                kokKurumId={kokKurum.id}
                kapalilar={kapalilar}
                degistirebilir={kokKurumMu}
                onKapalilarDegisti={setKapalilar}
                onGorevDegisti={gorevGuncellendi}
              />
            </>
          ) : null
        }
      />
    </>
  );
}
