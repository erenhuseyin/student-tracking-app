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
  - Migration'lar: `20260925120000_temel_sema`, `..120100_yardimci_fonksiyonlar`, `..120200_rls`, `20260926120000_rol_yukseltme_duzelt`, `20260926130000_kurum_ayarlar_ve_ogretmen_veli` (5 migration'ın hepsi uygulandı; test 2026-09-26'da geçti)
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
- **Migration'lar Dashboard SQL Editor'den uygulandı** (CLI `login`/`link` bu dizinde çalışmadı). Bu yüzden uzak `supabase_migrations` geçmişinde kayıtlı değiller; CLI bağlanınca `supabase migration repair --status applied <versiyon>` (5 versiyon için) ile işaretlenmeli, yoksa `db push` migration'ları tekrar uygulamaya çalışır.
- **Kurum admini `ayarlar`'ı düzenler (2026-09-26 karar):** `kurum` için kolon yetkisi `(ad, ayarlar)`; `ad` değişikliği trigger ile yalnızca süper admine bırakıldı. **Plan/abonelik gibi kurum admininin değiştirmemesi gereken alanlar `ayarlar` içine konmamalı**, ayrı kolon olmalı ve kolon yetkisi verilmemeli.
- **Öğretmen sınıfındaki velileri görür (2026-09-26 karar):** `kullanici` üzerinde `gizli.ogretmen_velisi_mi()` politikası. RLS satır süzer, kolon değil: `kullanici`'ya telefon/e-posta gibi hassas kolon eklenirse öğretmene de açılır; iletişim bilgisi ayrı tabloda tutulmalı (KVKK).
- **Varsayılan Node 22** (`nvm alias default 22`, 2026-09-26). Artık her terminalde `nvm use 22` gerekmez; Node 16'ya bağımlı başka projeler varsa onlarda `nvm use 16` gerekir.
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

- Kullanıcı oluşturma: önerilen yol davet **Edge Function** (service role ile `kullanici` satırı + auth daveti), `auth.users` trigger'ı yok. Karar bekliyor.
- Tipler: önerilen yol **hibrit** — `supabase gen types` çıktısı `lib/veritabani.tipleri.ts` (elle dokunulmaz), `lib/tipler.ts` bunun üzerine ince takma adlar. CLI girişi gerekiyor ya da Dashboard tip üreticisinden yapıştırılır. Karar bekliyor.

## Son Oturum Notu

_(Serbest metin: bu oturumda ne yapıldı, bir sonraki oturuma nereden devam edilmeli)_

- 2026-09-25: Proje iskeleti kuruldu.
- 2026-09-26: Supabase çekirdek şema + RLS yazıldı, Dashboard'dan uygulandı, izolasyon testi geçti (bir yetki yükseltme açığı testte bulunup kapatıldı). Bir sonraki oturum: ilk süper admin'i elle ekle → login ekranı ve süper admin "yeni kurum ekle" akışı. Node 22 artık varsayılan.