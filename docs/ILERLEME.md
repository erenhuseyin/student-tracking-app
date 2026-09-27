# İlerleme Günlüğü

> Bu dosyayı Claude Code her oturum sonunda güncelleyecek. Amaç: yeni bir oturuma başlarken "nerede kalmıştık" sorusunu sıfırdan anlatmaya gerek kalmasın. Detaylı ürün kararları için `docs/proje-spesifikasyonu.md`'ye bak.

## Şu An Neredeyiz

- **Aktif faz:** Faz 1 — MVP
- **Aktif adım:** Login ekranı uçtan uca doğrulandı (ilk süper admin ile); sıradaki adım: Rol bazlı yönlendirme
- **Son güncelleme:** 2026-09-27

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
- [x] Login ekranı — 2026-09-27 (davetle kullanıcı oluşturma ekranı `davet-kabul.tsx` henüz yok, kapsam dışı bırakıldı)
  - `lib/oturum.tsx`: `OturumSaglayici` + `useOturum()` — dört durum: `yukleniyor`, `oturum_yok`, `profil_yok` (auth hesabı var ama `kullanici` satırı yok), `hazir`
  - `app/(auth)/login.tsx` + `app/(auth)/_layout.tsx`; `app/_layout.tsx` artık `Stack.Protected` (expo-router 57) ile durum bazlı yönlendiriyor, `yukleniyor` sırasında native splash açık kalıyor
  - `app/index.tsx`: geçici karşılama + Çıkış Yap (rol bazlı yönlendirme henüz yok)
  - Web'de (Claude in Chrome ile) canlı doğrulandı: `/` → oturum yokken `/login`'e düşüyor; boş gönderim ve **gerçek** yanlış e-posta/şifre denemesi doğru Türkçe hata veriyor
  - **Gerçek girişle uçtan uca doğrulandı (2026-09-27):** ilk süper admin (`admin@test.local`) ile giriş → "Hoş geldin, Test Admin (super_admin)"; sayfa yenilenince oturum kalıcı (login'e düşmedi); Çıkış Yap → `(auth)/login`'e döndü
- [ ] Rol bazlı yönlendirme (admin/öğretmen/veli farklı ekranlar görür) — `app/index.tsx`'teki geçici karşılama bunun yerini alacak
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
- **Kullanıcı oluşturma = davet Edge Function (2026-09-26 karar):** `auth.users` trigger'ı YOK. `supabase/functions/davet-gonder/index.ts`: çağıranın JWT'si doğrulanır, rol/kurum kararını sunucu verir (super_admin → yalnızca `kurum_admin` davet eder, kurum_id gövdeden; kurum_admin → ogretmen/veli/kurum_admin, hedef kurum HER ZAMAN kendi kurumu; diğerleri 403; `super_admin` API'den verilmez). service_role ile `inviteUserByEmail` + `kullanici` + bağ satırları; herhangi biri düşerse auth kullanıcısı silinir (FK cascade). İstemci: `lib/davet.ts` (`davetGonder`).
- **Tipler = hibrit (2026-09-26 karar):** `supabase gen types` çıktısı `lib/veritabani.tipleri.ts` (elle dokunulmaz), `lib/tipler.ts` üstünde ince takma adlar. `lib/veritabani.tipleri.ts` `createClient<Database>` ile bağlı, `lib/tipler.ts` bunun üzerine takma adlar. **Dosya CLI ile üretilmedi, ELLE yazıldı** (CLI girişi çalışmadı) ve migration'larla kolon bazında betikle doğrulandı; şema değişince elle güncellenmeli ya da CLI çalışınca `SUPABASE_PROJECT_REF=<ref> npm run tipleri-uret` ile üzerine yazılmalı (biçim üretilmiş çıktıyla uyumlu, `tipler.ts` yalnızca `Tables<>`/`Constants`'a dayanıyor).
- **`supabase/functions` `tsconfig.json`'da exclude edildi:** Deno kodu (`npm:` importları, `Deno.*`) uygulamanın `tsc`'sinde hata verir. Fonksiyon `npx deno check` ile ayrıca doğrulanır.
- **Kurum admini `ayarlar`'ı düzenler (2026-09-26 karar):** `kurum` için kolon yetkisi `(ad, ayarlar)`; `ad` değişikliği trigger ile yalnızca süper admine bırakıldı. **Plan/abonelik gibi kurum admininin değiştirmemesi gereken alanlar `ayarlar` içine konmamalı**, ayrı kolon olmalı ve kolon yetkisi verilmemeli.
- **Öğretmen sınıfındaki velileri görür (2026-09-26 karar):** `kullanici` üzerinde `gizli.ogretmen_velisi_mi()` politikası. RLS satır süzer, kolon değil: `kullanici`'ya telefon/e-posta gibi hassas kolon eklenirse öğretmene de açılır; iletişim bilgisi ayrı tabloda tutulmalı (KVKK).
- **Varsayılan Node 22** (`nvm alias default 22`, 2026-09-26). Artık her terminalde `nvm use 22` gerekmez; Node 16'ya bağımlı başka projeler varsa onlarda `nvm use 16` gerekir.
- **`.env` URL'si:** `supabase-js` proje kök adresini (`https://<ref>.supabase.co`) ister; Dashboard'daki "Data API" adresi `/rest/v1/` ile biter ve **çalışmaz** (doğrulandı: 404). Bkz. `.env.example`.
- **`.gitignore`:** `.env` eklendi (şablon yalnızca `.env*.local`'i ignore ediyordu); `.env.example` takip ediliyor.

## Bilinen Sorunlar / Yarım Kalanlar

_(Bir sonraki oturuma devredilen, tam bitmeyen işler)_

- `lib/supabase.ts` env eksikken fırlattığı hata, web statik export'ta (`expo export --platform web`) test edilirken build'i düşürmedi; mesaj bundle'da mevcut ama fırlatma davranışı uçtan uca doğrulanmadı. Dosya henüz import edilmediği için şimdilik etkisiz — ilk gerçek kullanımda (login) kontrol edilmeli.
- **Tipler elle yazıldı, üretilmedi:** bkz. Alınan Teknik Kararlar. CLI çalışınca `npm run tipleri-uret` ile gerçek çıktıyla değiştirilmeli. Not: `.select('yok_kolon')` derleme hatası vermez (sonuç tipi `SelectQueryError` olur); yanlış tablo adı ve yanlış enum değeri derleme hatası verir.
- **`profil_yok` ekranı test edilmedi** (auth hesabı var ama `kullanici` satırı yok senaryosu). Gerçek giriş artık test edildi (bkz. Tamamlananlar).
- **`davet-gonder` deploy edilmedi ve yetki mantığı uçtan uca test edilmedi.** Yerelde (`deno check` + yerel sunucu) doğrulananlar: derleme temiz; GET→405, başlıksız→401, sahte JWT→401, anon key ile→401. Doğrulanmayanlar: yetki matrisi (403/kurum zorlaması), 409, doğrulama hataları, rollback, gerçek davet e-postası. Bunlar ilk süper admin + test hesapları hazır olunca test edilmeli (gerçek e-posta için test adresi kullanıcıdan istenmeli).
- **Davet geri alındığında ölü link:** `inviteUserByEmail` e-postayı DB insert'lerinden ÖNCE gönderiyor; sonraki bir adım düşerse kullanıcı silinir ama e-posta çoktan gitmiştir (link çalışmaz). Kabul edildi; sık olursa ele alınmalı.
- **Deploy öncesi Dashboard ayarları (kullanıcı):** Authentication > URL Configuration > Redirect URLs'e `ogrencitakip://davet-kabul` (ve web karşılığı) eklenmeli; Authentication > Sign In / Providers'ta **"Allow new users to sign up" kapatılmalı** (yalnızca davetle üye alınacak; şu an herkes publishable key ile `auth.users`'a kayıt açabilir — veriye erişemez ama gereksiz hesap üretir).
- **İlk süper admin eklendi (test hesabı):** `admin@test.local` / `kullanici.ad_soyad = 'Test Admin'`, Dashboard > Authentication'dan oluşturuldu + yukarıdaki SQL ile `kullanici` satırı eklendi. Gerçek bir kurum/kullanıcı için ayrıca üretim hesabı açılmalı.
- Dashboard > Advisors (Security) kontrolü yapılmadı; "RLS disabled" uyarısı olmaması beklenir.
- Uygulama cihaz/simülatörde açılıp görsel olarak doğrulanmadı (yalnızca derleme/tip/doctor kontrolleri).

## Açık Sorular (insan kararı bekleyen)

_(Claude Code'un kendi başına karar veremeyip kullanıcıya sorması gereken noktalar)_

- Özel SMTP: Supabase'in dahili e-posta servisinin saatlik gönderim limiti çok düşük; gerçek onboarding (davetler) öncesi özel SMTP ayarlanmalı, davet e-posta şablonu Türkçeleştirilmeli.

## Son Oturum Notu

_(Serbest metin: bu oturumda ne yapıldı, bir sonraki oturuma nereden devam edilmeli)_

- 2026-09-25: Proje iskeleti kuruldu.
- 2026-09-26: Supabase çekirdek şema + RLS yazıldı, Dashboard'dan uygulandı, izolasyon testi geçti (bir yetki yükseltme açığı testte bulunup kapatıldı). Node 22 artık varsayılan. Davet Edge Function ve hibrit tip yapısı eklendi (tipler CLI olmadığı için elle yazıldı).
- 2026-09-27: Login ekranı + oturum durumu (`lib/oturum.tsx`, `Stack.Protected`) yazıldı, ilk süper admin (test hesabı) eklendi, web'de uçtan uca doğrulandı (giriş, kalıcı oturum, çıkış). Bir sonraki oturum: rol bazlı yönlendirme.