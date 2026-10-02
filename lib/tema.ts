// Renk belirteçleri. Ekranlar renkleri buradan alır, sabit renk kodu yazmaz; `ana` renk
// markaya göre değişir (bkz. lib/marka.ts).
import { marka } from '@/lib/marka';

export const renkler = {
  ana: marka.renkler.ana,
  anaUstu: '#fff',
  metin: '#333',
  metinOrta: '#444',
  metinIkincil: '#666',
  kenarlik: '#ccc',
  ayirici: '#eee',
  hata: '#c62828',
  basari: '#2e7d32',
} as const;
