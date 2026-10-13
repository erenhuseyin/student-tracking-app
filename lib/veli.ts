// Veli girişi ve PIN değiştirme. İkisi de sunucudan geçer (supabase/functions/veli-giris,
// veli-pin-degistir): Auth şifresi PIN'den sunucudaki gizli anahtarla türetilir, istemci onu
// üretemez. Böylece yanlış PIN denemeleri sayılabilir ve hesap geçici olarak kilitlenebilir.
import { edgeFonksiyonuCagir } from '@/lib/edge';
import { kullaniciAdiGecerliMi, kullaniciAdiniDuzelt } from '@/lib/kullaniciAdi';
import { marka } from '@/lib/marka';
import { supabase } from '@/lib/supabase';

export const VARSAYILAN_PIN = '1234';

// Erişim: oturumsuz. Başarılıysa oturum açılır (lib/oturum.tsx durumu günceller).
export async function veliGirisYap(kullaniciAdi: string, pin: string): Promise<void> {
  const ad = kullaniciAdiniDuzelt(kullaniciAdi);
  if (!kullaniciAdiGecerliMi(ad) || pin.length !== 4) throw new Error("Kullanıcı adınızı ve 4 haneli PIN'inizi girin.");
  const oturum = await edgeFonksiyonuCagir<{ access_token: string; refresh_token: string }>(
    'veli-giris',
    { kullanici_adi: ad, pin, marka_kodu: marka.kod },
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
  const sonuc = await edgeFonksiyonuCagir<{ access_token?: string; refresh_token?: string }>(
    'veli-pin-degistir',
    { yeni_pin: yeniPin, mevcut_pin: mevcutPin },
    'PIN değiştirilemedi, lütfen tekrar deneyin.',
  );
  // PIN (Auth şifresi) değişince Auth hesabın tüm oturumlarını kapatır; sunucu yeni PIN'le
  // açtığı taze oturumu döndürür. Dönmediyse eski oturum zaten geçersizdir: çıkış yapılır ve
  // veli yeni PIN'iyle giriş ekranından girer.
  if (sonuc.access_token && sonuc.refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token: sonuc.access_token, refresh_token: sonuc.refresh_token });
    if (!error) return;
  }
  await supabase.auth.signOut();
}

// Erişim: yalnızca veli. Başka bir çocuğunu bu hesaba bağlar; kanıt olarak o çocuğun kullanıcı adı ve
// PIN'i istenir (sunucu doğrular). Eklenen çocuğun adını döndürür.
export async function kardesEkle(kullaniciAdi: string, pin: string): Promise<string> {
  const ad = kullaniciAdiniDuzelt(kullaniciAdi);
  if (!kullaniciAdiGecerliMi(ad) || pin.length !== 4) throw new Error("Çocuğun kullanıcı adını ve 4 haneli PIN'ini girin.");
  const sonuc = await edgeFonksiyonuCagir<{ ad_soyad: string }>(
    'veli-kardes-ekle',
    { kullanici_adi: ad, pin },
    'Çocuk eklenemedi, lütfen tekrar deneyin.',
  );
  return sonuc.ad_soyad;
}
