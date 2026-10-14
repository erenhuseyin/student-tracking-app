# Yapılacaklar

> Sıradaki işler ve geliştirme önerileri. Bir iş bitince buradan silinir ve `docs/ILERLEME.md > Tamamlananlar`'a yazılır. Sıra önceliktir; kullanıcı sırayı değiştirebilir. Son güncelleme: 2026-10-14.

## A. Bekleyen (kullanıcıda)

1. **Telefonda doğrulama + yeni development build.** Son haftalarda yazılanların hiçbiri gerçek cihazda görülmedi: veli girişi artık kullanıcı adıyla (harf klavyesi, PIN ekranı), Manrope yazı tipi, karanlık tema, alt sekmeler, yeni yoklama ekranı, yoklama tamamlanınca giden bildirim (3 adımlı kontrol: bir öğrenci işaretsizken bildirim gitmemeli → son öğrenciyle herkese gitmeli → düzeltmede yalnızca o veliye), yeni logo/ikon/açılış ekranı. *Kullanıcı: "akşam hallederiz" (2026-10-13).*
2. **`redesign/defter` dalını `main`'e birleştirmek** (telefon kontrolünden sonra).
3. **Web'de gözle tur**: yeni web düzeni, logo ve palet; beğenilmeyen ekranlar buraya eklenir.
4. **Canlıda denenecekler (2026-10-14; kullanıcı adı ve müşteri istekleri canlıya alındı):** `npx expo start --clear`; eski veli hesaplarına öğrenci ekranından "PIN'i sıfırla", veli kullanıcı adı + 1234 ile giriş ve zorunlu PIN değişimi; yeni öğrenci eklenince veli girişinin kendiliğinden açılması; takvime etkinlik ekleme (personele bildirim, velide yalnızca takvim); program ekranı; cinsiyet alanları ve panodaki satır; öğrenci ve hoca detay ekranları.
5. **Bizdeki kademe-ders takibinin test edilmesi** (kullanıcı: "bizdeki kısmını test edelim, sonra oradaki özellikleri ekleriz"); ardından B7. **Yerelde test edildi (2026-10-14, görünmez Chrome + REST, 38 kontrol):** tanımlar, sınıfa atama, hoca/yönetici işaretlemesi, hoca detayı ve panoda sayı, il yöneticisinde salt okunurluk, başka hocanın erişememesi, ders/kademe silmede kayıtların gitmesi çalışıyor. Bulunan iki küçük kusur düzeltildi (yerelde 13/13): (1) toplu eklemede derste/listede aynı adla bulunan konu ve ezber maddesi atlanır (büyük/küçük harf ve boşluk farkı aynı sayılır; kademeye özel madde ortak listeyle de karşılaştırılır; bildirim "1 konu eklendi, 4 zaten vardı"); (2) kademe ekranı adresle açılmışsa silmeden sonra Kademeler ekranına geçilir. Canlıda gözle bakılması kullanıcıda.

## B. Kararı verilmiş, sırası gelen işler (kullanıcı kararları, 2026-10-13)

Her biri çok dosyalı; başlamadan önce plan mode.

1. **Hocaya da `ad.soyad` kullanıcı adı.** Hoca hesabı e-posta davetiyle açılmaya devam eder; ayrıca kullanıcı adı atanır (girişte e-posta yerine kullanılabilir). Öğrencideki üretim kuralı (`gizli.kullanici_adi_tabani`) yeniden kullanılır; personel girişinin de veli girişi gibi sunucudan geçmesi gerekir (deneme sınırı). Öğrenci ve personel adları aynı havuzdan mı verilecek, planda sorulacak.
2. **Hoca kendi halkasını (sınıfını) ve öğrencisini açabilsin.** Bugün yalnızca yönetici açıyor. Öğretmene kendi biriminde sınıf açma (kendisi atanmış olarak) ve kendi sınıfına öğrenci ekleme yetkisi: RLS politikaları + testler, öğretmen ekranlarında "Yeni sınıf" / "Yeni öğrenci". Başvuruyla öğrenci kaydı da açık kalır. Hocanın eklediği öğrenciye de veli girişi açılmalı (`veli-hesap-olustur` bugün yalnızca yöneticiye açık). Açık noktalar: hoca sınıfı/öğrenciyi silebilir ya da pasife alabilir mi, müşteri bazında kapatılabilir mi.
3. **Terimler markaya göre değişsin** (Hoca / Halka / Kademe …). Seviye adları zaten markadan geliyor; rol ve sınıf adları da `marka.json`'dan gelecek. **Sonraki adım (ileride):** ekran bazlı metin katmanı — hem çoklu dil hem de müşterinin ekran başlıklarını ve yazılarını kendisinin değiştirebilmesi için. Bu yüzden 3. madde, sabit metinleri tek bir sözlüğe toplayacak şekilde yapılmalı.
4. **`genchareket` markasının ayrı uygulama olarak açılması.** Logo ve palet şimdilik `varsayilan` markasına uygulandı. Ayrı marka için: `markalar/genchareket/` (paket `com.ergenecode.genchareket`), EAS projesi, Firebase Android uygulaması + `google-services.json`, veritabanında kök kurumun marka kodu, ezber tohumunun o kurum için çalıştırılması. Mağaza ikonu için **yüksek çözünürlüklü ya da vektör logo** gerekiyor (eldeki 400×149 px). GH KÂŞİF'te büyük logolar var: `~/Desktop/uygulamam/public/brand/` (yatay 1672×941, rozet ve ikon 1254×1254, beyaz sürüm) — kullanılabilirliği kullanıcıya sorulmalı.
5. **KVKK ve mağaza hazırlığı**, ardından EAS build + Play Console iç test: aydınlatma metni, açık rıza (başvuru formu dahil), gizlilik politikası, veri silme yolu, demo hesap.
6. **Görev ve rol tek sistemde mi olmalı?** (kullanıcı, 2026-10-14: "görev ve rol olarak iki farklı sistem yapmışsın, bu biraz anlamsız olabilir; planlama yapacağız, not al"). Bugün: rol sabit ve veri yetkisini belirler (RLS), görev temel role bağlı bir unvan + menü görünürlüğüdür. Planlamada konuşulacaklar: görevlerin "rol" olarak görünmesi (Roller ve Menü Yetkileri ekranlarının birleşmesi), sabit rollerin arayüzde görev gibi yönetilmesi, ya da gerçek rol başına veri yetkisi (tüm RLS'in yetki tablosuna göre yeniden yazılması — 2026-10-08 ve 2026-10-12'de reddedilmişti).
7. **Kademe-ders takibinde GH KÂŞİF'ten eksikler** (müşteri isteği, 2026-10-14; A5'ten sonra): konu işlenme tarihini değiştirme ve konuya not; hazır Kademe I-III ders/konu tohumu (`~/Desktop/uygulamam/prisma/kademe*-topics.mjs`); ders ekranında Ezber kartı (madde başına "tamamlayan X/Y öğrenci"); yönetici **ders raporu** (halka × hoca × kademe: tamamlanan/kalan konu, ilerleme; hoca/halka/kademe/birim süzgeci, CSV); hocanın sınıf açarken kademe seçmesi (B2 ile birlikte).

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

**Müşteri istekleri turundan kalanlar (2026-10-14)**
18. Etkinlik hatırlatması (etkinlik günü sabah; zamanlanmış iş — `pg_cron` ya da harici tetikleyici).
19. Başvuru formunda cinsiyet (`basvuru` fonksiyonu + tablo).
20. Etkinliğe katılım yanıtı / okundu (C12 ile aynı iş).

**Altyapı**
14. Supabase CLI bağlantısı (`supabase link`, migration geçmişi, `gen types`): migration ve fonksiyonlar elle kopyalanıyor, tipler elle yazılıyor.
15. Hata ve çökme izleme.
16. Otomatik test ve CI (RLS testleri elle çalışıyor; uygulama kodunun testi yok).
17. Rota adlarının rol başına ayrılması: sayfa yenileme sorunu ilk yüklemede adresi rol grubuna sabitleyerek çözüldü (`lib/menu.ts > rolYolu`); kalıcı çözüm aynı adresin tek grupta olmasıdır.
