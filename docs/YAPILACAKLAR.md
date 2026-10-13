# Yapılacaklar

> Sıradaki işler ve geliştirme önerileri. Bir iş bitince buradan silinir ve `docs/ILERLEME.md > Tamamlananlar`'a yazılır. Sıra önceliktir; kullanıcı sırayı değiştirebilir. Son güncelleme: 2026-10-13.

## A. Bekleyen (kullanıcıda)

1. **Telefonda doğrulama + yeni development build.** Son haftalarda yazılanların hiçbiri gerçek cihazda görülmedi: veli girişi artık kullanıcı adıyla (harf klavyesi, PIN ekranı), Manrope yazı tipi, karanlık tema, alt sekmeler, yeni yoklama ekranı, yoklama tamamlanınca giden bildirim (3 adımlı kontrol: bir öğrenci işaretsizken bildirim gitmemeli → son öğrenciyle herkese gitmeli → düzeltmede yalnızca o veliye), yeni logo/ikon/açılış ekranı. *Kullanıcı: "akşam hallederiz" (2026-10-13).*
2. **`redesign/defter` dalını `main`'e birleştirmek** (telefon kontrolünden sonra).
0. **Canlıya alma — kullanıcı adı (2026-10-13):** migration `20261021120000_kullanici_adi.sql` (TCKN kolonlarını siler, geri dönüşü yok) → `rls.test.sql` → fonksiyonlar: yeni `veli-hesap-olustur`; güncellenen `veli-giris`, `veli-kardes-ekle`, `veli-pin-degistir`, `basvuru`; Dashboard'dan silinecek `tckn-hesap-olustur` ve `veli-pin-sifirla` → eski veli hesapları için öğrenci ekranından "PIN'i sıfırla" → `npx expo start --clear`. Migration ile fonksiyonlar arasında veli girişi çalışmaz.
3. **Web'de gözle tur**: yeni web düzeni, logo ve palet; beğenilmeyen ekranlar buraya eklenir.

## B. Kararı verilmiş, sırası gelen işler (kullanıcı kararları, 2026-10-13)

Her biri çok dosyalı; başlamadan önce plan mode.

1. **Hocaya da `ad.soyad` kullanıcı adı.** Hoca hesabı e-posta davetiyle açılmaya devam eder; ayrıca kullanıcı adı atanır (girişte e-posta yerine kullanılabilir). Öğrencideki üretim kuralı (`gizli.kullanici_adi_tabani`) yeniden kullanılır; personel girişinin de veli girişi gibi sunucudan geçmesi gerekir (deneme sınırı). Öğrenci ve personel adları aynı havuzdan mı verilecek, planda sorulacak.
2. **Hoca kendi halkasını (sınıfını) ve öğrencisini açabilsin.** Bugün yalnızca yönetici açıyor. Öğretmene kendi biriminde sınıf açma (kendisi atanmış olarak) ve kendi sınıfına öğrenci ekleme yetkisi: RLS politikaları + testler, öğretmen ekranlarında "Yeni sınıf" / "Yeni öğrenci". Başvuruyla öğrenci kaydı da açık kalır. Hocanın eklediği öğrenciye de veli girişi açılmalı (`veli-hesap-olustur` bugün yalnızca yöneticiye açık). Açık noktalar: hoca sınıfı/öğrenciyi silebilir ya da pasife alabilir mi, müşteri bazında kapatılabilir mi.
3. **Terimler markaya göre değişsin** (Hoca / Halka / Kademe …). Seviye adları zaten markadan geliyor; rol ve sınıf adları da `marka.json`'dan gelecek. **Sonraki adım (ileride):** ekran bazlı metin katmanı — hem çoklu dil hem de müşterinin ekran başlıklarını ve yazılarını kendisinin değiştirebilmesi için. Bu yüzden 3. madde, sabit metinleri tek bir sözlüğe toplayacak şekilde yapılmalı.
4. **`genchareket` markasının ayrı uygulama olarak açılması.** Logo ve palet şimdilik `varsayilan` markasına uygulandı. Ayrı marka için: `markalar/genchareket/` (paket `com.ergenecode.genchareket`), EAS projesi, Firebase Android uygulaması + `google-services.json`, veritabanında kök kurumun marka kodu, ezber tohumunun o kurum için çalıştırılması. Mağaza ikonu için **yüksek çözünürlüklü ya da vektör logo** gerekiyor (eldeki 400×149 px).
5. **KVKK ve mağaza hazırlığı**, ardından EAS build + Play Console iç test: aydınlatma metni, açık rıza (başvuru formu dahil), gizlilik politikası, veri silme yolu, demo hesap.

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
11a. Veli girişi açılmamış mevcut öğrenciler için toplu "veli girişlerini aç" (bugün öğrenci ekranından tek tek); kullanıcı adlarını velilere dağıtmak için yazdırılabilir liste.
11b. Rastgele başlangıç PIN'i (bugün herkes 1234 ile başlıyor; kullanıcı adı tahmin edilebildiği için ilk girişe kadar hesap açık).
11. Dönem gelişim raporu (PDF) ve gelişim kaydına fotoğraf (ikisi de yeni build ister; aynı build'e alınabilir).
12. Duyuruda okundu ve katılım yanıtı.
13. Kardeşi hesaptan çıkarma.

**Altyapı**
14. Supabase CLI bağlantısı (`supabase link`, migration geçmişi, `gen types`): migration ve fonksiyonlar elle kopyalanıyor, tipler elle yazılıyor.
15. Hata ve çökme izleme.
16. Otomatik test ve CI (RLS testleri elle çalışıyor; uygulama kodunun testi yok).
17. Rota adlarının rol başına ayrılması: sayfa yenileme sorunu ilk yüklemede adresi rol grubuna sabitleyerek çözüldü (`lib/menu.ts > rolYolu`); kalıcı çözüm aynı adresin tek grupta olmasıdır.
