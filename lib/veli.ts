// Veli girişi ve PIN değiştirme. İkisi de sunucudan geçer (supabase/functions/veli-giris,
// veli-pin-degistir): Auth şifresi PIN'den sunucudaki gizli anahtarla türetilir, istemci onu
// üretemez. Böylece yanlış PIN denemeleri sayılabilir ve hesap geçici olarak kilitlenebilir.
import { edgeFonksiyonuCagir } from '@/lib/edge';
import { marka } from '@/lib/marka';
import { supabase } from '@/lib/supabase';

export const VARSAYILAN_PIN = '1234';

// Erişim: oturumsuz. Başarılıysa oturum açılır (lib/oturum.tsx durumu günceller).
export async function veliGirisYap(tckn: string, pin: string): Promise<void> {
  const temizTckn = tckn.trim();
  if (temizTckn.length !== 11 || pin.length !== 4) throw new Error('TCKN 11, PIN 4 haneli olmalı.');
  const oturum = await edgeFonksiyonuCagir<{ access_token: string; refresh_token: string }>(
    'veli-giris',
    { tckn: temizTckn, pin, marka_kodu: marka.kod },
    'Giriş yapılamadı, lütfen tekrar deneyin.',
  );
  const { error } = await supabase.auth.setSession({
    access_token: oturum.access_token,
    refresh_token: oturum.refresh_token,
  });
  if (error) throw new Error('Giriş yapılamadı, lütfen tekrar deneyin.');
}

// Erişim: yalnızca veli (kendi PIN'i). `mevcutPin`, hesap "PIN değiştirilmeli" durumunda
// değilse zorunludur (sunucu denetler).
export async function veliPinDegistir(yeniPin: string, mevcutPin?: string): Promise<void> {
  if (yeniPin.length !== 4) throw new Error('PIN 4 haneli olmalı.');
  if (yeniPin === VARSAYILAN_PIN) throw new Error("Bu PIN herkesçe bilinen başlangıç PIN'idir; başka bir PIN seçin.");
  await edgeFonksiyonuCagir(
    'veli-pin-degistir',
    { yeni_pin: yeniPin, mevcut_pin: mevcutPin },
    'PIN değiştirilemedi, lütfen tekrar deneyin.',
  );
}
