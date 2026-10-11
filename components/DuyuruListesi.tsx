// "Duyurular" sekmesinin gövdesi (kurum admini, öğretmen, veli). RLS kapsamdaki duyuruları
// döndürür; `yazabilir` verilirse başlıkta "+" ve kullanıcının değiştirebildiği duyurularda
// düzenleme kalemi gösterilir (silme düzenleme ekranındadır; veritabanı yine de son sözü söyler).
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { BaslikEkleButonu } from '@/components/BaslikEkleButonu';
import { DuyuruKarti } from '@/components/DuyuruKarti';
import { Ekran } from '@/components/Ekran';
import { IkonButon } from '@/components/IkonButon';
import { Liste } from '@/components/Liste';
import { type DuyuruSatiri, duyurulariGetir } from '@/lib/duyurular';
import { useOturum } from '@/lib/oturum';

export function DuyuruListesi({ yazabilir = false }: { yazabilir?: boolean }) {
  const router = useRouter();
  const { kullanici, kurum } = useOturum();
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
