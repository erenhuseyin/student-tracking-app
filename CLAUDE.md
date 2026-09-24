# Proje: Öğrenci Gelişim Takip Uygulaması

Multi-tenant, cross-platform (Android + iOS + web) bir eğitim uygulaması. Öğretmenler öğrenci gelişimini kaydeder, veliler takip eder.

Detaylı ürün spesifikasyonu (veri modeli, roller, fazlar, KVKK notları) için: @docs/proje-spesifikasyonu.md
Güncel ilerleme durumu ve önceki oturumlardan alınan kararlar için: @docs/ILERLEME.md

## Tech Stack

- **Frontend:** Expo (React Native) + Expo Router — tek kod tabanı, iOS/Android/web
- **Backend:** Supabase (Postgres + Auth + Storage + Row Level Security + Edge Functions)
- **Push Notification:** Expo Notifications + Expo Push API
- **Build/Dağıtım:** EAS Build + EAS Submit

## Kesin Kurallar

- **Multi-tenant izolasyon:** Her tabloda `kurum_id` zorunlu. Yeni bir tablo eklerken RLS politikası olmadan tabloyu kapatma — bir kurumun verisi başka kuruma asla sızmamalı.
- **Roller:** süper admin, kurum admini, öğretmen, veli. Yeni bir ekran/endpoint eklerken hangi rollerin erişebileceğini açıkça belirt.
- **Veli-öğrenci ilişkisi çoka çoktur.** Tek taraflı foreign key varsayma.
- **Öğrenci fotoğrafları** private storage'da tutulur, public URL kullanma — signed URL üret.
- Yeni bağımlılık eklemeden önce Expo'nun kendi ekosisteminde (Expo SDK içinde) karşılığı var mı kontrol et; yoksa ekle.

## Kod Standartları

- TypeScript strict mode
- Dosya/klasör adlandırması: Türkçe alan adları kullanılıyor (`ogrenci`, `veli`, `yoklama` gibi) — tutarlılığı koru, karışık dil kullanma
- Component başına tek dosya, iş mantığını `lib/` altında ayrı tut

## Sık Kullanılan Komutlar

```
npx expo start              # dev server
eas build --platform android --profile preview   # test build
eas build --platform android --profile production
eas submit --platform android
```

## Çalışma Şekli

- Büyük/çok dosyalı işlerden önce **plan mode**'da önce plan sun, onay bekle
- Her oturum sonunda `docs/ILERLEME.md`'yi güncelle: tamamlanan adımlar, alınan teknik kararlar, yarım kalanlar, açık sorular
- Küçük ve anlamlı commit'ler at — bir özellik bitince commit, hepsi bitince değil