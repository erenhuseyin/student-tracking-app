// Rapor ekranlarının (Menü > Raporlar; app/(kurum_admin)/rapor/[tur].tsx) verisi. Her rapor
// öğrenci (ya da öğrenci kaydı) başına satırlardır; süzme, sıralama ve sayfalama ekranda istemcide
// yapılır, "Rapor İndir" süzülmüş satırları CSV yapar (lib/disaAktar.ts). Kapsamı RLS belirler
// (yöneticinin yönettiği kurumlar); satırlar 1000'lik sayfalarla eksiksiz toplanır.
//
// Erişim: yalnızca kurum_admin. Ders raporu sınıf başınadır ve kendi ekranındadır (ders-raporu.tsx).
import { type Hucre, tumSatirlar } from '@/lib/disaAktar';
import { katilimHesapla, yuzdeMetni } from '@/lib/katilim';
import { KITAP_DURUMU_ETIKETLERI } from '@/lib/kitaplar';
import { kurumAdlariniGetir, type KurumOzeti, kurumYolu } from '@/lib/kurumlar';
import { supabase } from '@/lib/supabase';
import { bugununTarihi, gunEkle } from '@/lib/tarih';
import type { KitapDurumu, YoklamaDurumu } from '@/lib/tipler';
import { YOKLAMA_ETIKETLERI } from '@/lib/yoklama';

export type RaporTuru = 'katilim' | 'yoklama' | 'ezber' | 'kitap';
export type RaporDonemi = '7' | '30' | '90';

export const RAPOR_DONEMLERI: { deger: RaporDonemi; etiket: string }[] = [
  { deger: '7', etiket: 'Son 7 gün' },
  { deger: '30', etiket: 'Son 30 gün' },
  { deger: '90', etiket: 'Son 90 gün' },
];

export type RaporTanimi = {
  tur: RaporTuru;
  // Ekran başlığı ve menüdeki ad (lib/menu.ts ile aynı).
  baslik: string;
  // Menü anahtarı (lib/menu.ts; tanımlı rolde kapatılabilir).
  menuAnahtari: string;
  // CSV ve tablo sütunları; `hucreler` bu sırayla gelir. Ad, birim ve sınıf hep ilk üç sütundur.
  basliklar: string[];
  // Sağa yaslanan (sayı) sütunların sırası.
  sayilar: number[];
  // Dönem seçimi (yoklama tarihine göre) olan raporlar.
  donemli?: true;
  // Durum süzgeci olan raporlar (satırın `durum`u).
  durumlar?: { deger: string; etiket: string }[];
  // Müşteride içerik takibi açıksa (kurum.ozellikler.icerik_takibi).
  icerik?: true;
  bosBaslik: string;
};

export const RAPOR_TANIMLARI: Record<RaporTuru, RaporTanimi> = {
  katilim: {
    tur: 'katilim',
    baslik: 'Katılım Raporu',
    menuAnahtari: 'katilim-raporu',
    basliklar: ['Ad Soyad', 'Birim', 'Sınıf', 'Katıldı', 'Gelmedi', 'Geç', 'Mazeretli', 'Katılım'],
    sayilar: [3, 4, 5, 6, 7],
    donemli: true,
    bosBaslik: 'Öğrenci yok',
  },
  yoklama: {
    tur: 'yoklama',
    baslik: 'Yoklama Kayıtları',
    menuAnahtari: 'yoklama-raporu',
    basliklar: ['Ad Soyad', 'Birim', 'Sınıf', 'Tarih', 'Durum'],
    sayilar: [],
    donemli: true,
    durumlar: (Object.keys(YOKLAMA_ETIKETLERI) as YoklamaDurumu[]).map((d) => ({ deger: d, etiket: YOKLAMA_ETIKETLERI[d] })),
    bosBaslik: 'Yoklama kaydı yok',
  },
  ezber: {
    tur: 'ezber',
    baslik: 'Ezber Raporu',
    menuAnahtari: 'ezber-raporu',
    basliklar: ['Ad Soyad', 'Birim', 'Sınıf', 'Tamamlanan', 'Devam Eden'],
    sayilar: [3, 4],
    icerik: true,
    bosBaslik: 'Öğrenci yok',
  },
  kitap: {
    tur: 'kitap',
    baslik: 'Kitap Raporu',
    menuAnahtari: 'kitap-raporu',
    basliklar: ['Ad Soyad', 'Birim', 'Sınıf', 'Kitap', 'Yazar', 'Durum', 'Başlama', 'Bitiş'],
    sayilar: [],
    durumlar: (Object.keys(KITAP_DURUMU_ETIKETLERI) as KitapDurumu[]).map((d) => ({ deger: d, etiket: KITAP_DURUMU_ETIKETLERI[d] })),
    icerik: true,
    bosBaslik: 'Kitap kaydı yok',
  },
};

export function raporTuruMu(deger: string | undefined): deger is RaporTuru {
  return deger !== undefined && deger in RAPOR_TANIMLARI;
}

export type RaporSatiri = {
  anahtar: string;
  adSoyad: string;
  kurumId: string;
  sinifId: string;
  // Tablo ve CSV hücreleri (tanımın `basliklar` sırasıyla).
  hucreler: Hucre[];
  // Durum süzgecinin karşılaştırdığı değer (yoklama / kitap durumu).
  durum?: string;
  // Telefondaki kartın alt satırı (ör. "%85 · 17/20 derse katıldı").
  ozet: string;
};

export type RaporVerisi = { satirlar: RaporSatiri[]; kurumlar: KurumOzeti[]; siniflar: { id: string; ad: string; kurum_id: string }[] };

async function ortakVeri() {
  const [siniflar, ogrenciler, kurumlar] = await Promise.all([
    tumSatirlar((b, s) => supabase.from('sinif').select('id, ad, kurum_id').order('ad').range(b, s)),
    tumSatirlar((b, s) => supabase.from('ogrenci').select('id, ad_soyad, sinif_id, kurum_id, aktif').order('ad_soyad').range(b, s)),
    kurumAdlariniGetir(),
  ]);
  return { siniflar, ogrenciler, kurumlar };
}

// Raporun tüm satırları (süzülmemiş). `donem` yalnızca dönemli raporlarda kullanılır.
export async function raporVerisiGetir(tur: RaporTuru, donem: RaporDonemi): Promise<RaporVerisi> {
  const { siniflar, ogrenciler, kurumlar } = await ortakVeri();
  const sinifAdi = new Map(siniflar.map((x) => [x.id, x.ad]));
  const ogrenci = new Map(ogrenciler.map((o) => [o.id, o]));
  // Birim yolu kök kurum (müşteri) atlanarak yazılır: "İstanbul › Sancaktepe" (Öğrenciler ekranıyla aynı).
  const kokId = kurumlar.find((k) => k.seviye === 1)?.id;
  const birim = (kurumId: string) => kurumYolu(kurumlar, kurumId, kokId) || (kurumlar.find((k) => k.id === kurumId)?.ad ?? '');
  const kimlik = (o: { id: string; ad_soyad: string; kurum_id: string; sinif_id: string }) => ({
    adSoyad: o.ad_soyad,
    kurumId: o.kurum_id,
    sinifId: o.sinif_id,
    ilkUc: [o.ad_soyad, birim(o.kurum_id), sinifAdi.get(o.sinif_id) ?? ''] as Hucre[],
  });
  // Rapor yalnızca bugün sınıfında olan (aktif) öğrencileri listeler; kayıt raporları (yoklama,
  // kitap) pasife alınmış öğrencinin geçmiş kayıtlarını da gösterir.
  const aktifler = ogrenciler.filter((o) => o.aktif);
  const baslangic = gunEkle(bugununTarihi(), -Number(donem));
  let satirlar: RaporSatiri[];

  if (tur === 'katilim' || tur === 'yoklama') {
    const yoklamalar = await tumSatirlar((b, s) =>
      supabase.from('yoklama').select('ogrenci_id, tarih, durum').gte('tarih', baslangic).order('tarih', { ascending: false }).range(b, s),
    );
    if (tur === 'yoklama') {
      satirlar = yoklamalar.flatMap((y) => {
        const o = ogrenci.get(y.ogrenci_id);
        if (!o) return [];
        const k = kimlik(o);
        return [
          {
            anahtar: `${y.ogrenci_id}:${y.tarih}`,
            ...k,
            hucreler: [...k.ilkUc, y.tarih, YOKLAMA_ETIKETLERI[y.durum]],
            durum: y.durum,
            ozet: `${y.tarih} · ${YOKLAMA_ETIKETLERI[y.durum]}`,
          },
        ];
      });
    } else {
      const ogrencininki = new Map<string, { durum: YoklamaDurumu }[]>();
      for (const y of yoklamalar) ogrencininki.set(y.ogrenci_id, [...(ogrencininki.get(y.ogrenci_id) ?? []), y]);
      satirlar = aktifler.map((o) => {
        const k = kimlik(o);
        const h = katilimHesapla(ogrencininki.get(o.id) ?? []);
        return {
          anahtar: o.id,
          ...k,
          hucreler: [...k.ilkUc, h.katildi, h.gelmedi, h.gec, h.mazeretli, yuzdeMetni(h.oran)],
          ozet: h.alinan === 0 ? 'Yoklama yok' : `${yuzdeMetni(h.oran)} · ${h.katildi}/${h.alinan} derse katıldı`,
        };
      });
    }
  } else if (tur === 'ezber') {
    const ezberler = await tumSatirlar((b, s) => supabase.from('ogrenci_ezber').select('ogrenci_id, durum').range(b, s));
    const sayim = new Map<string, { tamam: number; devam: number }>();
    for (const e of ezberler) {
      const m = sayim.get(e.ogrenci_id) ?? { tamam: 0, devam: 0 };
      if (e.durum === 'tamam') m.tamam++;
      else m.devam++;
      sayim.set(e.ogrenci_id, m);
    }
    satirlar = aktifler.map((o) => {
      const k = kimlik(o);
      const m = sayim.get(o.id) ?? { tamam: 0, devam: 0 };
      return { anahtar: o.id, ...k, hucreler: [...k.ilkUc, m.tamam, m.devam], ozet: `${m.tamam} tamamlandı · ${m.devam} devam ediyor` };
    });
  } else {
    const kitaplar = await tumSatirlar((b, s) =>
      supabase
        .from('kitap_okuma')
        .select('id, ogrenci_id, baslik, yazar, durum, baslama_tarihi, bitis_tarihi')
        .order('olusturma_tarihi', { ascending: false })
        .range(b, s),
    );
    satirlar = kitaplar.flatMap((x) => {
      const o = ogrenci.get(x.ogrenci_id);
      if (!o) return [];
      const k = kimlik(o);
      return [
        {
          anahtar: x.id,
          ...k,
          hucreler: [...k.ilkUc, x.baslik, x.yazar, KITAP_DURUMU_ETIKETLERI[x.durum], x.baslama_tarihi, x.bitis_tarihi],
          durum: x.durum,
          ozet: `${x.baslik} · ${KITAP_DURUMU_ETIKETLERI[x.durum]}`,
        },
      ];
    });
  }

  return { satirlar, kurumlar, siniflar };
}
