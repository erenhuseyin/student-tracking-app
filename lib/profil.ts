// Kullanıcının kendi hesabı: ad değiştirme ve oturum açıkken şifre değiştirme.
// Erişim: giriş yapmış herkes, yalnızca kendi satırı (RLS: kullanici_kendi_satiri_guncelle;
// kolon yetkisi ad_soyad'a izin verir). Veli adını değiştirmez — adı öğrenciden türetilir
// (bkz. supabase/functions/veli-hesap-olustur) ve PIN'ini `(veli)/pin-degistir` ekranından değiştirir.
import { EN_AZ_SIFRE_UZUNLUGU } from '@/lib/personel';
import { supabase } from '@/lib/supabase';

export async function adimiGuncelle(kullaniciId: string, adSoyad: string): Promise<void> {
  const temizAd = adSoyad.trim();
  if (!temizAd) throw new Error('Ad soyad gerekli.');
  const { error } = await supabase.from('kullanici').update({ ad_soyad: temizAd }).eq('id', kullaniciId);
  if (error) throw new Error('Ad kaydedilemedi, lütfen tekrar deneyin.');
}

// Mevcut şifre yeniden girişle doğrulanır: açık kalmış bir cihazı eline alan kişi şifreyi
// değiştirip hesabı ele geçiremesin.
export async function sifremiDegistir(eposta: string, mevcutSifre: string, yeniSifre: string): Promise<void> {
  if (!mevcutSifre) throw new Error('Mevcut şifrenizi girin.');
  if (yeniSifre.length < EN_AZ_SIFRE_UZUNLUGU) throw new Error(`Yeni şifre en az ${EN_AZ_SIFRE_UZUNLUGU} karakter olmalı.`);
  if (yeniSifre === mevcutSifre) throw new Error('Yeni şifre mevcut şifreden farklı olmalı.');

  const { error: girisHatasi } = await supabase.auth.signInWithPassword({ email: eposta, password: mevcutSifre });
  if (girisHatasi) {
    throw new Error(
      /invalid/i.test(girisHatasi.message) ? 'Mevcut şifre hatalı.' : 'Şifre doğrulanamadı, lütfen tekrar deneyin.',
    );
  }
  const { error } = await supabase.auth.updateUser({ password: yeniSifre });
  if (error) throw new Error('Şifre değiştirilemedi, lütfen tekrar deneyin.');
}
