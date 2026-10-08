-- Veli girişi güvenliği: ilk girişte PIN değiştirme zorunluluğu ve deneme sınırı.
--
-- Veli girişi artık `veli-giris` Edge Function'ından geçer. Auth şifresi PIN'in kendisi değil,
-- sunucudaki gizli anahtarla (VELI_PIN_ANAHTARI) PIN'den türetilen değerdir; istemci bu değeri
-- üretemediği için Auth'a doğrudan parola denemesi yapılamaz ve deneme sınırı gerçekten uygulanır.
--
-- pin_degistirilmeli : hesap varsayılan PIN'le açıldı ya da PIN sıfırlandı; veli yeni PIN
--   belirleyene kadar uygulama yalnızca PIN değiştirme ekranını gösterir.
-- giris_deneme_sayisi: son başarılı girişten beri yanlış PIN sayısı.
-- giris_kilit_bitis  : sınır aşılınca giriş bu ana kadar reddedilir.
--
-- Bu kolonlara istemci yazamaz: kullanici üzerindeki update yetkisi kolon bazlıdır
-- (ad_soyad, rol, expo_push_token) ve değişmedi; yalnızca service-role Edge Function'lar yazar.
alter table public.kullanici
  add column pin_degistirilmeli boolean not null default false,
  add column giris_deneme_sayisi integer not null default 0,
  add column giris_kilit_bitis timestamptz;
