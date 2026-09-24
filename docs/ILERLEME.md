# İlerleme Günlüğü

> Bu dosyayı Claude Code her oturum sonunda güncelleyecek. Amaç: yeni bir oturuma başlarken "nerede kalmıştık" sorusunu sıfırdan anlatmaya gerek kalmasın. Detaylı ürün kararları için `docs/proje-spesifikasyonu.md`'ye bak.

## Şu An Neredeyiz

- **Aktif faz:** Faz 1 — MVP
- **Aktif adım:** Proje iskeleti tamamlandı; sıradaki adım: Supabase kurulumu (Auth + temel tablolar + RLS)
- **Son güncelleme:** 2026-09-25

## Tamamlananlar

_(Claude Code her tamamlanan adımı buraya tarih + kısa açıklama ile ekleyecek)_

- [x] Proje iskeleti (Expo + Expo Router) — 2026-09-25
  - Expo SDK 57 + Expo Router + TypeScript (strict), kök seviyede `app/`, `lib/`, `components/`, `supabase/migrations/`
  - `lib/supabase.ts`: client iskeleti, `.env`'den okur (henüz hiçbir yerden import edilmiyor)
  - `.env.example`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - `lib/tipler.ts`: `Rol`, `Kurum`, `Sinif`, `Kullanici`, `Ogrenci`
  - `app/index.tsx`: boş başlangıç ekranı
  - Doğrulama: `tsc --noEmit`, `expo-doctor` (21/21) ve `expo export --platform web` başarılı
- [ ] Supabase kurulumu (Auth + temel tablolar + RLS)
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
- **`.gitignore`:** `.env` eklendi (şablon yalnızca `.env*.local`'i ignore ediyordu); `.env.example` takip ediliyor.

## Bilinen Sorunlar / Yarım Kalanlar

_(Bir sonraki oturuma devredilen, tam bitmeyen işler)_

- `lib/supabase.ts` env eksikken fırlattığı hata, web statik export'ta (`expo export --platform web`) test edilirken build'i düşürmedi; mesaj bundle'da mevcut ama fırlatma davranışı uçtan uca doğrulanmadı. Dosya henüz import edilmediği için şimdilik etkisiz — ilk gerçek kullanımda (login) kontrol edilmeli.
- Uygulama cihaz/simülatörde açılıp görsel olarak doğrulanmadı (yalnızca derleme/tip/doctor kontrolleri).

## Açık Sorular (insan kararı bekleyen)

_(Claude Code'un kendi başına karar veremeyip kullanıcıya sorması gereken noktalar)_

- Supabase proje bilgileri (URL, anon key) henüz yok — `.env` oluşturulmalı.
- Veritabanı tipleri ileride `supabase gen types` ile mi üretilecek, yoksa `lib/tipler.ts` elle mi sürdürülecek?
- Varsayılan Node sürümü 22'ye alınsın mı?

## Son Oturum Notu

_(Serbest metin: bu oturumda ne yapıldı, bir sonraki oturuma nereden devam edilmeli)_

- 2026-09-25: Proje iskeleti kuruldu (bkz. Tamamlananlar). Bir sonraki oturumda Supabase projesi açılıp `.env` doldurulduktan sonra ilk migration'lar (kurum, sinif, kullanici, ogrenci, veli_ogrenci, ogretmen_sinif + kurum_id bazlı RLS) yazılabilir. Komutlar için önce `nvm use 22`.