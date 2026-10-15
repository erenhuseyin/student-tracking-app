# İlerleme

> Güncel durum, hâlâ geçerli teknik kararlar ve açık sorunlar. Claude Code her oturum sonunda günceller; **kısa tutulur** — biten işin ayrıntısı buraya değil commit mesajına ve gerekirse arşive yazılır. Ürün kararları: `docs/proje-spesifikasyonu.md`. Sıradaki işler: `docs/YAPILACAKLAR.md`.
>
> Tam geçmiş (2026-09-25 – 2026-10-15; her özelliğin doğrulama ayrıntıları, oturum notları, çözülmüş sorunlar): `docs/arsiv/ILERLEME-2026-09-25_2026-10-15.md`. Yalnızca eski bir kararın gerekçesi gerekiyorsa okunur.

## Şu An Neredeyiz (2026-10-15)

- **Faz 1 — MVP.** Kalan büyük adım: telefonda doğrulama + development build, ardından KVKK/mağaza hazırlığı ve EAS build + Play Console iç test.
- `redesign/defter` `main`'e birleşti. Web sürümü **Netlify**'da (`netlify.toml`; Supabase anahtarları Netlify ortam değişkenlerinde; "Powered by Netlify" rozeti proje ayarından kapatıldı).
- **Push edilmemiş commit'ler** (Netlify'a gitmedi): Küçükçekmece test verisi betiği, il tohumu, pano il tablosunun 8 satırla sınırlanması (`57a6c05`, canlıda pano çok ille uzuyor), belgelerin kısaltılması, B6.
- **Canlı veri (2026-10-15):** genel merkez altında 7 il kaldı (İstanbul, Ankara, İzmir, Bursa, Konya, Kocaeli + Gebze, Adana); tohumun eklediği diğer 20 il silindi.
- **B6 (rol ve görev arayüzde tek kavram):** yerelde doğrulandı (RLS süiti, görünmez Chrome 25/25). Migration ve fonksiyon yok; push + Netlify deploy yeter.
- **B7 (konu notu, yanıt, ders raporu):** migration ve RLS testleri canlıda. Teyit edilmedi: `kademe-dersleri-genchareket.sql` tohumu ve `konu-notu-bildirim-gonder` deploy'u (bkz. YAPILACAKLAR A6).

## Canlı Ortam ve Dağıtım

- Supabase CLI bağlı değil: **migration'lar Dashboard > SQL Editor'den, Edge Function'lar Dashboard > Edge Functions'tan elle** uygulanır. Uzak migration geçmişi boş; CLI bağlanırsa `supabase migration repair --status applied <versiyon>` gerekir, yoksa `db push` her şeyi yeniden dener.
- Her migration'dan sonra `supabase/tests/rls.test.sql` tam süiti çalıştırılır ("TÜM RLS TESTLERİ GEÇTİ"). Düşen test önce test betiği hatası mı diye bakılır (geçmişte çoğu öyleydi).
- Tohumlar (`supabase/tohum/`) migration değildir, müşteriye özel veridir, `marka_kodu = 'varsayilan'` kök kurumunu hedefler ve yeniden çalıştırılabilir. `genchareket` markası açılınca onun için de çalıştırılmalı.
- Secrets (Supabase > Edge Functions): `EXPO_ACCESS_TOKEN` (Expo robot user), `VELI_PIN_ANAHTARI` (**asla değiştirilmez**; değişirse tüm veli PIN'leri geçersiz olur), dört `EMAILJS_*`.
- Expo/EAS: proje `ergenecode` hesabında (`tigirkutmotun` değil). Android paketi `com.ergenecode.ogrencitakip`. Firebase FCM V1 için **iki dosya da** gerekli: service account anahtarı (`eas credentials`) ve `google-services.json` (build'e gömülür); biri eksikse token sessizce alınamaz. Expo Go gerçek push alamaz → development build.
- Web/marka yapılandırması değişince `npx expo start --clear` şart (yapılandırma pakete gömülü; yoksa "Marka yapılandırması bulunamadı").

## Test Hesapları ve Verisi

- `supabase/tests/test-verisi.sql` — tüm veriyi silip Genç Hareket örnek ağacını kurar (yalnızca yerelde / bilinçli olarak). Şifreler `Test.1234!`. Başlıcaları: genel merkez `abdulkadir_kizilboga`, il `emir_yuksek` (İstanbul), `bekir_irtegun` (Elazığ), ilçe `huseyin_eren` (Sancaktepe), `cemal_efe` (Küçükçekmece), temsilcilik `onur_gomleksiz` (Sefaköy), `musab_kulaz` (İkitelli), öğretmen `furkan_gumusn`, `huseyin_erdogan`, `abdulkadir_cabbar_bitigen` (hepsi `@test.local`).
- `supabase/tests/test-verisi-kucukcekmece.sql` — ekleyici: `hamza_karaca@test.local` (genel merkez yöneticisi) + İkitelli/Sefaköy'e sınıf, kademe, program, öğrenci, yoklama, ilerleme, ezber. Hamza varsa durur.
- `supabase/tohum/`: ezber listesi (52 madde), Kademe I-III dersleri (200 konu), temsilcilik illeri.

## Yerel Doğrulama Yöntemi

1. `npx supabase start` → `npx supabase db reset` → test verisi ve tohumlar: `docker exec -i supabase_db_student-tracking-app psql -U postgres -d postgres < dosya.sql`.
2. Fonksiyonlar: `npx supabase functions serve --env-file <scratchpad>/fn.env` (`VELI_PIN_ANAHTARI` içerir). Yerel anahtarlar: `npx supabase status -o env`.
3. Uygulama: `CI=1 EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 EXPO_PUBLIC_SUPABASE_ANON_KEY=<yerel anon> npx expo start --web --port 8098 --clear` (`CI=1` dosya izlemez; kod değişince yeniden başlat).
4. Ekran: puppeteer-core + görünmez Chrome betikleri oturumun scratchpad'inde (repoya girmez); 1440 ve 390 genişlik. Claude in Chrome yalnızca kullanıcı isteyince.
5. Bitince `npx supabase stop --no-backup`. **Docker kapatılmaz** (kullanıcının `uygulamam-postgres` konteyneri çalışıyor).
- Kontroller: `npm run typecheck`, `npm run lint`, fonksiyonlar için `npx deno check` (`supabase/functions` uygulamanın `tsconfig`'inden hariç).
- Yeni rota eklenince `typecheck` rota tipini tanımazsa dev sunucusu kısa süre çalıştırılır (`.expo/types/router.d.ts` onu üretir).

## Geçerli Teknik Kararlar

**Veritabanı ve RLS**
- Yardımcı fonksiyonlar API'ye kapalı `gizli` şemasında (`security definer`, `search_path=''`); politikalar yalnızca `authenticated` için, `anon` her tablodan revoke. `kullanici` satırı olmayan ya da pasif kullanıcı hiçbir şey görmez.
- Yönetici politikası: `kurum_id in (select gizli.yonetilen_kurum_idleri())` (düğüm + altı, `kurum.yol` ile). **İstisna `kurum` tablosu:** politikalar satırın kendi kolonlarıyla yazılır (`insert ... returning`'de yeni satır fonksiyonun snapshot'ında görünmez).
- "Eski değer"e bakan kural (`kimse kendi rolünü değiştiremez`, `yanıtı yalnızca yönetici yazar` vb.) `with check`'e değil **trigger**'a yazılır — `with check` içinde aynı tabloyu okuyan fonksiyon yeni değeri görür (2026-09-26'da bu yüzden yetki yükseltme açığı çıktı).
- İstemcinin yazamayacağı alanlar kolon bazlı `grant` ile kapatılır. **Kolon yetkisi kısıtlı tabloda PostgREST upsert kullanılmaz** (çakışmada tüm kolonları yazmaya çalışır → 42501); önce oku, sonra update/insert.
- Kurumlar arası yanlış bağ bileşik FK `(x_id, kurum_id)` ile engellenir.
- Pano fonksiyonları (`pano_ozeti`, `pano_iller`, `pano_cinsiyet`) `security definer` ve yalnızca sayı + birim adı döndürür; satır düzeyinde rapor (`ders_raporu`) `security invoker`'dır, satırları RLS belirler.
- `kullanici` satırını öğretmen (sınıfının velileri için) okuyabilir → telefon/e-posta gibi hassas veri `kullanici`'ya konmaz, ayrı tabloda tutulur. Personel e-postası `kullanici.eposta`'da (velide boş).
- `kurum.ayarlar`'ı yönetici yazabilir; yönetici değiştirmemesi gereken alan (plan, abonelik) ayrı kolon olur. `kurum.ozellikler` ve `marka_kodu`'nu yalnızca süper admin yazar.
- `rls.test.sql` tek transaction'dır; bölümler önceki bölümlerin değişikliklerini devralır (rol değişmiş kullanıcı, eklenmiş sınıf). Sayım yerine adla kontrol tercih edilir; istemci rolüyle yalnızca grant verilmiş kolonlar yazılır.

**Kimlik ve giriş**
- Personel: e-posta daveti + 6 haneli kod (`personel-yonet`, EmailJS + kişisel Gmail, ayda 200). Personel silinmez, pasifleştirilir.
- Veli: `ad.soyad` kullanıcı adı + 4 haneli PIN; Auth şifresi `HMAC(VELI_PIN_ANAHTARI, e-posta:PIN)`, giriş yalnızca `veli-giris` fonksiyonundan (5 yanlışta 15 dk kilit). `pinSifresi` birkaç fonksiyonda kopya — biri değişirse hepsi değişir. Şifre yönetici API'siyle değişince Auth tüm oturumları kapatır; bu yüzden PIN değiştirme taze oturum döndürür.
- `supabase-js` admin API'sinde `getUserByEmail` yok (`listUsers` sayfalaması ya da `kullanici.eposta` araması).
- Supabase Auth ile devam (custom auth reddedildi; veli hesabı öğrenci başına, MAU ücretsiz katmanda rahat).

**Uygulama**
- Marka derleme zamanı (`markalar/<kod>/marka.json`, `app.config.ts`, `MARKA` ortam değişkeni), özellik çalışma zamanı (`kurum.ozellikler`, `useOzellik`). `varsayilan` markası şu an "Genç Hareket" adı, logosu ve kömür/altın paletiyle; ayrı `genchareket` markası açılmadı.
- Düzen kararı tek yerde: `lib/tema.ts > useDuzen` (`web` / `mobil`). Rol başına menü `lib/menu.ts`; aynı adresin birden çok rol grubunda olması yüzünden adres `rolYolu` ile kullanıcının grubuna sabitlenir.
- Bildirimler istemcinin kayıttan sonra çağırdığı Edge Function'larla gider (DB trigger / `pg_net` yok); en iyi çaba, hata kaydı geçersiz kılmaz. Bildirim metninde not/içerik yer almaz.
- Tipler `lib/veritabani.tipleri.ts`'de **elle** yazılı (CLI üretemiyor); şema değişince elle güncellenir.
- Node 22 varsayılan. Prettier yapılandırılmamış (kullanma). `.env`'deki Supabase adresi proje kök adresidir (`/rest/v1/` değil).
- Dağıtım modeli: özel uygulama isteyen müşteriye kendi geliştirici hesabından, istemeyene bizim uygulamada kurum. Bizim uygulamada ikinci kök kurum açılacaksa `kurum_marka_kodu_key` kaldırılmalı (arşivde adımlar; veli e-postası marka başına olduğu için aynı kullanıcı adı iki kurumda çakışır).

## Bilinen Sorunlar ve Sınırlar

- **Telefonda (native) son haftalarda yazılan hiçbir şey görülmedi**; yeni development build gerekiyor (Manrope, `userInterfaceStyle: 'automatic'`, logo/ikon/açılış). Yoklama tamamlanınca giden bildirim, konu notu yanıt bildirimi, etkinlik bildirimi gerçek push ile denenmedi.
- Mağaza için logo çözünürlüğü düşük (400×149); vektör ya da büyük logo gerekli.
- Özet ve bazı raporlar istemcide toplanıyor; büyük ağaçta 1000 satır sınırına takılabilir (pano ve ders raporu sunucuda).
- Tanımlı rolde kapatılan **sekme** gizlenir ama adresle açılabilir (menü ekranları adresle de kapalı). Menü değişikliği kişinin bir sonraki girişinde görünür.
- Silme: yoklaması olan öğrenci silinemez (pasife alınır); bildirim almış kullanıcı `bildirim_log` FK'si yüzünden silinemez. Cascade mi anonimleştirme mi — KVKK veri silme politikasıyla karar verilecek.
- Birimi, personeli ya da öğrenciyi başka birime taşıma yok.
- Kod/DB ayrışma riski: migration, fonksiyon ve tipler elle taşınıyor; uygulama kodunun otomatik testi ve CI yok; hata/çökme izleme yok.

## Açık Sorular

- Hoca kendi sınıfını/öğrencisini açarken silme/pasife alma yetkisi ve müşteri bazında kapatılabilirliği (B2).
- `genchareket` markasının paleti ve mağaza logosu (GH KÂŞİF'teki büyük logolar kullanılabilir mi).
- Mağaza politikalarının (Apple 4.2.6/4.3, Google tekrarlayan içerik) güncel metni ilk özel uygulamadan önce doğrulanmalı.
- GH KÂŞİF'in `PROJECT_STATE.md`'sinde yönetici şifreleri açık yazıyor; canlıda aynıysa değiştirilmeli (kullanıcıya iletildi).

## Tamamlananlar (özet; ayrıntı arşivde)

- 2026-09-25/27 — İskelet, Supabase şema + RLS, giriş, rol bazlı yönlendirme, süper adminin kurum eklemesi.
- 2026-09-28/10-02 — Sınıf/öğrenci CRUD, yoklama, veliye push (FCM + gerçek cihazda doğrulandı), kurum hiyerarşisi + white-label altyapısı.
- 2026-10-05/06 — Görsel tasarım, personel daveti (EmailJS), gelişim kaydı, haftalık yoklama ve katılım oranı, "Defter" yeniden tasarımı + karanlık tema.
- 2026-10-08 — Sekmeli gezinme, profil, Roller ve Yetkiler, duyurular/etkinlikler, ders programı, veli girişi güvenliği, başvuruyla kayıt, bildirim merkezi, yönetici özeti, toplu öğrenci ekleme, devamsızlık bildirimi + öneri.
- 2026-10-10 — GH KÂŞİF'ten: kademe/ders/konu, ezber, kitap, mazeretli yoklama, pasif öğrenci, arama, CSV.
- 2026-10-12 — Dört seviyeli kurum ağacı, yönetim tabloları + görevler + Menü Yetkileri, pano (harita, "en"ler), ortak ezber listesi, yoklama ekranı yenilemesi, yoklama tamamlanınca bildirim.
- 2026-10-13 — Web/mobil düzen ayrımı, logo ve palet, TCKN'nin kaldırılması (veli `ad.soyad` ile girer).
- 2026-10-14 — Takvim, herkesin programı, cinsiyet, öğrenci/hoca detay ekranları; kademe-ders kusurları; B7 (konu notu ve yanıtı, işlenme tarihi, Ezber görünümü, Konu Notları, Ders Raporu, Kademe I-III tohumu).
- 2026-10-15 — B6: rol ve görev arayüzde tek "rol" (sistem + tanımlı roller), kişiye tek seçimle rol, Roller ekranında menüler, Menü Yetkileri ekranı kalktı. Netlify web dağıtımı; Küçükçekmece test verisi; temsilcilik illeri tohumu (canlıda 7 ile indirildi); pano il tablosu sınırı; bu dosyanın arşivlenip kısaltılması.

## Son Oturum Notu

- 2026-10-15: İl tohumu canlıda çalıştırıldı, pano il kartı uzadı → 20 il silindi, tabloya 8 satır sınırı (push bekliyor). Netlify rozeti kapatıldı. ILERLEME.md 168 KB'tan kısaltıldı, tam metin arşivde. B6 plan mode'da planlandı (yalnızca arayüz birleşmesi) ve yapıldı; `OnayKutusu` web'de `aria-checked` yazmıyordu, düzeltildi. Sıradaki: push + Netlify deploy, sonra YAPILACAKLAR (telefon doğrulaması, B1-B2).
