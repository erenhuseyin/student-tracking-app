// Personelin kullanıcı adıyla girişi (ali.yilmaz + şifre). Ad istemcide e-postaya çevrilemez
// (başkalarının e-postası oturumsuz okunamaz); supabase/functions/personel-giris adı müşteri içinde
// bulur, giriş yapar ve oturumu döndürür. E-postayla giriş bunu kullanmaz, doğrudan Auth'a gider.
// Erişim: oturumsuz. Başarılıysa oturum açılır (lib/oturum.tsx durumu günceller).
import { edgeFonksiyonuCagir } from '@/lib/edge';
import { kullaniciAdiGecerliMi, kullaniciAdiniDuzelt } from '@/lib/kullaniciAdi';
import { marka } from '@/lib/marka';
import { supabase } from '@/lib/supabase';

export async function kullaniciAdiylaGirisYap(kullaniciAdi: string, sifre: string): Promise<void> {
  const ad = kullaniciAdiniDuzelt(kullaniciAdi);
  if (!kullaniciAdiGecerliMi(ad) || !sifre) throw new Error('Kullanıcı adınızı ve şifrenizi girin.');
  const oturum = await edgeFonksiyonuCagir<{ access_token: string; refresh_token: string }>(
    'personel-giris',
    { kullanici_adi: ad, sifre, marka_kodu: marka.kod },
    'Giriş yapılamadı, lütfen tekrar deneyin.',
  );
  const { error } = await supabase.auth.setSession({
    access_token: oturum.access_token,
    refresh_token: oturum.refresh_token,
  });
  if (error) throw new Error('Giriş yapılamadı, lütfen tekrar deneyin.');
}
