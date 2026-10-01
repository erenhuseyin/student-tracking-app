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

- **kurum** — id, ad, ayarlar
- **sinif** — id, kurum_id, ad, dönem
- **kullanici** — id, auth_id (Supabase auth), rol, kurum_id, ad_soyad
- **ogrenci** — id, kurum_id, sinif_id, ad_soyad, doğum_tarihi
- **veli_ogrenci** — veli_id, ogrenci_id (çoka çok ilişki — bir veli birden fazla çocuk, bir öğrencinin birden fazla velisi olabilir)
- **ogretmen_sinif** — ogretmen_id, sinif_id (atama tablosu)
- **yoklama** — id, ogrenci_id, tarih, durum (geldi/gelmedi/geç), giren_kullanici_id
- **gelisim_kaydi** — id, ogrenci_id, kategori (akademik/sosyal/davranış vb.), not, ölçek_değeri, tarih, giren_kullanici_id, foto_url (opsiyonel)
- **duyuru** — id, kurum_id/sinif_id, başlık, içerik, tarih
- **bildirim_log** — id, alıcı_kullanici_id, tip, gönderim_tarihi, okundu_mu

## 5. Multi-Tenant Mimari Notu

Ürün tek bir kuruma değil, **birden fazla kuruma satılacak bir SaaS ürünü** olarak tasarlanacak. Bunun mimariye etkileri:

- **Veri izolasyonu:** Tüm tablolarda `kurum_id` zorunlu ve Supabase RLS politikaları her sorguyu `kurum_id` bazında filtreleyecek şekilde kurulacak — bir kurumun kullanıcısı asla başka kurumun verisini göremeyecek.
- **Ölçek varyasyonu:** Kurum başına 3-30 öğretmen, öğretmen başına 8-30 öğrenci aralığında değişkenlik var. Bu ölçekte performans sorunu beklenmez; sadece `sinif_id`, `ogretmen_id`, `kurum_id` üzerinde index'lerin baştan doğru kurulması yeterli.
- **Kurum onboarding:** İleride self-servis kurum kaydı düşünülüyorsa (yeni kurum admin kendi kurumunu oluşturup üye olur), `kurum` tablosuna plan/abonelik durumu gibi alanlar eklenebilir — ilk fazda bu alan boş bırakılıp elle (süper admin üzerinden) kurum açılabilir.
- **Süper admin paneli** bu yüzden MVP'de göz ardı edilmemeli; en azından "yeni kurum ekle" akışı ilk fazda olmalı.

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
components/
supabase/
  migrations/
```

## 9. Netleşen Kararlar

- **Multi-tenant:** Ürün birden fazla kuruma satılacak şekilde tasarlanıyor (bkz. Bölüm 5).
- **Ölçek:** Kurum başına 3-30 öğretmen, öğretmen başına 8-30 öğrenci aralığında değişkenlik bekleniyor.
- **Platform:** Android ilk faz, iOS kesinlikle planda (Faz 1.5) — Expo seçimi zaten her ikisini de aynı kod tabanından kolaylaştırıyor.
- **Veliye yoklama bildirimi: Expo Push API, sunucu tarafında (2026-09-30).** Öğretmen yoklama girdiğinde, istemci (`yoklamaKaydet`) kayıt başarılı olduktan sonra bir Edge Function'ı (`yoklama-bildirim-gonder`) çağırır; bu fonksiyon `veli_ogrenci` üzerinden velileri bulup Expo Push API'yi çağırır (Expo access token istemciye asla gitmez). DB trigger/`pg_net` webhook alternatifi reddedildi — projede hiç DB→HTTP altyapısı yok, mevcut "yetkilendirme = Edge Function" tutarlılığını bozardı. Her yoklama kaydı (öğretmenin bir önceki hatayı düzeltmesi dahil) bildirim gönderir — değişmemiş değer için dedup mantığı MVP'de yok. `bildirim_log`'a veli başına bir satır yazılır (okundu_mu alıcıya özel olduğu için). **Kritik dış kısıt:** Expo Go SDK 53'ten beri gerçek push alamıyor; cihazda test için EAS development build (Firebase FCM V1 + EAS hesabı, kullanıcının kendisinin yapması gereken harici adımlar) gerekiyor — bu proje henüz hiç EAS build çalıştırmadı. iOS (APNs) kapsam dışı, Faz 1.5'te.
- **Veli girişi: TCKN + 4 haneli PIN (2026-09-28).** Veliler düşük teknoloji okuryazarlığına sahip; e-posta+şifre (davet linki dahil) ve SMS OTP ikisi de fazla adım gerektiriyor. TCKN tek başına yeterli değildir — gizli sayılmaz (yoklama kağıdı, sınıf listesi vb. yerlerde görünür); PIN eklenince TCKN yalnızca "kullanıcı adı" gibi davranır. Yeni öğrenciye TCKN atanınca PIN otomatik `1234` olur, veli kendi PIN'ini değiştirebilir, unutursa kurum admini/süper admin sıfırlayıp tekrar `1234` yapabilir (öğretmenin bu yetkisi yok). Kabul edilen sonuç: TCKN öğrenciye ait olduğu için "bir öğrencinin birden fazla velisi" ayrımı bu giriş yönteminde pratik olarak kalkıyor — aynı TCKN+PIN'i bilen herkes aynı "veli" görünümüne girer. `veli_ogrenci` çoka-çok tablosu ve RLS mimarisi **değişmedi**; bu yalnızca giriş deneyimini değiştiriyor, veri modelini değil. TCKN yalnızca ilk atamada yazılır (MVP sınırı) — sonradan değiştirilemez, yalnızca PIN sıfırlanabilir. Teknik olarak Supabase Auth email+şifre mekanizması arkada aynen kullanılıyor (`email = {tckn}@veli.ogrencitakip.internal`, `password = PIN`).