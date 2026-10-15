# Proje: Öğrenci Gelişim Takip Uygulaması

Multi-tenant, cross-platform (Android + iOS + web) bir eğitim uygulaması. Öğretmenler öğrenci gelişimini kaydeder, veliler takip eder. Ürün birden çok müşteriye satılır: her müşterinin alt birimleri (bölge, ilçe, semt ya da şube) olabilir ve her müşteri kendi adı/ikonu/rengiyle ayrı bir uygulamaya (white-label) sahiptir — hepsi tek kod tabanı ve tek Supabase projesinden.

Detaylı ürün spesifikasyonu (veri modeli, roller, fazlar, KVKK notları) için: @docs/proje-spesifikasyonu.md
Güncel ilerleme durumu ve önceki oturumlardan alınan kararlar için: @docs/ILERLEME.md

## Tech Stack

- **Frontend:** Expo (React Native) + Expo Router — tek kod tabanı, iOS/Android/web
- **Backend:** Supabase (Postgres + Auth + Storage + Row Level Security + Edge Functions)
- **Push Notification:** Expo Notifications + Expo Push API
- **Build/Dağıtım:** EAS Build + EAS Submit

## Kesin Kurallar

- **Multi-tenant izolasyon:** Her tabloda `kurum_id` zorunlu. Yeni bir tablo eklerken RLS politikası olmadan tabloyu kapatma — bir kurumun verisi başka kuruma asla sızmamalı.
- **Kurum hiyerarşisi:** kök kurum (= müşteri) altında en fazla 4 seviyeli ağaç (ör. Genel Merkez → Bölge → İlçe → Semt; `kurum.ust_kurum_id`, türetilmiş `kok_kurum_id` / `seviye` / `yol`). Yönetici (`kurum_admin`) bağlı olduğu düğümü ve altındaki tüm düğümleri yönetir; üstünü ve yanını göremez. Roller sabittir, seviye için yeni rol açma. Kurum admini için politika yazarken `kurum_id = mevcut_kurum_id()` yazma; `kurum_id in (select gizli.yonetilen_kurum_idleri())` kullan. Üst düğümden alta inen içerik (duyuru) için `gizli.ust_kurum_idleri()`. Müşteri düzeyi tanımlar (kategori, kademe, kapalı bölüm) yalnızca kökte durur. Seviye adları markadan gelir (`lib/seviye.ts`); ekrana sabit "şube" yazma.
- **Marka (white-label):** müşteriye özel her şey (ad, paket, renk, ikon, Firebase dosyası) `markalar/<kod>/` altındadır; ekranlara sabit marka adı ya da renk kodu yazma — `lib/marka.ts` ve `lib/tema.ts`'ten al. Müşteriye özel özellik `useOzellik` bayrağının (`kurum.ozellikler`, yalnızca süper admin yazar) arkasına yazılır; kod tabanı müşteri için çatallanmaz. Yeni müşteri uygulaması: @docs/yeni-marka.md
- **Roller:** süper admin, kurum admini, öğretmen, veli. Yeni bir ekran/endpoint eklerken hangi rollerin erişebileceğini açıkça belirt. Arayüzde tek "rol" kavramı vardır: sabit **sistem rolleri** (Yönetici, Öğretmen, Veli) ve müşterinin **tanımlı rolleri** (ör. İstişare üyesi; veride `gorev` tablosu, `lib/roller.ts`). Tanımlı rol bir sistem rolüne dayanır ve yalnızca unvan + menü görünürlüğüdür. Veri yetkisini tanımlı role bağlama; RLS yalnızca sistem rolüne ve kurum ağacına bakar. Ekranlarda "görev" kelimesi kullanılmaz.
- **Pano = toplamlar için bilinçli istisna:** satır düzeyinde yönetici yalnızca kendi düğümünü ve altını görür, ama pano (`pano_ozeti`, `pano_iller`) her yöneticiye müşterinin TAMAMININ toplamlarını, öğretmene kendi biriminin toplamlarını verir. Bu fonksiyonlar `security definer`'dır, yetkiyi kendi içinde denetler ve yalnızca sayı ile birim adı döndürür. Panoya alan eklerken öğrenci, veli ya da sınıf adı döndürme; kapsam dışı birimin satırlarına bağlantı verme.
- **Web ve mobil ayrı düzenlerdir:** tarayıcıda kenar çubuğu + tablo + dar form (`'web'`), native'de ve dar tarayıcıda alt sekme + kart (`'mobil'`). Karar `lib/tema.ts > useDuzen` / `tema.duzen`'dedir; ekranlarda `Platform.OS` ya da pencere genişliğiyle düzen seçme. Yeni liste `Liste`'ye `sutunlar` verir, detay ekranının eylemleri `EylemCubugu`'na konur, yeni bölüm `lib/menu.ts`'e eklenir (kenar çubuğu ve Menü ekranı oradan beslenir).
- **Yönetim listeleri:** yöneticinin sorguladığı/güncellediği listeler `components/VeriEkrani` ile yazılır (geniş ekranda tablo + sağ panel, telefonda kart + tam ekran panel); süzme, sıralama ve sayfalama sunucuda yapılır. Form bileşenleri hem panelde hem kendi rota ekranında kullanılabilsin diye `onDegisti` / `onSilindi` geri çağrısı alır.
- **Veli-öğrenci ilişkisi çoka çoktur.** Tek taraflı foreign key varsayma.
- **Öğrenci fotoğrafları** private storage'da tutulur, public URL kullanma — signed URL üret.
- Yeni bağımlılık eklemeden önce Expo'nun kendi ekosisteminde (Expo SDK içinde) karşılığı var mı kontrol et; yoksa ekle.

## Kod Standartları

- TypeScript strict mode
- Dosya/klasör adlandırması: Türkçe alan adları kullanılıyor (`ogrenci`, `veli`, `yoklama` gibi) — tutarlılığı koru, karışık dil kullanma
- Component başına tek dosya, iş mantığını `lib/` altında ayrı tut

## Sık Kullanılan Komutlar

```
npx expo start              # dev server (varsayilan markası)
MARKA=<kod> npx expo start --clear   # başka markayla çalıştır (--clear şart)
eas build --platform android --profile preview   # test build
eas build --platform android --profile production
eas submit --platform android
```

## Çalışma Şekli

- Büyük/çok dosyalı işlerden önce **plan mode**'da önce plan sun, onay bekle
- Her oturum sonunda `docs/ILERLEME.md`'yi güncelle: güncel durum, hâlâ geçerli teknik kararlar, açık sorunlar ve sorular. Kısa tut — biten işin ayrıntısı commit mesajına gider; eski tam metin `docs/arsiv/`'dedir
- Küçük ve anlamlı commit'ler at — bir özellik bitince commit, hepsi bitince değil