# Yeni müşteri uygulaması (marka) açma

Her müşteri Google Play'de kendi adı, ikonu ve rengiyle ayrı bir uygulamaya sahiptir; hepsi aynı kod tabanından ve aynı Supabase projesinden çıkar. Bir marka, `markalar/<kod>/` klasörü + veritabanında aynı `marka_kodu`'na sahip bir kök kurumdur.

`<kod>`: küçük harf, rakam ve tire (`^[a-z][a-z0-9-]{1,30}$`), örn. `ugur`. **Atandıktan sonra değiştirilemez** — veli giriş e-postaları (`{tckn}@{kod}.veli.internal`) buna bağlıdır.

## 1. Marka klasörü

`markalar/varsayilan/` klasörünü `markalar/<kod>/` olarak kopyala ve `marka.json`'ı düzenle:

| Alan | Açıklama |
|---|---|
| `kod` | Klasör adıyla aynı |
| `ad` | Uygulama içinde (giriş ekranı vb.) görünen ad |
| `uygulamaAdi` | Telefonda ikonun altında görünen ad |
| `slug` | Expo proje adı, EAS hesabında tekil |
| `scheme` | Derin bağlantı şeması, cihazda tekil |
| `androidPackage` | Play Store uygulama kimliği, **yayından sonra değiştirilemez** |
| `easProjectId` | 2. adımda dolar |
| `renkler.ana` | Marka rengi (butonlar, splash, bildirim ikonu) |
| `renkler.ikonArkaplan` | Android uyarlanabilir ikon arka planı |

Görseller isteğe bağlıdır; klasöre konmayan görsel için `assets/images/` altındaki ortak görsel kullanılır: `icon.png`, `android-icon-foreground.png`, `android-icon-background.png`, `android-icon-monochrome.png`, `splash-icon.png`, `favicon.png`.

## 2. EAS projesi

Her marka ayrı bir EAS projesidir, hepsi `ergenecode` hesabında durur (tek `EXPO_ACCESS_TOKEN` hepsine push gönderebilsin diye).

```
MARKA=<kod> npx eas-cli init --account ergenecode --non-interactive
```

Yapılandırma dinamik (`app.config.ts`) olduğu için komut proje kimliğini dosyaya yazamaz; çıktıdaki ID'yi `marka.json > easProjectId`'ye elle yaz.

## 3. Firebase (push)

1. Mevcut Firebase projesine (`student-tracking-app-44`) yeni bir Android uygulaması ekle; paket adı `marka.json > androidPackage` ile birebir aynı olmalı.
2. O uygulamanın `google-services.json` dosyasını `markalar/<kod>/google-services.json` olarak kaydet.
3. Service account anahtarını bu EAS projesine de ata: `MARKA=<kod> npx eas-cli credentials -p android` → Google Service Account → Upload → Push Notifications (FCM V1).

İki dosya da gereklidir: service account anahtarı sunucunun push göndermesi, `google-services.json` cihazın token alması içindir.

## 4. Build profilleri

`eas.json`'a marka için profiller ekle:

```json
"<kod>-preview": { "extends": "preview", "env": { "MARKA": "<kod>" } },
"<kod>-production": { "extends": "production", "env": { "MARKA": "<kod>" } }
```

## 5. Veritabanı

Süper admin olarak uygulamadan yeni kurum eklerken marka kodunu gir (kök kurum = müşteri). Şubeleri müşterinin kendi yöneticisi açar. Müşteriye özel özellikler kök kurumun `ozellikler` kolonundan açılır (yalnızca süper admin).

## 6. Derle ve doğrula

```
MARKA=<kod> npx expo config --type public        # ad, paket, proje kimliği doğru mu
MARKA=<kod> npx expo start --clear                # yerelde bu markayla çalıştır
npx eas-cli build --platform android --profile <kod>-production
```

Marka değiştirirken `--clear` şart: web'de yapılandırma paketin içine gömülür ve Metro önbelleği eski markayı (ya da "Marka yapılandırması bulunamadı" hatasını) döndürür.

Kontrol: giriş ekranında marka adı görünüyor, başka müşterinin hesabı "Bu hesap bu uygulamaya ait değil" ekranına düşüyor, veli TCKN + PIN ile girebiliyor, yoklama bildirimi cihaza ulaşıyor.
