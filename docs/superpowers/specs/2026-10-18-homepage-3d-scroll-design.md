# Ana sayfa: kaydırmayla oluşan 3D yazıcı deneyimi ve açık/koyu tema

**Tarih:** 18 Ekim 2026
**Durum:** Taslak, onay bekliyor

## 1. Amaç ve neden

3D Care ana sayfasını, ziyaretçinin (ortak kurum temsilcileri, bakım merkezi çalışanları, Erasmus+ değerlendiricileri) aklında **kaydırma deneyimiyle** kalacak bir sahneye dönüştürmek. Referans siteler [Oryzo](https://oryzo.ai/) ve [iyO One](https://www.iyo.ai/iyo-one). Bu sitelerden alınacak iki his:

- **Modelin doğal duruşu:** Nesne sahnede tek başına, sakin durur. Işık malzemesini ortaya çıkarır, kaydırma onu yavaşça döndürür. Nesne sahneden hiç çıkmaz; bölümler onun etrafında değişir.
- **Modelin oluşumu:** Nesne göz önünde var olur. Oryzo'da teknik çizimden gerçek nesneye, iyO'da parçalara ayrılıp birleşerek.

Bizde kahraman nesne bir **3D yazıcı**. Hikâyenin sonunda bu yazıcı bir yardımcı araç basar ve araç gerçek kullanıma geçer. Böylece projenin mesajı ("herkesin basabileceği yardımcı araçlar") anlatılmadan gösterilmiş olur.

## 2. Hedefler

1. Ana sayfanın en üstünde kaydırmayla ilerleyen, beş sahneli bir 3D hikâye (bölüm 4).
2. Sitenin tamamında açık/koyu tema ve tema geçiş düğmesi (bölüm 6).
3. Sahne her iki temada da çalışır: koyu temada karanlık stüdyo, açık temada aydınlık stüdyo.
4. Performans bütçesine uyulur (bölüm 7). Bu, projenin başarı ölçütüdür.

## 3. Hedef dışı ve kaçınılacaklar

**Hedef dışı:**
- Diğer sayfalarda 3D sahne yok. Bu sayfalar yalnızca yeni temayı alır.
- Ses, müzik, özel imleç ya da sayfa geçiş animasyonları yok.
- Yazıcıyı fare ile serbestçe döndürme yok. Sahne yalnızca kaydırmayla ilerler.

**Kaçınılacaklar (bunlar olursa iş başarısız sayılır):**
- **Optimize olmaması.** Takılan animasyon, geç açılan sayfa, ısınan telefon. Kullanıcı bunu başarısızlığın tek ölçütü olarak söyledi.
- Kaydırmanın kilitlenmesi (scroll-jacking): ziyaretçi sayfa üzerindeki kontrolü kaybetmemeli.
- Hareket hassasiyeti olanları ya da ekran okuyucu kullananları dışarıda bırakmak. Sitede WCAG 2.2 AA sözü verildi.
- Başkasına ait görüntü ya da model kullanmak. Site AB fonlu ve açık lisanslı; sahnedeki her şey projeye ait olmalı.
- Sahnenin içerikle (başlık, projenin ne olduğu) yarışması. 3D yüklenmese bile ziyaretçi projenin ne olduğunu ilk ekranda anlamalı.

## 4. Kaydırma hikâyesi

Sahne, sayfanın üstünde ekranı kaplayan ve kaydırma boyunca sabit kalan (sticky) bir tuval üzerinde çizilir. Metin blokları normal akışta tuvalin üzerinden geçer. Kaydırma ilerlemesi 0'dan 1'e bir zaman çizelgesini sürer; sahneler bu çizelgede ardışıktır. Toplam uzunluk masaüstünde kabaca 5–6 ekran boyu.

| # | Sahne | Görüntü | Metin (örnek, EN/TR) |
|---|---|---|---|
| 1 | **Çizim → nesne** | Yazıcının teknik çizimi beliriyor: ön görünüş, ölçü çizgileri, logodaki eş merkezli katmanları çağrıştıran yaylar. Çizgi rengi teal, vurgu sarı. Kaydırdıkça çizimin içi taranarak doluyor ve gerçek 3D yazıcıya dönüşüyor. | Mevcut başlık: "Assistive tools anyone can print" ve kısa açıklama |
| 2 | **Tanışma** | Yazıcı ortada yalnız kalıyor. Kaydırma onu yaklaşık 120° döndürüyor; yandan gelen ışık metal ve plastik malzemeleri gösteriyor. | "Low-cost printers, already in reach" türünde iki satır |
| 3 | **Parçalanma** | Yazıcı iyO tarzında parçalarına ayrılıyor: gövde, tabla, X kızağı, baskı kafası, filament makarası, ekran. Her parçanın yanında ince bir çizgiyle bağlanan kısa bir etiket beliriyor. | Etiketler: "Heated bed", "Print head" vb. |
| 4 | **Üretim** | Parçalar yerine oturuyor. Baskı kafası hareket ediyor ve tablada bir yardımcı araç katman katman yükseliyor. Katmanlar logodaki gibi renk bandı olarak hafifçe seçilebiliyor. | "Ten tools, tested with the people who use them" |
| 5 | **Kullanım** | Basılan araç tabladan kalkıp kameraya yaklaşıyor ve bir elin içine iniyor. Ardından sahne yumuşakça mevcut ana sayfa içeriğine geçiyor. | "Browse the models" düğmesi |

**Basılan araç:** Sitedeki şablon modellerden **kolay tutulan kupa kulpu** (`easy-grip-mug`). Ana sayfadaki mevcut çizim (PrintFigure) de bu kupayı gösteriyor; hikâye bununla tutarlı.

Hikâyenin ardından ana sayfanın mevcut bölümleri (proje çıktıları, model nasıl yapılır, ortaklar, son haberler, ağ çağrısı) yeni temayla olduğu gibi devam eder.

**Metinler:** EN ve TR, mevcut `src/i18n` sözlüklerinde. Satırlar Oryzo'daki gibi kaydırdıkça griden tam renge doluyor; metnin kendisi her zaman DOM'da, okunabilir ve seçilebilir.

## 5. Görsel yön

**Seçilen ton: "gerçekçi stüdyo" (B).** Yazıcı kodla kurulur ve tamamen projeye aittir. Malzemeler fiziksel tabanlı (PBR): koyu anodize alüminyum profiller, parlak çelik miller, altın tonlu ısıtmalı tabla, mat siyah PEI yüzey, turuncu vurgulu baskı kafası, filament makarası.

| | Koyu tema | Açık tema |
|---|---|---|
| Arka plan | Sıcak koyu (#15120F civarı), kenarlara doğru hafif turuncu ışık sızıntısı | Kâğıt beyazı (`--paper`) ile çok açık gri arası yumuşak geçiş |
| Ana ışık | Yandan ve yukarıdan sıcak spot, belirgin kenar ışığı (Oryzo) | Geniş, yumuşak stüdyo ışığı, zeminde yumuşak gölge |
| Ortam yansıması | Düşük | Orta |
| Teknik çizim | Teal çizgi, koyu zemin | Teal çizgi, açık zemin |

Tema değişince sahne, yeniden yüklenmeden ışık ve arka planı yumuşak bir geçişle değiştirir.

**Detay seviyesi:** Prototipten belirgin şekilde ileri olacak. Pahlı profil kenarları, kayışlar, motorlar, vida başları, fan ızgarası, ekranda basit bir arayüz, filamentin makaradan kafaya giden hattı. Bunların hepsi kodla ve prosedürel dokularla yapılır; harici büyük model ya da doku dosyası yok.

**El:** Sahne 5'teki el, gerçekçi bir insan eli modeli gerektirir ve bu, kodla gerçekçi yapılması en zor parçadır. Yapılacak olan, sahnenin geri kalanıyla aynı malzeme dilinde (örneğin mat, heykelsi) stilize bir el. İnandırıcı olmazsa yedek plan: araç bir kupaya takılmış halde masaya iner. Kullanıcıya iki seçenek ekran görüntüsüyle gösterilip karar aldırılır.

## 6. Açık/koyu tema

- Renkler zaten `globals.css` içinde `:root` değişkenleri olarak tanımlı. Koyu tema bu değişkenlerin koyu karşılıklarını tanımlar. Mevcut marka renkleri korunur; koyu zeminde kontrast için teal ve mor gerekirse açılır, AA kontrastı doğrulanır.
- **Varsayılan:** ziyaretçinin cihaz ayarı (`prefers-color-scheme`).
- **Düğme:** başlıkta, dil düğmesinin yanında. Erişilebilir adı ve basılı durumu var. İki durumlu (açık/koyu); ziyaretçi hiç tıklamadıysa cihaz ayarı geçerli (benim kararım: üç durumlu "sistem/açık/koyu" seçici gereksiz karmaşa).
- **Seçimin hatırlanması:** `localStorage`, okuma ve yazma try/catch içinde. Çerez değil, kişisel veri değil; gizlilik bildiriminde tek cümleyle belirtilir.
- **İlk açılışta tema yanıp sönmemeli:** tema `<head>` içinde, sayfa çizilmeden önce küçük bir satır içi betikle uygulanır.
- AB logosu iki temada da doğru sürümle gösterilir: koyu zeminde negatif, açık zeminde pozitif. Pozitif sürüm resmi kaynaktan indirilir.
- Paylaşım kartları değişmez.

## 7. Performans bütçesi (başarı ölçütü)

| Ölçüt | Hedef |
|---|---|
| İlk anlamlı görüntü (LCP), orta seviye telefon, 4G | < 2,5 sn. Başlık ve açıklama 3D'yi beklemeden görünür |
| Lighthouse Performans (mobil) | ≥ 90 |
| Düzen kayması (CLS) | 0 |
| 3D için ek JavaScript (sıkıştırılmış) | ≤ 200 KB; ilk boyamadan sonra tembel yüklenir |
| Harici model ve doku dosyaları | Yok (geometri ve dokular kodla) |
| Kare hızı, orta seviye dizüstü | 60 fps |
| Kare hızı, orta seviye Android telefon | ≥ 30 fps, takılma yok |

**Yöntemler:**
- Piksel oranı sınırı ve kare hızı düşerse kaliteyi otomatik düşüren uyarlanır kalite.
- Telefonda gölge ve ortam yansıması sadeleşir, geometri detayı azalır.
- Tuval görünür değilken ya da sekme arka plandayken çizim durur.
- Sahne yalnızca kaydırma değişince ya da geçiş sürerken yeniden çizilir; boşta sürekli çizim yok.

## 8. Erişilebilirlik

- **"Hareketi azalt" açıksa:** 3D sahne yüklenmez. Bunun yerine hikâyenin beş anını gösteren sabit kareler gösterilir. Kareler build sırasında aynı sahneden üretilen görseller (WebP), her biri açıklayıcı alternatif metinle.
- **WebGL yoksa ya da yükleme başarısızsa:** aynı sabit kareler gösterilir.
- Tuval ekran okuyuculardan gizlenir (`aria-hidden`). Hikâyenin bilgisi metinlerde zaten var.
- Kaydırma doğal kalır: yumuşatma kütüphanesi ya da kaydırmayı ele geçirme yok. Animasyon kendi içinde yumuşatılır.
- Klavye ile gezinme ve "İçeriğe geç" bağlantısı çalışmaya devam eder.

## 9. Teknik kararlar

- **3D:** Three.js (npm bağımlılığı). Oryzo ve iyO de Three.js r178 kullanıyor.
- **Sahne:** Ana sayfaya özel bir istemci bileşeni. Statik dışa aktarım (`output: export`) ile uyumlu olması için tarayıcıda dinamik içe aktarılır.
- **Yazıcı modeli:** Kodla kurulur. Parçalar ayrı gruplardır ve her birinin parçalanma yönü tanımlıdır (prototipteki yaklaşım).
- **Animasyon:** Kaydırma ilerlemesine bağlı kendi zaman çizelgemiz. GSAP ya da Lenis kullanılmaz; gerekirse bu, gerekçesiyle değerlendirilir.
- **Sabit kareler:** Aynı sahneden tarayıcı ile başsız modda üretilip `public/` altına konur. Paylaşım kartlarında kullanılan yöntemin aynısı. Kareler yerelde üretilip repoya eklenir; GitHub Actions'ta üretilmez (benim kararım: CI'da GPU'suz WebGL güvenilmez).
- **Mevcut kahraman görseli:** Ana sayfadaki düz katman çizimi (`PrintFigure`) 3D sahne gelince ana sayfadan kalkar. Bileşen, sabit kareler hazır olana kadar yedek olarak kalabilir.

## 10. Uygulayıcıya bırakılanlar

- Yazıcının tam parça listesi ve oranları. Klasik "bedslinger" yapısında (Prusa/Ender benzeri) kalır, belirli bir markayı kopyalamaz.
- Sahnelerin zaman çizelgesindeki kesin oranları ve kamera hareketleri.
- Sahne metinlerinin son hali. Örnekler bölüm 4'te; ton mevcut site metinleriyle aynı.
- Koyu temada renk değişkenlerinin kesin değerleri.
- Hangi tarayıcı ve cihazlarda ölçüm yapılacağı. En az bir masaüstü ve Chrome DevTools'un orta seviye mobil profili.

## 11. Teslim aşamaları

1. **Tema:** açık/koyu tema ve düğme. Tek başına yayınlanabilir.
2. **Sahne iskeleti:** sticky tuval, kaydırma çizelgesi, yedek sabit kareler ve performans ölçümü, basit yazıcıyla.
3. **Yazıcı ve ışık:** detaylı model, iki tema için stüdyo ışığı.
4. **Hikâye:** beş sahne, metinler, etiketler, baskı animasyonu, el.
5. **Cila ve ölçüm:** performans bütçesi doğrulaması, erişilebilirlik kontrolü, CHANGELOG.

Her aşama sonunda sitenin çalışır halde kalması ve yayına alınabilmesi gerekir.
