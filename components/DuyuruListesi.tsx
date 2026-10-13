// "Duyurular" sekmesinin gövdesi (kurum admini, öğretmen, veli). RLS kapsamdaki duyuruları
// döndürür; `yazabilir` verilirse başlıkta "+" ve kullanıcının değiştirebildiği duyurularda
// düzenleme kalemi gösterilir (silme düzenleme ekranındadır; veritabanı yine de son sözü söyler).
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';

import { BaslikEkleButonu } from '@/components/BaslikEkleButonu';
import { DuyuruKarti } from '@/components/DuyuruKarti';
import { Ekran } from '@/components/Ekran';
import { IkonButon } from '@/components/IkonButon';
import { Liste } from '@/components/Liste';
import {
  DUYURU_TURU_ETIKETLERI,
  type DuyuruSatiri,
  duyurulariGetir,
  etkinlikZamaniniBicimle,
  etkinlikZamaniniParcala,
} from '@/lib/duyurular';
import { useOturum } from '@/lib/oturum';
import { tarihiBicimle } from '@/lib/tarih';
import { useTema } from '@/lib/tema';

export function DuyuruListesi({ yazabilir = false }: { yazabilir?: boolean }) {
  const router = useRouter();
  const { kullanici, kurum } = useOturum();
  const tema = useTema();
  const [duyurular, setDuyurular] = useState<DuyuruSatiri[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const yenile = useCallback(async () => {
    setHata(null);
    try {
      setDuyurular(await duyurulariGetir());
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      yenile();
    }, [yenile]),
  );

  // Öğretmen yalnızca kendi yazdığını; yönetici kendi kurumundaki ve altındaki birimlerdeki
  // duyuruları değiştirir. Üst birimden gelen duyuruyu yalnızca okur.
  const degistirebilir = (d: DuyuruSatiri) => {
    if (!yazabilir || !kullanici) return false;
    if (kullanici.rol === 'ogretmen') return d.giren_kullanici_id === kullanici.id;
    return kurum !== null && !kurum.yol.slice(0, -1).includes(d.kurum_id);
  };

  return (
    <Ekran>
      {yazabilir ? <BaslikEkleButonu etiket="Yeni duyuru" onPress={() => router.push('/yeni-duyuru')} /> : null}
      <Liste
        veri={duyurular}
        hata={hata}
        onYenile={yenile}
        anahtar={(d) => d.id}
        bosIkon="megaphone-outline"
        bosBaslik="Henüz duyuru yok"
        bosAciklama={yazabilir ? 'Sağ üstteki + ile ilk duyuruyu yazın.' : 'Kurumunuzun duyuruları ve etkinlikleri burada görünür.'}
        // 'web' düzeninde tablo: duyurunun okunacağı ayrı bir ekran olmadığı için başlık ve içerik aynı
        // hücrede, kısaltılmadan yazılır.
        sutunlar={[
          { anahtar: 'tur', baslik: 'Tür', genislik: 90, icerik: (d) => DUYURU_TURU_ETIKETLERI[d.tur] },
          {
            anahtar: 'duyuru',
            baslik: 'Duyuru',
            icerik: (d) => (
              <View style={{ gap: 2, paddingVertical: tema.bosluk.s }}>
                <Text style={[tema.yazi.govde, { fontFamily: tema.yaziTipi.yariKalin }]}>{d.baslik}</Text>
                {d.icerik ? <Text style={tema.yazi.kucuk}>{d.icerik}</Text> : null}
              </View>
            ),
          },
          {
            anahtar: 'etkinlik',
            baslik: 'Etkinlik',
            genislik: 220,
            // Zaman ve yer kısaltılmadan, gerekirse iki satırda.
            icerik: (d) =>
              d.etkinlik_zamani ? (
                <Text style={tema.yazi.govde}>
                  {[etkinlikZamaniniBicimle(d.etkinlik_zamani), d.yer].filter(Boolean).join(' · ')}
                </Text>
              ) : null,
          },
          { anahtar: 'kapsam', baslik: 'Kapsam', genislik: 160, icerik: (d) => d.sinif_adi ?? d.kurum_adi ?? 'Tüm kurum' },
          {
            anahtar: 'tarih',
            baslik: 'Tarih',
            genislik: 170,
            icerik: (d) => tarihiBicimle(etkinlikZamaniniParcala(d.olusturma_tarihi).tarih),
          },
          ...(yazabilir
            ? [
                {
                  anahtar: 'duzenle',
                  baslik: '',
                  genislik: 56,
                  hizalama: 'sag' as const,
                  icerik: (d: DuyuruSatiri) =>
                    degistirebilir(d) ? (
                      <IkonButon ikon="create-outline" etiket="Düzenle" onPress={() => router.push(`/duyuru-duzenle/${d.id}`)} />
                    ) : null,
                },
              ]
            : []),
        ]}
        satir={(d) => (
          <DuyuruKarti
            duyuru={d}
            eylemler={
              degistirebilir(d) ? (
                <IkonButon ikon="create-outline" etiket="Düzenle" onPress={() => router.push(`/duyuru-duzenle/${d.id}`)} />
              ) : undefined
            }
          />
        )}
      />
    </Ekran>
  );
}
