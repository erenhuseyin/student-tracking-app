# İlerleme Günlüğü

> Bu dosyayı Claude Code her oturum sonunda güncelleyecek. Amaç: yeni bir oturuma başlarken "nerede kalmıştık" sorusunu sıfırdan anlatmaya gerek kalmasın. Detaylı ürün kararları için `docs/proje-spesifikasyonu.md`'ye bak.

## Şu An Neredeyiz

- **Aktif faz:** Faz 1 — MVP
- **Aktif adım:** Yoklama alma tamamlandı. **Sıradaki: Veli girişini TCKN+PIN'e çevirme — plan hazır (bkz. "Sıradaki İş" bölümü aşağıda), henüz uygulanmadı.**
- **Son güncelleme:** 2026-09-28

## Sıradaki İş: Veli Girişini TCKN + PIN'e Çevirme (plan hazır, kod yazılmadı)

_(Bu bölüm, session temizliği öncesi hazırlanan uygulanmamış bir plan. Yeni oturum burayı okuyup doğrudan uygulamaya geçebilir.)_

**Context:** Veliler düşük teknoloji okuryazarlığına sahip; e-posta+şifre (davet linki dahil) ve SMS OTP ikisi de fazla adım gerektiriyor (kullanıcı kararı, 2026-09-28). Yerine: veli, **öğrencinin TCKN'si + 4 haneli PIN** ile giriş yapar. Yeni öğrenciye TCKN atanınca PIN otomatik `1234` olur. Veli PIN'ini kendi değiştirebilir; **unutursa kurum admini (ve süper admin) sıfırlayıp tekrar `1234` yapabilir** — öğretmen bu yetkiye sahip değil (mevcut kural: öğretmenin veli üzerinde yazma yetkisi yok).

**Neden sadece TCKN değil (tartışıldı, reddedildi):** TCKN gizli değil (yoklama kağıdı, sınıf listesi vb.), tek başına kimlik doğrulaması olamaz — TCKN'yi bilen herkes (veli olmayan biri dahil) çocuğun gelişim kaydına erişebilirdi. PIN eklenince TCKN yalnızca "kullanıcı adı" gibi davranır.

**Bilinçli kabul edilen sonuç:** TCKN öğrenciye ait olduğu için "bir öğrencinin birden fazla velisi" ayrımı pratikte kalkıyor — aynı TCKN+PIN'i bilen herkes aynı "veli" görünümüne girer, ayrı ayrı loglanamaz. `veli_ogrenci` çoka-çok tablosu ve RLS mimarisi **değişmeden** kalıyor; bu yalnızca giriş deneyimini değiştiriyor, veri modelini değil. TCKN yalnızca **ilk kez atanır**, sonradan değiştirilemez (MVP sınırı) — yalnızca PIN sıfırlanabilir.

**Teknik yaklaşım:** Supabase Auth email+şifre mekanizması arkada aynen kullanılır (RLS, `kullanici`/`veli_ogrenci` hiç değişmez). `email = {tckn}@veli.ogrencitakip.internal` (gerçek posta kutusu değil, yalnızca benzersiz kimlik), `password = PIN`.

**Şifre politikası engeli:** `supabase/config.toml`'da `minimum_password_length = 6`; 4 haneli PIN bunu karşılamaz. **Kullanıcının yapması gereken:** Dashboard > Authentication > Policies (Password) ekranından minimum uzunluğu 4'e indirmesi (kod/migration değil, bir ayar). `config.toml` da tutarlılık için güncellenecek.

### Yapılacaklar
1. **Migration:** `ogrenci` tablosuna `tckn text unique` + `check (tckn is null or tckn ~ '^[0-9]{11}$')`. Kolon yetkisi: `tckn` istemciden (kurum_admin dahil) yazılamaz — yalnızca aşağıdaki Edge Function'lar (service role) yazar. Mevcut geniş `ogrenci` update yetkisi `grant update (kurum_id, sinif_id, ad_soyad, dogum_tarihi)` ile daraltılır.
2. **Edge Function `tckn-hesap-olustur`:** girdi `{ogrenci_id, tckn}`. Yetki: `kurum_admin` (kendi kurumu) / `super_admin`. TCKN format + resmi TCKN checksum algoritmasıyla doğrulanır. Öğrencinin zaten TCKN'si varsa 409. Akış: `auth.admin.createUser({email, password:'1234', email_confirm:true})` → `kullanici` insert (`rol:'veli'`) → `veli_ogrenci` insert → `ogrenci.tckn` update. Herhangi bir adım düşerse auth kullanıcısı silinir (`davet-gonder`'daki `geriAl` deseni tekrar kullanılır).
3. **Edge Function `veli-pin-sifirla`:** girdi `{ogrenci_id}` (ya da `veli_kullanici_id`). Yetki: `kurum_admin` (kendi kurumu) / `super_admin`. İlgili veli `auth.users` kaydını bulup `auth.admin.updateUserById(authId, {password:'1234'})`.
4. **`lib/ogrenciler.ts`:** `tcknAta(ogrenciId, tckn)`, `veliPininiSifirla(ogrenciId)` — `lib/davet.ts`'deki hata-ayrıştırma deseniyle Edge Function'ları invoke eder.
5. **Kurum admini ekranı:** `ogrenci-duzenle/[id].tsx`'e (veya sınıf detayına) "TCKN Ata" (TCKN boşsa input+buton, doluysa salt okunur) ve "Veli PIN'ini Sıfırla" (TCKN doluysa görünür) bölümleri.
6. **`app/(auth)/veli-giris.tsx`** (yeni): TCKN (11 hane, numeric) + PIN (4 hane, numeric, gizli) iki alan. `signInWithPassword({email:`${tckn}@veli.ogrencitakip.internal`, password: pin})`. Hata: "TCKN veya PIN hatalı."
7. **`(auth)/login.tsx`:** altına "Veli misiniz? TCKN ile giriş yapın" linki → `/veli-giris`.
8. **`app/(veli)/pin-degistir.tsx`** (yeni): veli girişliyken kendi PIN'ini değiştirir (yeni PIN + tekrar, `supabase.auth.updateUser({password: yeniPin})` — ekstra Edge Function gerekmez, Supabase'in standart "kendi şifresini değiştirme" akışı). `(veli)/index.tsx`'e link eklenir.
9. **`docs/proje-spesifikasyonu.md`** Bölüm 9'a bu kararı ve gerekçesini ekle.
10. **Kapsam dışı:** TCKN değiştirme, öğrenci silinince orphan auth hesabının temizlenmesi, `davet-gonder`'ın kullanılmayan `veli` dalının temizliği.

### Doğrulama planı
- `tsc --noEmit`, `npx deno check` (iki yeni fonksiyon).
- Migration + kolon kısıtı Dashboard'dan uygulanır (kullanıcı onayı gerekir, uzak DB değişikliği).
- Web'de: mevcut test öğrencisi "Elif Kaya"ya **uydurma** (gerçek kişiye ait olmayan, yalnızca checksum'ı geçerli) bir TCKN atanır → `/veli-giris`'te TCKN+`1234` ile giriş → `(veli)` ekranı → PIN değiştir → eski PIN'le giriş reddedilmeli, yenisiyle başarılı olmalı → kurum admini PIN'i sıfırlar → tekrar `1234` ile girilebilmeli.

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
- [x] Süper admin: kurum ekleme akışı — 2026-09-27
  - `lib/kurumlar.ts`: `kurumlariGetir`, `kurumEkle` — RLS (`kurum_super_admin` politikası) zaten yalnızca super_admin'e izin verdiği için Edge Function gerekmedi, doğrudan `supabase.from('kurum')` çağrısı
  - `(super_admin)/index.tsx`: kurum listesi (`useFocusEffect` ile ekrana her dönüşte tazelenir) + "Yeni Kurum Ekle"
  - `(super_admin)/yeni-kurum.tsx`: tek alanlı form (kurum adı)
  - **Kapsam dışı bırakıldı (kullanıcı kararı):** ilk kurum admininin daveti aynı akışa eklenmedi — `davet-gonder` henüz deploy edilmedi, ayrı bir adımda ele alınacak
  - Web'de gerçek insert ile uçtan uca doğrulandı: boş liste → "Test Kurumu — silinecek" oluşturuldu, listede göründü → test verisi SQL Editor'de silindi (`delete from public.kurum where ad = '...'`), veride iz kalmadı
- [x] Login ekranı — 2026-09-27 (davetle kullanıcı oluşturma ekranı `davet-kabul.tsx` henüz yok, kapsam dışı bırakıldı)
  - `lib/oturum.tsx`: `OturumSaglayici` + `useOturum()` — dört durum: `yukleniyor`, `oturum_yok`, `profil_yok` (auth hesabı var ama `kullanici` satırı yok), `hazir`
  - `app/(auth)/login.tsx` + `app/(auth)/_layout.tsx`; `app/_layout.tsx` artık `Stack.Protected` (expo-router 57) ile durum bazlı yönlendiriyor, `yukleniyor` sırasında native splash açık kalıyor
  - `app/index.tsx`: geçici karşılama + Çıkış Yap (rol bazlı yönlendirme henüz yok)
  - Web'de (Claude in Chrome ile) canlı doğrulandı: `/` → oturum yokken `/login`'e düşüyor; boş gönderim ve **gerçek** yanlış e-posta/şifre denemesi doğru Türkçe hata veriyor
  - **Gerçek girişle uçtan uca doğrulandı (2026-09-27):** ilk süper admin (`admin@test.local`) ile giriş → "Hoş geldin, Test Admin (super_admin)"; sayfa yenilenince oturum kalıcı (login'e düşmedi); Çıkış Yap → `(auth)/login`'e döndü
- [x] Rol bazlı yönlendirme (admin/öğretmen/veli farklı ekranlar görür) — 2026-09-27
  - 4 route grubu: `(super_admin)`, `(kurum_admin)`, `(ogretmen)`, `(veli)` — her biri şimdilik placeholder `index.tsx` (gerçek CRUD kendi adımlarında)
  - **Spec'ten sapma:** `docs/proje-spesifikasyonu.md` Bölüm 8'de tek `(admin)` grubu öneriliyordu; süper admin (tüm kurumlar) ve kurum admini (yalnızca kendi kurumu) yetkileri RLS'te net ayrı olduğundan iki ayrı gruba bölündü, adlar DB `rol` enum'uyla birebir aynı
  - `app/profil-yok.tsx`: `profil_yok` ekranı `app/index.tsx`'ten buraya taşındı (kök `app/index.tsx` silindi)
  - `components/CikisYapButonu.tsx`: ortak çıkış butonu
  - `app/_layout.tsx`: `Stack.Protected` guard'ları `durum` + `kullanici?.rol`'e göre 6 gruba çıktı (auth, profil-yok, 4 rol)
  - Web'de **süper admin** akışı uçtan uca doğrulandı: giriş → `(super_admin)` ekranı, çıkış → login'e dönüş
  - **kurum_admin/ogretmen/veli ekranları test edilmedi** (test hesabı yok) — kod incelemesiyle doğrulandı, guard mantığı 4 rol için simetrik
- [x] Sınıf/öğrenci yönetimi (CRUD) — 2026-09-28 (kurum admini tarafı)
  - `lib/siniflar.ts`, `lib/ogrenciler.ts`: tam CRUD (ekle/listele/düzenle/sil) — RLS (`sinif_kurum_admin`, `ogrenci_kurum_admin` politikaları, `for all`) zaten yeterli, Edge Function gerekmedi
  - Ekranlar: `(kurum_admin)/index.tsx` (sınıf listesi + düzenle/sil), `yeni-sinif.tsx`, `sinif-duzenle/[id].tsx`, `sinif/[id].tsx` (öğrenci listesi + düzenle/sil), `yeni-ogrenci.tsx`, `ogrenci-duzenle/[id].tsx`
  - `components/SilOnayButonu.tsx`: iki adımlı inline silme onayı ("Sil" → "Emin misiniz? Evet, sil / Vazgeç") — `Alert.alert` kullanılmadı (web'de tarayıcı `confirm()`'e sarılabilir)
  - **Silme kısıtı:** `ogrenci.sinif_id` FK'sinde `on delete` belirtilmemiş (varsayılan `no action`) → öğrencisi olan sınıf silinemez; bu, `sinifSil`'de `23503` hata koduyla yakalanıp "Bu sınıfta öğrenci var, önce onları başka bir sınıfa taşıyın veya silin." mesajına çevrildi
  - Öğrenci doğum tarihi elle `YYYY-AA-GG` girilir (native tarih seçici kapsam dışı)
  - Web'de kurum admini test hesabıyla (`kurumadmin@test.local`) **tam CRUD döngüsü uçtan uca doğrulandı:** sınıf ekle → düzenle → öğrenci ekle → düzenle → öğrencili sınıfı silmeyi dene (doğru hata) → öğrenciyi sil → sınıfı sil (başarılı)
- [x] Yoklama alma — 2026-09-28 (öğretmen tarafı + kullanıcı kararıyla genişletildi: veli görüntüleme; push bildirim hâlâ ayrı madde)
  - Migration `20260928120000_yoklama.sql` + `20260928120100_yoklama_tamamla.sql` (ikiye bölünmesinin sebebi: ilki Dashboard'da elle çalıştırılırken `giren_kullanici_id` FK'si atlanmıştı, dosyalar DB'nin gerçek uygulanma sırasını yansıtıyor)
  - `yoklama` tablosu: `unique(ogrenci_id, tarih)` — günde tek kayıt, öğretmen tekrar işaretlerse `lib/yoklama.ts`'teki `yoklamaKaydet` upsert ile günceller
  - RLS: super_admin/kurum_admin tümü; ogretmen yalnızca kendi öğrencilerine insert/update (delete yok), `giren_kullanici_id` sahteciliği `with check`'te engellendi; veli yalnızca kendi çocuklarına select
  - Ekranlar: `(ogretmen)/index.tsx` (sınıf listesi) → `(ogretmen)/yoklama/[sinifId].tsx` (tek dokunuşla Geldi/Gelmedi/Geç işaretleme); `(veli)/index.tsx` (çocuk listesi) → `(veli)/yoklama/[ogrenciId].tsx` (salt okunur geçmiş)
  - `supabase/tests/rls.test.sql`'e 11. bölüm eklendi (izolasyon, yetki, upsert/unique senaryoları) — **hepsi geçti**
  - **Test sırasında bir test-script hatası bulundu (güvenlik açığı değil):** "sa kurum/kullanici/..." testleri sabit sayı bekliyordu, kalıcı test verisiyle (bkz. altta) çakıştı; testler artık "mevcut kalıcı veri + bu transaction'ın eklediği veri" bekleyecek şekilde düzeltildi (`set_config('tst.taban_...')` deseni)
  - Kalıcı test verisi genişledi: `ogretmen@test.local` (1-A sınıfına atanmış), `veli@test.local` (Elif Kaya'nın velisi), sınıf "1-A" + öğrenci "Elif Kaya" (Test Okulu'nda)
  - Web'de **tam uçtan uca doğrulandı:** kurum admini sınıf+öğrenci oluşturdu → öğretmen "Geldi" işaretledi → veli ekranında "2026-09-28 → Geldi" doğru göründü
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
- **Kalıcı test verisi (2026-09-28, genişletildi):** Kurum "Test Okulu" içinde tüm roller test edilebilir durumda:
  - `admin@test.local` — super_admin
  - `kurumadmin@test.local` — kurum_admin (Test Okulu)
  - `ogretmen@test.local` — ogretmen, sınıf "1-A"ya atanmış
  - `veli@test.local` — veli, öğrenci "Elif Kaya"nın velisi (1-A sınıfında)
  - Hepsinin şifresi `Test1234!`. Bulmak için: `select id from public.kurum where ad = 'Test Okulu';` / `select ad_soyad, rol from public.kullanici where kurum_id = (select id from public.kurum where ad = 'Test Okulu') or rol = 'super_admin';`
- **Görsel tasarım bilinçli olarak ertelendi (2026-09-27 karar):** Şu ana kadarki tüm ekranlar (login, kurum listesi/ekleme, rol ana sayfaları) işlevsel doğrulama için minimal/placeholder stille yazıldı — sabit renkler (`#208aef` vb.), tasarım sistemi/tema, ikon, marka kimliği yok. Gerçek görsel tasarım ayrı bir aşamada ele alınacak; o zamana kadar yeni ekranlar da aynı minimal desenle (mevcut stil dosyalarındaki gibi) yazılmaya devam edilecek, üstüne tasarım geldiğinde toplu güncellenecek.
- **Mobilde canlı doğrulandı (2026-09-27):** `npx expo start` (LAN, Expo Go) ile gerçek bir telefonda login ekranı açıldı. Web'de test edilenlerin native tarafta da derlenip render olduğu doğrulandı; rol ekranları/kurum ekleme mobilde ayrıca test edilmedi (yalnızca login ekranı görüldü).

## Bilinen Sorunlar / Yarım Kalanlar

_(Bir sonraki oturuma devredilen, tam bitmeyen işler)_

- `lib/supabase.ts` env eksikken fırlattığı hata, web statik export'ta (`expo export --platform web`) test edilirken build'i düşürmedi; mesaj bundle'da mevcut ama fırlatma davranışı uçtan uca doğrulanmadı. Dosya henüz import edilmediği için şimdilik etkisiz — ilk gerçek kullanımda (login) kontrol edilmeli.
- **Tipler elle yazıldı, üretilmedi:** bkz. Alınan Teknik Kararlar. CLI çalışınca `npm run tipleri-uret` ile gerçek çıktıyla değiştirilmeli. Not: `.select('yok_kolon')` derleme hatası vermez (sonuç tipi `SelectQueryError` olur); yanlış tablo adı ve yanlış enum değeri derleme hatası verir.
- **`profil_yok` ekranı ve kurum_admin/ogretmen/veli rol ekranları test edilmedi** (test hesabı yok). Gerçek test için o rollerden birer test kullanıcısı gerekiyor (Dashboard + SQL Editor'de aynı yöntemle: bkz. yukarıdaki ilk süper admin notu).
- **`davet-gonder` deploy edilmedi ve yetki mantığı uçtan uca test edilmedi.** Yerelde (`deno check` + yerel sunucu) doğrulananlar: derleme temiz; GET→405, başlıksız→401, sahte JWT→401, anon key ile→401. Doğrulanmayanlar: yetki matrisi (403/kurum zorlaması), 409, doğrulama hataları, rollback, gerçek davet e-postası. Bunlar ilk süper admin + test hesapları hazır olunca test edilmeli (gerçek e-posta için test adresi kullanıcıdan istenmeli).
- **Davet geri alındığında ölü link:** `inviteUserByEmail` e-postayı DB insert'lerinden ÖNCE gönderiyor; sonraki bir adım düşerse kullanıcı silinir ama e-posta çoktan gitmiştir (link çalışmaz). Kabul edildi; sık olursa ele alınmalı.
- **Deploy öncesi Dashboard ayarları (kullanıcı):** Authentication > URL Configuration > Redirect URLs'e `ogrencitakip://davet-kabul` (ve web karşılığı) eklenmeli; Authentication > Sign In / Providers'ta **"Allow new users to sign up" kapatılmalı** (yalnızca davetle üye alınacak; şu an herkes publishable key ile `auth.users`'a kayıt açabilir — veriye erişemez ama gereksiz hesap üretir).
- **İlk süper admin eklendi (test hesabı):** `admin@test.local` / `kullanici.ad_soyad = 'Test Admin'`, Dashboard > Authentication'dan oluşturuldu + yukarıdaki SQL ile `kullanici` satırı eklendi. Gerçek bir kurum/kullanıcı için ayrıca üretim hesabı açılmalı.
- Dashboard > Advisors (Security) kontrolü yapılmadı; "RLS disabled" uyarısı olmaması beklenir.
- Uygulama cihaz/simülatörde açılıp görsel olarak doğrulanmadı (yalnızca derleme/tip/doctor kontrolleri).

## Açık Sorular (insan kararı bekleyen)

_(Claude Code'un kendi başına karar veremeyip kullanıcıya sorması gereken noktalar)_

- Özel SMTP: Supabase'in dahili e-posta servisinin saatlik gönderim limiti çok düşük; gerçek onboarding (davetler) öncesi özel SMTP ayarlanmalı, davet e-posta şablonu Türkçeleştirilmeli.
- İlk kurum admini daveti: `(super_admin)/yeni-kurum.tsx`'e mi eklensin (kurum + admin tek form), yoksa kurum listesinde satır başına "Admin Davet Et" mi olsun? İkisi de `davet-gonder`'ın deploy edilmesini gerektiriyor.
- **Veli girişi kararlaştırıldı: TCKN + 4 haneli PIN (2026-09-28).** SMS OTP fikri de (maliyet/sağlayıcı belirsizliği nedeniyle) elendi. Detaylı plan hazır, bkz. dosyanın başındaki "Sıradaki İş" bölümü — uygulanmayı bekliyor, karar verilmiş bir konu değil artık.

## Son Oturum Notu

_(Serbest metin: bu oturumda ne yapıldı, bir sonraki oturuma nereden devam edilmeli)_

- 2026-09-25: Proje iskeleti kuruldu.
- 2026-09-26: Supabase çekirdek şema + RLS yazıldı, Dashboard'dan uygulandı, izolasyon testi geçti (bir yetki yükseltme açığı testte bulunup kapatıldı). Node 22 artık varsayılan. Davet Edge Function ve hibrit tip yapısı eklendi (tipler CLI olmadığı için elle yazıldı).
- 2026-09-27: Login ekranı + oturum durumu (`lib/oturum.tsx`, `Stack.Protected`) yazıldı, ilk süper admin (test hesabı) eklendi, web'de uçtan uca doğrulandı (giriş, kalıcı oturum, çıkış). Rol bazlı yönlendirme: 4 route grubu (`(super_admin)`, `(kurum_admin)`, `(ogretmen)`, `(veli)`). Süper admin — yeni kurum ekleme akışı: `lib/kurumlar.ts` + liste/form ekranları, Edge Function gerekmedi (RLS yeterli), web'de gerçek insert ile uçtan uca doğrulandı. Mobilde (Expo Go, LAN) login ekranı canlı doğrulandı.
- 2026-09-28: Sınıf/öğrenci yönetimi (CRUD) — kurum admini tarafı — tamamlandı. `kurumadmin@test.local` test hesabı oluşturuldu (kalıcı bırakıldı, kurum: "Test Okulu"). Tam CRUD döngüsü web'de uçtan uca doğrulandı.
- 2026-09-28 (devam): Yoklama alma (öğretmen + veli görüntüleme) tamamlandı. `ogretmen@test.local` ve `veli@test.local` test hesapları eklendi (kalıcı). Test dosyasında kalıcı veriyle çakışan bir sayım hatası bulunup düzeltildi (güvenlik açığı değil). Web'de tam zincir uçtan uca doğrulandı: kurum admini sınıf/öğrenci oluşturdu → öğretmen yoklama işaretledi → veli gördü.
- 2026-09-28 (devam 2): Veli girişi tartışıldı — önce TCKN ile ilişkisiz erişim (KVKK riski, reddedildi), sonra telefon+SMS OTP (maliyet/sağlayıcı belirsizliği, elendi), son karar: **TCKN + 4 haneli PIN** (varsayılan `1234`, veli değiştirebilir, kurum admini/süper admin sıfırlayabilir — öğretmen yetkisiz). Detaylı plan `docs/ILERLEME.md`'nin başındaki "Sıradaki İş" bölümüne yazıldı, **kod henüz yazılmadı**. Context yoğunluğu nedeniyle (Chrome MCP ekran görüntüleri) oturum burada kesiliyor. Bir sonraki oturum doğrudan "Sıradaki İş" bölümündeki 10 maddeyi uygulayabilir; adım 1'den (migration) başlanmalı, plan mode gerektirir (CLAUDE.md kuralı, çok dosyalı iş).