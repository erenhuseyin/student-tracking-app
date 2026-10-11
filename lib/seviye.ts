// Kurum ağacının seviyeleri (1 = kök kurum/müşteri … 4). Seviye adları müşteriye özeldir ve
// markadan gelir (markalar/<kod>/marka.json > seviyeAdlari); ör. Genel Merkez / Bölge / İlçe / Semt.
// Roller sabittir: yöneticinin yetki alanını bağlı olduğu düğüm belirler, ekranda seviyesinin
// adıyla gösterilir ("Bölge yöneticisi"). Veriye erişimi RLS belirler (gizli.yonetilen_kurum_idleri).
import { marka } from '@/lib/marka';
import type { Kurum } from '@/lib/tipler';

// DB'deki kurum_seviye_araligi kısıtıyla aynı.
export const EN_FAZLA_SEVIYE = 4;

const VARSAYILAN_ADLAR = ['Kurum', 'Şube', 'Alt şube', 'Birim'];

export function seviyeAdi(seviye: number): string {
  return marka.seviyeAdlari?.[seviye - 1] ?? VARSAYILAN_ADLAR[seviye - 1] ?? 'Birim';
}

// Cümle içinde kullanım için ("Henüz bölge yok").
export function seviyeAdiKucuk(seviye: number): string {
  return seviyeAdi(seviye).toLocaleLowerCase('tr');
}

// Son ünlüye göre -lar/-ler.
export function seviyeAdiCogul(seviye: number): string {
  const ad = seviyeAdi(seviye);
  const sonUnlu = [...ad.toLocaleLowerCase('tr')].reverse().find((h) => 'aıoueiöü'.includes(h));
  return ad + (sonUnlu && 'aıou'.includes(sonUnlu) ? 'lar' : 'ler');
}

export function altBirimAcabilir(kurum: Pick<Kurum, 'seviye'> | null): boolean {
  return kurum !== null && kurum.seviye < EN_FAZLA_SEVIYE;
}

export function yoneticiEtiketi(kurum: Pick<Kurum, 'seviye'> | null): string {
  return kurum ? `${seviyeAdi(kurum.seviye)} yöneticisi` : 'Yönetici';
}
