// Erişim: yalnızca super_admin
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { BaslikEkleButonu } from '@/components/BaslikEkleButonu';
import { Ekran } from '@/components/Ekran';
import { Ikon } from '@/components/Ikon';
import { Liste } from '@/components/Liste';
import { ListeSatiri } from '@/components/ListeSatiri';
import { kurumlariGetir } from '@/lib/kurumlar';
import { seviyeAdi } from '@/lib/seviye';
import { useTema } from '@/lib/tema';
import type { Kurum } from '@/lib/tipler';

// Kök kurumlar ada göre, her düğümün altındakiler hemen altında (ad yoluna göre sıralı).
function agacSirasinaDiz(kurumlar: Kurum[]): Kurum[] {
  const adlar = new Map(kurumlar.map((k) => [k.id, k.ad]));
  const anahtar = (k: Kurum) => k.yol.map((id) => adlar.get(id) ?? '').join('\u0000');
  return [...kurumlar].sort((a, b) => anahtar(a).localeCompare(anahtar(b), 'tr'));
}

export default function SuperAdminAnaSayfa() {
  const router = useRouter();
  const tema = useTema();
  const [kurumlar, setKurumlar] = useState<Kurum[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let iptalEdildi = false;
      setHata(null);
      kurumlariGetir()
        .then((veri) => {
          if (!iptalEdildi) setKurumlar(agacSirasinaDiz(veri));
        })
        .catch((e: Error) => {
          if (!iptalEdildi) setHata(e.message);
        });
      return () => {
        iptalEdildi = true;
      };
    }, []),
  );

  return (
    <Ekran>
      <BaslikEkleButonu etiket="Yeni kurum ekle" onPress={() => router.push('/yeni-kurum')} />

      <Liste
        veri={kurumlar}
        hata={hata}
        anahtar={(k) => k.id}
        bosIkon="business-outline"
        bosBaslik="Henüz kurum yok"
        bosAciklama="Sağ üstteki + ile ilk kurumu ekleyin."
        satir={(k) =>
          k.ust_kurum_id ? (
            <View style={{ marginLeft: tema.bosluk.xl * (k.seviye - 1) }}>
              <ListeSatiri
                baslik={k.ad}
                altBaslik={seviyeAdi(k.seviye)}
                onPress={() => router.push(`/kurum/${k.id}`)}
                sol={<Ikon ad="git-branch-outline" renk={tema.renkler.metinIkincil} />}
              />
            </View>
          ) : (
            <ListeSatiri
              baslik={k.ad}
              altBaslik={k.marka_kodu ? `Marka kodu: ${k.marka_kodu}` : 'Marka kodu yok'}
              sol={<Ikon ad="business-outline" boyut={26} renk={tema.renkler.anaParlak} />}
              onPress={() => router.push(`/kurum/${k.id}`)}
            />
          )
        }
      />
    </Ekran>
  );
}
