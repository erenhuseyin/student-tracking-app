# İlerleme Günlüğü

> Bu dosyayı Claude Code her oturum sonunda güncelleyecek. Amaç: yeni bir oturuma başlarken "nerede kalmıştık" sorusunu sıfırdan anlatmaya gerek kalmasın. Detaylı ürün kararları için `docs/proje-spesifikasyonu.md`'ye bak.

## Şu An Neredeyiz

- **Aktif faz:** Faz 1 — MVP
- **Aktif adım:** Supabase çekirdek şema + RLS tamamlandı; sıradaki adım: Süper admin — yeni kurum ekleme akışı (öncesinde ilk süper admin elle eklenmeli)
- **Son güncelleme:** 2026-09-26

## Tamamlananlar

_(Claude Code her tamamlanan adımı buraya tarih + kısa açıklama ile ekleyecek)_

- [x] Proje iskeleti (Expo + Expo Router) — 2026-09-25
  - Expo SDK 57 + Expo Router + TypeScript (strict), kök seviyede `app/`, `lib/`, `components/`, `supabase/migrations/`
  - `lib/supabase.ts`: client iskeleti, `.env`'den okur (henüz hiçbir yerden import edilmiyor)
  - `.env.example`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - `lib/tipler.ts`: `Rol`, `Kurum`, `Sinif`, `Kullanici`, `Ogrenci`
  - `app/index.tsx`: boş başlangıç ekranı
  - Doğrulama: `tsc --noEmit`, `expo-doctor` (21/21) ve `expo export --platform web` başarılı
- [x] Supabase kurulumu (Auth + temel tablolar + RLS) — 2026-09-26
  - Bulut projesi (supabase.com) bağlandı; `.env` dolu, anon/publishable key ile bağlantı doğrulandı
  - Migration'lar: `20260925120000_temel_sema`, `..120100_yardimci_fonksiyonlar`, `..120200_rls`, `20260926120000_rol_yukseltme_duzelt`
  - Tablolar: `kurum, kullanici, sinif, ogrenci, veli_ogrenci, ogretmen_sinif` (hepsinde RLS açık)
  - `supabase/tests/rls.test.sql`: izolasyon/erişim/yetki yükseltme testi — **hepsi geçti** (Dashboard SQL Editor'de çalıştırıldı, rollback'li)
  - Kapsam dışı (kendi özelliklerinde eklenecek): `yoklama, gelisim_kaydi, duyuru, bildirim_log`
- [ ] Süper admin: kurum ekleme akışı
- [ ] Login / davetle kullanıcı oluşturma
- [ ] Rol bazlı yönlendirme
- [ ] Sınıf/öğrenci yönetimi (CRUD)
- [ ] Yoklama alma
- [ ] Veliye push bildirim
- [ ] EAS build + Play Console internal testing

## Alınan Teknik Kararlar (spesifikasyonda olmayan, oturum içi kararlar)

_(Örn: "auth_id ile kullanici tablosu arasında trigger ile otomatik senkronizasyon kuruldu")_

- **Node 22:** Makinenin varsayılan Node'u v16.14.0; Expo SDK 57 için yetersiz. Komutlar `nvm use 22` ile çalıştırıldı. Varsayılan Node değiştirilmedi — yeni terminalde `nvm use 22` gerekir (istenirse `nvm alias default 22`).
- **Klasör düzeni:** `create-expo-app` şablonu kodu `src/app` altına koyuyor; CLAUDE.md'ye uymak için kök seviyeye (`app/`) taşındı ve `@/*` alias'ı `./*` yapıldı. Şablonun demo dosyaları, `AGENTS.md`/`CLAUDE.md`/`README`/`LICENSE`/`.vscode`/`.claude` taşınmadı; demo'ya özel bağımlılıklar (`@expo/ui`, `expo-glass-effect`, `expo-symbols`, `expo-image`, `expo-device`, `expo-web-browser`) kaldırıldı.
- **Route grupları ertelendi:** `(auth)`, `(admin)`, `(ogretmen)`, `(veli)` grupları rol bazlı yönlendirme adımında eklenecek (boş grup Expo Router'da uyarı üretir).
- **Tipler `lib/tipler.ts`'de toplandı**, alan adları DB kolonlarıyla birebir (snake_case, ASCII: `donem`, `dogum_tarihi`). Roller: `super_admin`, `kurum_admin`, `ogretmen`, `veli`.
- **`Kullanici.kurum_id` `string | null`:** Süper admin kuruma bağlı değil (spesifikasyonda açıkça yazmıyor). Migration'da kolon nullable olmalı, RLS politikaları bunu hesaba katmalı.
- **`Ogrenci`'de `veli_id` yok:** veli-öğrenci ilişkisi çoka çok (`veli_ogrenci`).
- **Eklenen bağımlılıklar:** `@supabase/supabase-js`, `@react-native-async-storage/async-storage`, `react-native-url-polyfill` (Expo SDK'da karşılıkları yok).
- **Şema:** Her tabloda `kurum_id` var (spesifikasyonda olmayan `veli_ogrenci` ve `ogretmen_sinif`'e de eklendi). Kurumlar arası yanlış bağ, bileşik FK `(x_id, kurum_id)` ile DB seviyesinde engelleniyor. `veli_ogrenci.veli_id` / `ogretmen_sinif.ogretmen_id` rollerini trigger doğruluyor. Bağı olan kullanıcının rolü değiştirilemez.
- **RLS mimarisi:** Yardımcı fonksiyonlar API'ye açık olmayan `gizli` şemasında (`SECURITY DEFINER`, `search_path=''`). Politikalar yalnızca `authenticated` içindir; `anon` tüm tablolardan revoke edildi. `kullanici` kaydı olmayan auth kullanıcısı hiçbir şey göremez (varsayılan red). `FORCE ROW LEVEL SECURITY` kullanılmadı (SECURITY DEFINER fonksiyonlar sahip olarak çalışıyor).
- **`kullanici` yazma yetkisi:** İstemci insert/delete yapamaz; kullanıcı oluşturma davet Edge Function'ıyla (service role) yapılacak. Kolon yetkisi yalnızca `ad_soyad` ve `rol` güncellemeye izin verir; `kurum_id`/`auth_id` istemciden değiştirilemez.
- **Rol değiştirme kuralları (trigger):** Kimse kendi rolünü değiştiremez (kurum admini dahil); rolü yalnızca `super_admin` ve `kurum_admin` değiştirir. Kurum admini `super_admin` yapamaz. `kurum` tablosuna yalnızca süper admin yazar.
- **Güvenlik açığı bulundu ve kapatıldı (2026-09-26):** İlk RLS'te "kendi rolünü değiştirme" kontrolü `with check (rol = gizli.mevcut_rol())` ile yapılıyordu; güncelleme sırasında fonksiyon yeni rolü gördüğü için bir öğretmen kendini `kurum_admin` yapabiliyordu. Test yakaladı, kontrol BEFORE UPDATE trigger'a taşındı (`20260926120000_rol_yukseltme_duzelt.sql`). **Ders:** Politikalarda `with check` içinde aynı tabloyu okuyan fonksiyonla "eski değer" karşılaştırması yapma; trigger kullan. Yeni tablo/politika eklerken `rls.test.sql` genişletilmeli.
- **Migration'lar Dashboard SQL Editor'den uygulandı** (CLI `login`/`link` bu dizinde çalışmadı). Bu yüzden uzak `supabase_migrations` geçmişinde kayıtlı değiller; CLI bağlanınca `supabase migration repair --status applied <versiyon>` (4 versiyon için) ile işaretlenmeli, yoksa `db push` migration'ları tekrar uygulamaya çalışır.
- **`.env` URL'si:** `supabase-js` proje kök adresini (`https://<ref>.supabase.co`) ister; Dashboard'daki "Data API" adresi `/rest/v1/` ile biter ve **çalışmaz** (doğrulandı: 404). Bkz. `.env.example`.
- **`.gitignore`:** `.env` eklendi (şablon yalnızca `.env*.local`'i ignore ediyordu); `.env.example` takip ediliyor.

## Bilinen Sorunlar / Yarım Kalanlar

_(Bir sonraki oturuma devredilen, tam bitmeyen işler)_

- `lib/supabase.ts` env eksikken fırlattığı hata, web statik export'ta (`expo export --platform web`) test edilirken build'i düşürmedi; mesaj bundle'da mevcut ama fırlatma davranışı uçtan uca doğrulanmadı. Dosya henüz import edilmediği için şimdilik etkisiz — ilk gerçek kullanımda (login) kontrol edilmeli.
- İlk süper admin henüz yok. Elle eklenecek: Dashboard > Authentication'da kullanıcı oluştur, sonra SQL Editor'de `insert into public.kullanici (auth_id, rol, kurum_id, ad_soyad) values ('<auth uuid>', 'super_admin', null, '<ad>');`
- Dashboard > Advisors (Security) kontrolü yapılmadı; "RLS disabled" uyarısı olmaması beklenir.
- Uygulama cihaz/simülatörde açılıp görsel olarak doğrulanmadı (yalnızca derleme/tip/doctor kontrolleri).

## Açık Sorular (insan kararı bekleyen)

_(Claude Code'un kendi başına karar veremeyip kullanıcıya sorması gereken noktalar)_

- `auth.users` ↔ `kullanici` senkronu: kullanıcı oluşturma yalnızca davet Edge Function'ıyla mı olacak, yoksa trigger da eklensin mi?
- Kurum adminleri kurum `ayarlar`'ını düzenleyebilsin mi? (Şu an yalnızca süper admin yazabiliyor.)
- Öğretmen, sınıfındaki velilerin adını görebilsin mi? (Şu an yalnızca kendi satırını görüyor.)
- Veritabanı tipleri ileride `supabase gen types` ile mi üretilecek, yoksa `lib/tipler.ts` elle mi sürdürülecek?
- Varsayılan Node sürümü 22'ye alınsın mı?

## Son Oturum Notu

_(Serbest metin: bu oturumda ne yapıldı, bir sonraki oturuma nereden devam edilmeli)_

- 2026-09-25: Proje iskeleti kuruldu.
- 2026-09-26: Supabase çekirdek şema + RLS yazıldı, Dashboard'dan uygulandı, izolasyon testi geçti (bir yetki yükseltme açığı testte bulunup kapatıldı). Bir sonraki oturum: ilk süper admin'i elle ekle → login ekranı ve süper admin "yeni kurum ekle" akışı. Komutlar için önce `nvm use 22`.