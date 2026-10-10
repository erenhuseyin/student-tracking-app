# Öğrenci Gelişim Takip Uygulaması — Proje Spesifikasyonu

## 1. Proje Özeti

Bir eğitim kurumu için, öğretmenlerin öğrenci gelişimini kaydedebildiği, velilerin de bu gelişimi takip edebildiği cross-platform (mobil + web) bir uygulama.

## 2. Tech Stack

- **Frontend:** Expo (React Native) + Expo Router — tek kod tabanından iOS, Android, web
- **Backend:** Supabase (Postgres + Auth + Storage + Row Level Security + Edge Functions)
- **Push Notification:** Expo Notifications (FCM/APNs sarmalayıcı) + Expo Push API
- **Build/Dağıtım:** EAS Build + EAS Submit → Google Play Console (internal testing track)

## 3. Roller

| Rol | Yetki |
|---|---|
| Süper admin | Tüm kurumları görür/yönetir |
| Kurum admini | Sadece kendi kurumunu yönetir |
| Öğretmen | Kendine atanan sınıf/öğrencileri görür, yoklama ve gelişim kaydı girer |
| Veli | Sadece kendi çocuğunun kayıtlarını görür |

> Not: Öğrenci girişi (öğrenci kendi hesabıyla giriş yapar mı) ilk fazda kapsam dışı — gerekirse sonraki fazda eklenir.

## 4. Temel Veri Modeli

- **kurum** — id, ad, ayarlar, ust_kurum_id (şube ise ana kurumu), marka_kodu (yalnızca ana kurumda), ozellikler (müşteriye özel özellik bayrakları)
- **sinif** — id, kurum_id, ad, dönem
- **kullanici** — id, auth_id (Supabase auth), rol, kurum_id, ad_soyad
- **ogrenci** — id, kurum_id, kok_kurum_id (otomatik), sinif_id, ad_soyad, doğum_tarihi, tckn (müşteri başına tekil), aktif (pasif = ayrılmış; kayıtları korunur)
- **veli_ogrenci** — veli_id, ogrenci_id (çoka çok ilişki — bir veli birden fazla çocuk, bir öğrencinin birden fazla velisi olabilir)
- **ogretmen_sinif** — ogretmen_id, sinif_id (atama tablosu)
- **yoklama** — id, ogrenci_id, tarih, durum (geldi/gelmedi/geç/mazeretli), giren_kullanici_id
- **sinif_ders_plani** — id, kurum_id, sinif_id, baslangic_tarihi (geçerli olduğu ilk haftanın pazartesisi), ders_gunleri (1=Pzt … 7=Paz)
- **gelisim_kategorisi** — id, kurum_id (kök kurum = müşteri), ad, sira, aktif
- **gelisim_kaydi** — id, kurum_id, kok_kurum_id (otomatik), ogrenci_id, kategori_id, not_metni, olcek_degeri (isteğe bağlı 1-5), tarih, giren_kullanici_id, foto_yolu (ileride; private storage yolu)
- **duyuru** — id, kurum_id, kok_kurum_id (otomatik), sinif_id (boşsa kurum geneli; kök kurumsa şubeler dahil), tur (duyuru/etkinlik), baslik, icerik, etkinlik_zamani, yer, giren_kullanici_id
- **kapali_bolum** — kurum_id (kök kurum), rol (öğretmen/veli), bolum_anahtari — müşterinin o rol için kapattığı bölümler (satır yoksa açık)
- **ders_programi** — id, kurum_id, sinif_id, gun (1-7), baslangic_saati, bitis_saati, ders_adi
- **kademe / kademe_dersi / ders_konusu / ezber_maddesi** — müşteri (kök kurum) düzeyinde müfredat tanımları; `sinif.kademe_id` sınıfın izlediği kademe
- **sinif_konu_ilerleme** — sinif_id, konu_id, tamamlanma_tarihi (satır varsa konu işlendi)
- **ogrenci_ezber** — ogrenci_id, madde_id, durum (devam/tamam; satır yoksa başlamadı)
- **kitap_okuma** — id, ogrenci_id, baslik, yazar, durum (başlamadı/okuyor/bitti), tarihler
- **devamsizlik_bildirimi** — id, kurum_id, ogrenci_id, tarih, neden, giren_kullanici_id (velinin önceden bildirdiği devamsızlık; yoklamayı değiştirmez)
- **oneri** — id, kurum_id, kok_kurum_id (otomatik), giren_kullanici_id, metin, okundu (veliden kuruma tek yönlü)
- **basvuru** — id, kurum_id, kok_kurum_id (otomatik), tur (öğrenci/personel), durum (bekliyor/onaylandı/reddedildi), ad_soyad, öğrenci alanları (dogum_tarihi, tckn, veli_ad_soyad, veli_telefon) ya da eposta, karar bilgisi
- **bildirim_log** — id, alıcı_kullanici_id, tip, baslik, metin, ogrenci_id / duyuru_id (ilgili kayıt), gönderim_tarihi, okundu_mu

## 5. Multi-Tenant Mimari Notu

Ürün tek bir kuruma değil, **birden fazla kuruma satılacak bir SaaS ürünü** olarak tasarlanacak. Bunun mimariye etkileri:

- **Veri izolasyonu:** Tüm tablolarda `kurum_id` zorunlu ve Supabase RLS politikaları her sorguyu `kurum_id` bazında filtreleyecek şekilde kurulacak — bir kurumun kullanıcısı asla başka kurumun verisini göremeyecek.
- **Ölçek varyasyonu:** Kurum başına 3-30 öğretmen, öğretmen başına 8-30 öğrenci aralığında değişkenlik var. Bu ölçekte performans sorunu beklenmez; sadece `sinif_id`, `ogretmen_id`, `kurum_id` üzerinde index'lerin baştan doğru kurulması yeterli.
- **Kurum onboarding:** İleride self-servis kurum kaydı düşünülüyorsa (yeni kurum admin kendi kurumunu oluşturup üye olur), `kurum` tablosuna plan/abonelik durumu gibi alanlar eklenebilir — ilk fazda bu alan boş bırakılıp elle (süper admin üzerinden) kurum açılabilir.
- **Süper admin paneli** bu yüzden MVP'de göz ardı edilmemeli; en azından "yeni kurum ekle" akışı ilk fazda olmalı.
- **Kurum hiyerarşisi:** Bir müşteri (ana kurum) altında şubeler olabilir (Uğur Dershanesi → Bakırköy, Şirinevler). En fazla 2 seviye. Ana kurumun yöneticisi tüm şubeleri yönetir (şube açar, şube verisini görür ve düzenler); şube yöneticisi yalnızca kendi şubesini görür.
- **Müşteriye özel uygulama (white-label):** Her müşteri Google Play'de kendi adı, ikonu ve rengiyle ayrı bir uygulamaya sahiptir. Uygulamalar aynı kod tabanından, `markalar/<kod>/` yapılandırmasıyla derlenir ve aynı backend'i kullanır. Bir müşterinin kullanıcısı başka müşterinin uygulamasından giriş yapamaz. Müşteriye özel ek özellikler kod çatallanarak değil, müşteri bazlı özellik bayraklarıyla açılır.

## 6. KVKK / Veri Gizliliği Notları

- Veli aydınlatma metni + açık rıza akışı (özellikle fotoğraf paylaşımı için ayrı rıza)
- Öğrenci fotoğrafları private storage'da tutulacak, imzalı (signed) URL ile erişilecek
- Erişim logları: kim hangi öğrenci kaydına baktı
- Veri saklama/silme politikası tanımlanacak

## 7. Fazlar

### Faz 1 — MVP (Play Store'a ilk sürüm, Android öncelikli)
- [ ] Proje iskeleti (Expo + Expo Router)
- [ ] Supabase kurulumu (Auth + temel tablolar + kurum_id bazlı RLS)
- [ ] Süper admin: yeni kurum ekleme akışı
- [ ] Login / davetle kullanıcı oluşturma ekranları
- [ ] Rol bazlı yönlendirme (admin/öğretmen/veli farklı ekranlar görür)
- [ ] Sınıf ve öğrenci yönetimi (CRUD)
- [ ] Yoklama alma (öğretmen tarafı)
- [ ] Veliye yoklama bildirimi (push)
- [ ] EAS build + Play Console internal testing'e yükleme

### Faz 1.5 — iOS
- [ ] EAS build + App Store Connect'e yükleme (TestFlight)
- [ ] iOS'a özgü push izin akışı (APNs) kontrolü

### Faz 2 — Gelişim Takibi
- [ ] Gelişim kaydı girme (kategori + not + opsiyonel foto)
- [ ] Veli tarafında gelişim zaman çizelgesi / özet görünümü
- [ ] Gelişim kaydı push bildirimi

### Faz 3 — Genişletme
- [ ] Duyuru / mesajlaşma modülü
- [ ] Raporlama (PDF export)
- [ ] Kurum onboarding'in self-servis hale getirilmesi (abonelik/plan alanları)

## 8. Klasör Yapısı Önerisi (Expo Router)

```
app/
  (auth)/
    login.tsx
    davet-kabul.tsx
  (admin)/
    kurumlar.tsx
    kullanicilar.tsx
  (ogretmen)/
    siniflarim.tsx
    yoklama.tsx
    gelisim-kaydi.tsx
  (veli)/
    cocuklarim.tsx
    gelisim-gecmisi.tsx
lib/
  supabase.ts
  auth.ts
  notifications.ts
  marka.ts
  tema.ts
components/
markalar/
  <kod>/
    marka.json
    google-services.json
supabase/
  migrations/
```

> Güncel durum (2026-10-08): rol grupları `(super_admin)`, `(kurum_admin)`, `(ogretmen)`, `(veli)`; her birinde ana bölümler `(sekmeler)/` altında sekmedir (`index`, …, `menu`), detay ekranları grubun kökünde durur ve sekmelerin üstünde açılır. Bölümlerin listesi `lib/menu.ts`'tedir.

## 9. Netleşen Kararlar

- **İçerik takibi müşteri bazlı bir özelliktir (2026-10-10).** Kademe (müfredat) → ders → konu, ezber listesi ve kitap okuma takibi, Genç Hareket'in mevcut aracından (GH KÂŞİF) alındı. Tanımları ana kurumun yöneticisi yapar; sınıf bir kademeyi izler; konu ilerlemesini, öğrenci ezberini ve kitaplarını sınıfın öğretmeni ve yönetici girer; veli çocuğunun ezber ve kitaplarını görür. Her kurumun işi olmadığı için `kurum.ozellikler.icerik_takibi` ile açılır.
- **Mazeretli yoklama (2026-10-10).** Dördüncü yoklama durumu. Katılım oranında ne katıldı ne katılmadı sayılır: paydaya girmez, ayrıca gösterilir.
- **Öğrenci silinmez, pasife alınır (2026-10-10).** Ayrılan öğrenci pasife alınır; listelerde ve yoklamada görünmez, tüm kayıtları korunur, yeniden aktifleştirilebilir. Silme yalnızca yanlış açılmış kayıt içindir (yoklaması olan öğrenci silinemez).
- **Dışa aktarma yalnızca web'de (2026-10-10).** Yönetici raporları Excel'in açtığı CSV olarak tarayıcıdan indirilir; telefonda dışa aktarma yoktur.
- **Mesajlaşma yok; veli tek yönlü yazar (2026-10-08).** Veli–öğretmen mesajlaşması yapılmayacak. Veliden kuruma iki tek yönlü kanal var: **devamsızlık bildirimi** (çocuğun gelmeyeceği gün + neden; öğretmen o günün yoklamasında görür, yoklamayı yine öğretmen işaretler) ve **öneri** (yalnızca yöneticiler okur, günde en fazla 5; uygulamadan yanıt yazılmaz).
- **Dönem geçişi yok (2026-10-08).** Sınıflar yıl sonunda üst sınıfa "geçirilmez": bir sınıf (ör. vakıfta "Bilinçli Mucitler") yıllarca aynı adla ve aynı ekiple sürebilir. `sinif.donem` yalnızca bilgi alanıdır.
- **Aidat/ödeme takibi kapsam dışı (2026-10-08, şimdilik).**
- **Kardeşler tek hesapta (2026-10-08).** Veli, aynı kurumdaki diğer çocuğunu o çocuğun TCKN + PIN'iyle kendi hesabına bağlar; ilişki zaten çoka çoktur. Çocukların kendi girişleri çalışmaya devam eder. Farklı şubelerdeki kardeşler bağlanamaz.
- **Bildirimler uygulamada da listelenir (2026-10-08).** Gönderilen her bildirim alıcının "Bildirimler" ekranında görünür ve okundu olarak işaretlenir; bildirim metninde not/içerik yer almaz (yalnızca öğrenci adı ve tür ya da duyuru başlığı).
- **Silme, düzenleme ekranındadır (2026-10-08).** Liste satırlarında silme düğmesi bulunmaz; kayıt düzenleme ekranında, onay sorularak silinir.
- **Menü yetkisi: roller sabit, bölüm görünürlüğü ayarlanır (2026-10-08).** Kurumun kendi rollerini tanımlaması reddedildi (tüm RLS'in yetki tablosuna göre yeniden yazılması gerekirdi). Ana kurumun yöneticisi "Roller ve Yetkiler" ekranından **öğretmen ve veli** için bölümleri (Yoklama, Gelişim, Duyurular, Ders Programı) kapatabilir; yönetici bölümleri kapatılamaz. Ayar müşteri düzeyindedir (şubeler ortak kullanır, şube yöneticisi salt okunur görür) ve yalnızca kapatılanlar saklanır (`kapali_bolum`). **Bu bir görünürlük ayarıdır, güvenlik sınırı değildir:** veriye erişimi RLS belirler ve rol başına sabittir.
- **Duyurular ve etkinlikler (2026-10-08).** Kapsam: sınıf / şube / tüm müşteri (kök kuruma yazılan duyuru şubeleri de kapsar). Kurum admini yönettiği kurumlara, **öğretmen yalnızca atandığı sınıfa** yazar ve yalnızca kendi yazdığını değiştirir. Yeni duyuruda kapsamdaki velilere (kurum genelinde öğretmenlere de) push gider; bildirimde yalnızca başlık yer alır; düzeltme bildirilmez.
- **Ders programı (2026-10-08).** Sınıfın haftalık ders saatleri; "kurumun programı" tüm sınıfların birleşik görünümüdür (ayrı veri yok). Ders adı serbest metindir. Kurum admini ve sınıfın öğretmeni düzenler, veli çocuğunun sınıfınınkini görür. **Yoklama günde tek kalır** (2026-10-06 kararı değişmedi): program bilgilendirme amaçlıdır ve değişince sınıfın ders günlerini günceller.
- **Veli girişi sunucudan geçer; deneme sınırı ve zorunlu PIN değişimi (2026-10-08).** Aşağıdaki TCKN + PIN kararı korunur, uygulanışı değişti: Auth şifresi artık PIN'in kendisi değil, sunucudaki gizli anahtarla PIN'den türetilen değerdir (istemci doğrudan Auth'a deneme yapamasın diye). Giriş `veli-giris` fonksiyonundan yapılır; 5 yanlış denemede hesap 15 dakika kilitlenir (yönetici PIN'i sıfırlayınca açılır). Başlangıç PIN'iyle ("1234") açılan ya da PIN'i sıfırlanan veli, yeni PIN belirlemeden uygulamayı kullanamaz; "1234" yeni PIN olarak seçilemez.
- **Başvuruyla kayıt (2026-10-08).** Veli çocuğu için ön kayıt, öğretmen adayı katılma başvurusu yapar; **kurum yöneticisi onaylar ya da reddeder** ("içeride girilen kaydın üst onayı" seçeneği seçilmedi). Onayla öğrenci + veli hesabı ya da öğretmen hesabı mevcut akışlarla açılır. Özellik **varsayılan kapalıdır** ve müşteri bazında süper admin tarafından açılır (`kurum.ozellikler.basvuru`), çünkü giriş yapmamış kişilere yazma yolu açar; tabloya istemciden yazılamaz, başvuru sunucuda hız sınırıyla alınır. Yönetici hesabı başvuruyla açılmaz.
- **Gezinme: alt sekme çubuğu + Menü (2026-10-08).** Her rolün ana bölümleri sekmedir (kurum admini: Sınıflar, Personel, Şubeler [yalnızca ana kurum], Menü; öğretmen: Sınıflarım, Menü; veli: Çocuklarım, Menü; süper admin: Kurumlar, Menü); tablet ve masaüstünde çubuk solda durur. Seyrek kullanılan bölümler, tema seçimi ve çıkış Menü sekmesindedir; "yeni ekle" eylemi başlık çubuğunda "+"dır. Ana sayfa kart ızgarası ve yandan açılan çekmece reddedildi. Yeni bölüm `lib/menu.ts`'e eklenir. Roller sabittir; ileride eklenecek "menü yetkisi" yalnızca bölümlerin görünürlüğünü ayarlar, veri yetkisi RLS'te kalır.
- **Multi-tenant:** Ürün birden fazla kuruma satılacak şekilde tasarlanıyor (bkz. Bölüm 5).
- **Kurum hiyerarşisi + müşteriye özel uygulama (2026-10-02).** Ana kurum → şube (2 seviye; sınırsız derinlik özyinelemeli RLS gerektirdiği için reddedildi). Yeni rol/tablo eklenmedi: kök kurumun `kurum_admin`'i ana kurum yöneticisidir ve şubelerde tam yetkilidir. Her müşteri = bir kök kurum + bir `marka_kodu` + bir uygulama (ayrı EAS projesi ve Android paketi, aynı Firebase projesi, aynı Supabase projesi). TCKN artık sistem genelinde değil **müşteri başına** tekildir (aynı çocuk iki müşteride bulunabilir); veli e-postası `{tckn}@{marka_kodu}.veli.internal` oldu, bu yüzden marka kodu atandıktan sonra değiştirilemez. Bugünkü uygulama `varsayilan` markasıdır. Kapsam dışı: kendi uygulaması olmayan müşterilerin ortak bir uygulamadan girmesi, bir öğrencinin aynı müşteride iki şubede olması, marka başına web dağıtımı.
- **Haftalık yoklama ve katılım oranı (2026-10-06).** Günde tek yoklama korunur ("ders" = sınıfın ders yaptığı gün; günde birden fazla ders reddedildi). Öğretmen sınıfın **ders günlerini** seçer; plan "şu haftadan itibaren geçerli" saklanır, değişiklik geçmiş haftaları etkilemez. **Katılım oranı = (geldi + geç) / yoklaması alınmış ders sayısı**: geç katılmış sayılır; yoklaması alınmamış gün öğrencinin aleyhine sayılmaz, planlı olup işaretlenmemiş geçmiş günler öğretmene uyarı olarak gösterilir; plan dışı günde alınan yoklama (telafi) da sayılır. Oran istemcide hesaplanır (`lib/katilim.ts`), veritabanında saklanmaz. Öğretmen haftalık tabloyu ve katılım listesini görür, tablodan geçmiş bir günün yoklamasını açıp düzeltebilir (geçmiş gün düzeltmesi veliye bildirilmez); kurum admini aynı görünümü salt okunur, veli kendi çocuğunun haftalık oranını görür.
- **Gelişim kaydı (2026-10-06).** Öğretmen öğrenciye kategori + not + isteğe bağlı 1-5 puan girer; veli çocuğunun zaman çizelgesini görür ve yeni kayıtta push alır (düzeltmede bildirim gitmez; bildirim metninde not yer almaz, yalnızca öğrenci adı ve kategori). **Kategorileri kurum tanımlar** (sabit liste reddedildi): müşteri (kök kurum) düzeyinde tutulur, şubeler ortak kullanır, yalnızca kök kurumun admini yönetir; her kök kuruma Akademik/Sosyal/Davranış/Diğer otomatik eklenir. Kullanılmış kategori silinmez, pasifleştirilir. Öğretmen yalnızca **kendi girdiği** kaydı düzenler/siler, sınıfın diğer öğretmeninin kaydını okur; kurum admini yönettiği kurumların tüm kayıtlarını yönetir. Kaydı girenin adı veliye gösterilmez (veli ve öğretmen başka personelin `kullanici` satırını okuyamaz; açmak ayrı bir karar). Fotoğraf sonraki tura bırakıldı (native bağımlılık + yeni build + KVKK fotoğraf rızası).
- **Personel hesabı: e-posta daveti + 6 haneli kod (2026-10-05).** Öğretmen ve kurum yöneticisi hesaplarını yönetici açar (süper admin → kurum yöneticisi; kurum admini → kendi kurumu ve şubeleri için öğretmen/yönetici). Kişiye e-postayla tek kullanımlık kod gider; uygulamada "Davet kodum var" ile kodu girip şifresini kendisi belirler. Aynı akış şifre unutmada da kullanılır. Geçici şifre (yönetici şifreyi bilir) ve derin bağlantılı davet linki (marka başına şema, e-posta uygulamasına göre güvenilmez) reddedildi. E-posta EmailJS üzerinden kullanıcının Gmail hesabıyla gider (alan adı olmadığı için; ayda 200 ücretsiz) — alan adı alınırsa yalnızca `personel-yonet` içindeki `epostaGonder` değişir. Personel silinmez, pasifleştirilir (girdiği yoklama kayıtları korunur).
- **Ölçek:** Kurum başına 3-30 öğretmen, öğretmen başına 8-30 öğrenci aralığında değişkenlik bekleniyor.
- **Platform:** Android ilk faz, iOS kesinlikle planda (Faz 1.5) — Expo seçimi zaten her ikisini de aynı kod tabanından kolaylaştırıyor.
- **Veliye yoklama bildirimi: Expo Push API, sunucu tarafında (2026-09-30).** Öğretmen yoklama girdiğinde, istemci (`yoklamaKaydet`) kayıt başarılı olduktan sonra bir Edge Function'ı (`yoklama-bildirim-gonder`) çağırır; bu fonksiyon `veli_ogrenci` üzerinden velileri bulup Expo Push API'yi çağırır (Expo access token istemciye asla gitmez). DB trigger/`pg_net` webhook alternatifi reddedildi — projede hiç DB→HTTP altyapısı yok, mevcut "yetkilendirme = Edge Function" tutarlılığını bozardı. Her yoklama kaydı (öğretmenin bir önceki hatayı düzeltmesi dahil) bildirim gönderir — değişmemiş değer için dedup mantığı MVP'de yok. `bildirim_log`'a veli başına bir satır yazılır (okundu_mu alıcıya özel olduğu için). **Kritik dış kısıt:** Expo Go SDK 53'ten beri gerçek push alamıyor; cihazda test için EAS development build (Firebase FCM V1 + EAS hesabı, kullanıcının kendisinin yapması gereken harici adımlar) gerekiyor — bu proje henüz hiç EAS build çalıştırmadı. iOS (APNs) kapsam dışı, Faz 1.5'te.
- **Veli girişi: TCKN + 4 haneli PIN (2026-09-28).** Veliler düşük teknoloji okuryazarlığına sahip; e-posta+şifre (davet linki dahil) ve SMS OTP ikisi de fazla adım gerektiriyor. TCKN tek başına yeterli değildir — gizli sayılmaz (yoklama kağıdı, sınıf listesi vb. yerlerde görünür); PIN eklenince TCKN yalnızca "kullanıcı adı" gibi davranır. Yeni öğrenciye TCKN atanınca PIN otomatik `1234` olur, veli kendi PIN'ini değiştirebilir, unutursa kurum admini/süper admin sıfırlayıp tekrar `1234` yapabilir (öğretmenin bu yetkisi yok). Kabul edilen sonuç: TCKN öğrenciye ait olduğu için "bir öğrencinin birden fazla velisi" ayrımı bu giriş yönteminde pratik olarak kalkıyor — aynı TCKN+PIN'i bilen herkes aynı "veli" görünümüne girer. `veli_ogrenci` çoka-çok tablosu ve RLS mimarisi **değişmedi**; bu yalnızca giriş deneyimini değiştiriyor, veri modelini değil. TCKN yalnızca ilk atamada yazılır (MVP sınırı) — sonradan değiştirilemez, yalnızca PIN sıfırlanabilir. Teknik olarak Supabase Auth email+şifre mekanizması arkada aynen kullanılıyor (`email = {tckn}@{marka_kodu}.veli.internal`, `password = PIN`; 2026-10-02'de müşteri başına tekil olacak şekilde güncellendi).