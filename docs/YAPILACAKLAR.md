# Yapılacaklar

> Sıradaki işler ve geliştirme önerileri. Bir iş bitince buradan silinir ve `docs/ILERLEME.md > Tamamlananlar`'a yazılır. Sıra önceliktir; kullanıcı sırayı değiştirebilir. Son güncelleme: 2026-10-13.

## A. Bekleyen (kullanıcıda)

1. **Telefonda doğrulama + yeni development build.** Son haftalarda yazılanların hiçbiri gerçek cihazda görülmedi: Manrope yazı tipi, karanlık tema, alt sekmeler, yeni yoklama ekranı, yoklama tamamlanınca giden bildirim (3 adımlı kontrol: bir öğrenci işaretsizken bildirim gitmemeli → son öğrenciyle herkese gitmeli → düzeltmede yalnızca o veliye), yeni logo/ikon/açılış ekranı. *Kullanıcı: "akşam hallederiz" (2026-10-13).*
2. **`redesign/defter` dalını `main`'e birleştirmek** (telefon kontrolünden sonra).
3. **Web'de gözle tur**: yeni web düzeni, logo ve palet; beğenilmeyen ekranlar buraya eklenir.

## B. Kararı verilmiş, sırası gelen işler (kullanıcı kararları, 2026-10-13)

Her biri çok dosyalı; başlamadan önce plan mode.

1. **TCKN'nin kaldırılması; ad.soyad kullanıcı adı.** Bilgi güvenliği gereği öğrencinin TC kimlik numarası tutulmayacak. Veli girişi için kullanıcı adı öğrencinin adından otomatik üretilir: `ad.soyad`; aynısı varsa `ad.soyad1`, `ad.soyad2`… **Şifre kuralları aynı kalır** (4 haneli PIN, başlangıç PIN'i, ilk girişte zorunlu değişim, 5 yanlışta kilit, yönetici sıfırlar). Etkilenenler: `ogrenci.tckn` kolonu ve müşteri başına tekillik, veli e-postası (`{tckn}@{marka}.veli.internal`), `veli-giris` / `tckn-hesap-olustur` / `veli-pin-sifirla` / `veli-kardes-ekle` / `basvuru` fonksiyonları, toplu öğrenci ekleme, başvuru formu, öğrenci formu, raporlar, RLS testleri. Açık noktalar (planda sorulacak): Türkçe harflerin çevrimi (`ş→s`), kullanıcı adının müşteri başına mı tekil olacağı, mevcut TCKN'li hesapların taşınması, kullanıcı adının veliye nasıl iletileceği, ad değişince kullanıcı adının değişip değişmeyeceği.
2. **Hocaya da `ad.soyad` kullanıcı adı.** Hoca hesabı e-posta davetiyle açılmaya devam eder; ayrıca kullanıcı adı atanır (girişte e-posta yerine kullanılabilir). 1. maddeyle aynı üretim kuralı ve aynı planda.
3. **Hoca kendi halkasını (sınıfını) ve öğrencisini açabilsin.** Bugün yalnızca yönetici açıyor. Öğretmene kendi biriminde sınıf açma (kendisi atanmış olarak) ve kendi sınıfına öğrenci ekleme yetkisi: RLS politikaları + testler, öğretmen ekranlarında "Yeni sınıf" / "Yeni öğrenci". Başvuruyla öğrenci kaydı da açık kalır. Açık noktalar: hoca sınıfı/öğrenciyi silebilir ya da pasife alabilir mi, müşteri bazında kapatılabilir mi.
4. **Terimler markaya göre değişsin** (Hoca / Halka / Kademe …). Seviye adları zaten markadan geliyor; rol ve sınıf adları da `marka.json`'dan gelecek. **Sonraki adım (ileride):** ekran bazlı metin katmanı — hem çoklu dil hem de müşterinin ekran başlıklarını ve yazılarını kendisinin değiştirebilmesi için. Bu yüzden 4. madde, sabit metinleri tek bir sözlüğe toplayacak şekilde yapılmalı.
5. **`genchareket` markasının ayrı uygulama olarak açılması.** Logo ve palet şimdilik `varsayilan` markasına uygulandı. Ayrı marka için: `markalar/genchareket/` (paket `com.ergenecode.genchareket`), EAS projesi, Firebase Android uygulaması + `google-services.json`, veritabanında kök kurumun marka kodu, ezber tohumunun o kurum için çalıştırılması. Mağaza ikonu için **yüksek çözünürlüklü ya da vektör logo** gerekiyor (eldeki 400×149 px).
6. **KVKK ve mağaza hazırlığı**, ardından EAS build + Play Console iç test: aydınlatma metni, açık rıza (başvuru formu dahil), gizlilik politikası, veri silme yolu, demo hesap.

## C. Geliştirme önerileri (Claude'un önerileri; kullanıcı "çoğu güzel" dedi, tek tek onaylanmadı)

**Yoklama ve ezber**
1. Yoklamada işareti geri alma ("işaretlenmedi"ye dönme; öğretmene silme yetkisi — küçük migration).
2. Yoklama ekranında gün okları (‹ ›): dünün yoklamasına haftalık tabloya gitmeden geçme.
3. Yarım kalan yoklama hatırlatması: bildirim yoklama tamamlanınca gittiği için yarım bırakılan günde veliler hiç bildirim almıyor; akşam öğretmene hatırlatma.
4. Ezber maddesini düzenleme (ad, sıra, grup); bugün silip yeniden eklemek gerekiyor ve silmek öğrenci kayıtlarını da siliyor.
5. Ezber raporu ve pano: sure bazında "sınıfın kaçı tamamladı", panoda ezber ilerlemesi.

**Yönetici**
6. Birimler arası taşıma: öğrenci, personel ve birim.
7. Özet sayılarının sunucuda toplanması (büyük ağaçta 1000 satır sınırı).
8. Web'de klavye kullanımı: `Enter` ile form gönderme, sekme sırası.
9. Panodan dışa aktarma ve özel tarih aralığı; haritada ilçe düzeyi.
10. Web'de form sonunda sağa hizalı eylem satırı, detay ekranlarında iki sütun (2026-10-13 planından kalanlar).

**Veli**
11. Dönem gelişim raporu (PDF) ve gelişim kaydına fotoğraf (ikisi de yeni build ister; aynı build'e alınabilir).
12. Duyuruda okundu ve katılım yanıtı.
13. Kardeşi hesaptan çıkarma.

**Altyapı**
14. Supabase CLI bağlantısı (`supabase link`, migration geçmişi, `gen types`): migration ve fonksiyonlar elle kopyalanıyor, tipler elle yazılıyor.
15. Hata ve çökme izleme.
16. Otomatik test ve CI (RLS testleri elle çalışıyor; uygulama kodunun testi yok).
17. Rota adlarının rol başına ayrılması: sayfa yenileme sorunu ilk yüklemede adresi rol grubuna sabitleyerek çözüldü (`lib/menu.ts > rolYolu`); kalıcı çözüm aynı adresin tek grupta olmasıdır.
