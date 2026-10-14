// Yöneticinin "Konu Notları" listesi: kapsamındaki sınıfların konu notları (RLS: yönettiği
// kurumlar), sınıf, ders, konu ve hoca adlarıyla. Okunmamış = henüz hiçbir yöneticinin görmediği not.
// Erişim: yalnızca kurum_admin (öğretmen kendi sınıfının notlarını ders takibinde görür).
import { supabase } from '@/lib/supabase';

const LISTE_SINIRI = 500;

export type KonuNotuSatiri = {
  anahtar: string;
  sinifId: string;
  sinifAdi: string;
  kurumId: string;
  konuId: string;
  konuAdi: string;
  dersAdi: string;
  notMetni: string;
  yazilmaZamani: string;
  goruldu: boolean;
  yanitVar: boolean;
  hocalar: { id: string; ad: string }[];
};

function hataMesajinaCevir(mesaj: string): string {
  if (/network|fetch/i.test(mesaj)) return 'Bağlantı sorunu, lütfen tekrar deneyin.';
  return 'Konu notları alınamadı, lütfen tekrar deneyin.';
}

export async function konuNotlariniGetir(): Promise<KonuNotuSatiri[]> {
  const { data, error } = await supabase
    .from('sinif_konu_notu')
    .select('sinif_id, konu_id, kurum_id, not_metni, yazilma_zamani, goruldu_zamani, yanit_metni, sinif (ad), ders_konusu (ad, kademe_dersi (ad))')
    .order('yazilma_zamani', { ascending: false })
    .limit(LISTE_SINIRI);
  if (error) throw new Error(hataMesajinaCevir(error.message));
  const notlar = data ?? [];

  // Sınıfların hocaları (yönetici kapsamındaki personeli okur).
  const sinifIdleri = [...new Set(notlar.map((n) => n.sinif_id))];
  const hocalar = new Map<string, { id: string; ad: string }[]>();
  if (sinifIdleri.length > 0) {
    const { data: atamalar } = await supabase
      .from('ogretmen_sinif')
      .select('sinif_id, ogretmen_id, kullanici (ad_soyad)')
      .in('sinif_id', sinifIdleri);
    for (const a of atamalar ?? []) {
      const ad = (a.kullanici as unknown as { ad_soyad: string } | null)?.ad_soyad;
      if (ad) hocalar.set(a.sinif_id, [...(hocalar.get(a.sinif_id) ?? []), { id: a.ogretmen_id, ad }]);
    }
  }

  return notlar.map((n) => {
    const konu = n.ders_konusu as unknown as { ad: string; kademe_dersi: { ad: string } | null } | null;
    return {
      anahtar: `${n.sinif_id}:${n.konu_id}`,
      sinifId: n.sinif_id,
      sinifAdi: (n.sinif as unknown as { ad: string } | null)?.ad ?? '',
      kurumId: n.kurum_id,
      konuId: n.konu_id,
      konuAdi: konu?.ad ?? '',
      dersAdi: konu?.kademe_dersi?.ad ?? '',
      notMetni: n.not_metni,
      yazilmaZamani: n.yazilma_zamani,
      goruldu: n.goruldu_zamani !== null,
      yanitVar: n.yanit_metni !== null,
      hocalar: hocalar.get(n.sinif_id) ?? [],
    };
  });
}
