# 3D Care Web Sitesi Planı

**Proje:** 3D Care: Printing a More Inclusive Future (KA220-ADU, 01/09/2026 – 31/10/2028)
**Sorumlu:** Akgün Yaratıcı Fikirler Derneği (ACIA), WP5 / Activity 5.1
**Kararlar:** EN + TR (diğer ortak dillerine genişletilebilir), GitHub Pages, repo `laroca00` hesabında, görsel kimlik sıfırdan.

---

## 1. Başvuruda taahhüt edilenler (sitenin karşılaması gerekenler)

| Taahhüt | Sitedeki karşılığı |
|---|---|
| 10 doğrulanmış 3D modele açık erişim | Model kataloğu + indirilebilir STL/3MF dosyaları |
| Açık kaynak depo (repository) | GitHub reposu, açık lisanslı model dosyaları |
| Kullanım, güvenlik ve ergonomi rehberleri | Her model sayfasında rehber + PDF |
| Online eğitim paketi (WP4) | "Eğitim" bölümü: modüller, videolar, materyaller |
| Transfer paketi (WP5) | Yeni merkezler için indirilebilir paket |
| EPALE / Erasmus+ Results Platform yayını | Sonuçlar sayfasında bağlantılar |
| Web/depo istatistikleriyle izleme | Çerezsiz ziyaretçi istatistiği (rapor için) |
| Proje sonrası sürdürülebilirlik | Ücretsiz, bakım gerektirmeyen statik site |

## 2. Site haritası

```
/                 Ana sayfa: proje özeti, öne çıkan modeller, son haberler
/about            Proje, hedefler, iş paketleri, takvim
/partners         7 ortak (harita + kurum kartları)
/models           10 model kataloğu (filtre: kullanım alanı, zorluk, baskı süresi)
/models/[slug]    Model detay: 3D önizleme, indirme, baskı ayarları, güvenlik notları, test sonuçları
/training         Online eğitim paketi (modüller, videolar, PDF'ler)
/resources        Rehberler, transfer paketi, sürdürülebilirlik planı, raporlar
/news             Haberler / etkinlikler (toplantılar, test döngüleri, Malta eğitimi)
/network          Yerel öğrenme merkezleri ağı + katılım formu
/contact          İletişim
/privacy, /accessibility   Yasal sayfalar
```

Her sayfa `/en/...` ve `/tr/...` altında yayınlanır.

## 3. Teknik yapı

- **Çatı:** Next.js (App Router) + TypeScript, `output: 'export'` ile tamamen statik çıktı alınır.
- **Barındırma:** GitHub Pages, otomatik yayın GitHub Actions ile yapılır (main'e her push'ta build + deploy).
- **İçerik:** Modeller, haberler ve eğitim modülleri repoda Markdown/MDX + JSON olarak tutulur. Teknik bilgisi olmayan ortaklar da GitHub web arayüzünden düzenleyebilir.
- **Çok dillilik:** `[locale]` rotaları + çeviri JSON dosyaları. Yeni dil eklemek tek bir dosya eklemek demek.
- **3D önizleme:** Model sayfasında tarayıcıda döndürülebilir STL görüntüleyici (three.js / react-three-fiber). Sadece o sayfada yüklenir.
- **Model dosyaları:** Repoda `models/` klasöründe tutulur (dosya başı 100 MB sınırı). Büyük paketler GitHub Releases'a konur.
- **İstatistik:** GoatCounter (ücretsiz, çerezsiz, KVKK/GDPR uyumlu). Çerez bandı gerekmez.
- **Formlar:** Ağ katılım ve iletişim formları için statik sitede sunucu yok, bu yüzden form servisi kullanılacak (Formspree ücretsiz katman) ya da sadece e-posta bağlantısı verilecek.
- **Videolar:** Tanıtım ve yaygınlaştırma videoları Remotion ile koddan üretilir (ortak dillerine çevrilmiş altyazılı versiyonlar kolay çıkar). Videolar YouTube'a yüklenir, siteye gömülür.

## 4. Lisanslar

- **Site kodu:** MIT
- **3D modeller ve rehberler:** Karar verilmedi. Modeller hazır olana kadar (WP3) sitede yer tutucu "şablon" modeller gösterilecek; lisans o zamana kadar ortaklarla belirlenecek.
  - **CC BY 4.0:** Herkes kullanabilir, değiştirebilir, satabilir; tek şart kaynak göstermek. Erasmus+'ın açık erişim beklentisine en uygun seçenek.
  - **CC BY-SA 4.0:** Aynısı, ama değiştirilmiş versiyonlar da aynı açık lisansla paylaşılmak zorunda. Böylece kimse modeli alıp kapalı ürüne çeviremez.

## 5. Zorunlu AB görünürlük kuralları

- Her sayfada "Co-funded by the European Union" amblemi (resmi dosyadan, oranları değiştirmeden).
- Footer'da standart sorumluluk reddi metni ("Funded by the European Union. Views and opinions expressed are however those of the author(s) only…") EN ve TR olarak.
- Proje numarası (sözleşme gelince) ve ortak logoları.

## 6. Erişilebilirlik

Proje engelli bireylere yönelik olduğu için site WCAG 2.2 AA hedefleyecek:
- Klavyeyle tam gezinme, yeterli kontrast, ekran okuyucu uyumu
- Videolarda altyazı
- "Kolay okunur" özetler (başvuruda easy-to-read yaklaşımı geçiyor)
- Lighthouse erişilebilirlik puanı ≥ 95 hedefi, Playwright ile otomatik testler

## 7. Görsel kimlik (sıfırdan)

Hazırlanacaklar:
- Logo önerileri (3 alternatif). Fikir: katmanlı 3D baskı çizgileri + el/destek motifi.
- Renk paleti (yüksek kontrastlı, AB mavisiyle çakışmayan)
- Tipografi (Türkçe ve Baltık/Slav karakterlerini, örn. ş, ğ, č, ā, ė, destekleyen açık kaynak font)
- Model kartları için tutarlı fotoğraf/render şablonu

## 8. Aşamalar

| Aşama | Zaman | Çıktı |
|---|---|---|
| 0. Kurulum | Kasım 2026 | GitHub reposu, CI/CD, boş site yayında |
| 1. Kimlik + iskelet | Kasım–Aralık 2026 | Logo, tasarım sistemi, ana sayfa / proje / ortaklar sayfaları |
| 2. Haber + eğitim altyapısı | Ocak–Şubat 2027 | Haberler, kick-off duyurusu, iletişim |
| 3. Model kataloğu | WP3 ile paralel (2027) | Katalog, 3D önizleme, indirmeler. Modeller test edildikçe eklenir |
| 4. Eğitim paketi | WP4 sonrası | Malta eğitimi sonrası modüller ve videolar |
| 5. Transfer + ağ | 2028 | Transfer paketi, merkez ağı sayfası, sürdürülebilirlik planı |
| 6. Kapanış | Ekim 2028 | Final içerik, EPALE/Results Platform bağlantıları, uzun vadeli bakım notu |

## 9. Ortaklardan istenecekler

- Logo dosyaları (vektör), kurum tanıtım metinleri (EN, kısa), iletişim kişisi
- Her model için: fotoğraflar, STL dosyası, baskı ayarları, test sonuçları (WP3)
- Haber ve etkinlik fotoğrafları (izin alınmış)
- Varsa kendi dillerinde çeviriler (opsiyonel, ileride)

## 10. Kararlar ve açık konular

1. **Alan adı:** `3dcare.eu` seçildi (Ekim 2026'da boş görünüyordu). .eu yalnızca AB/AEA'da yerleşik kurumlarca kaydedilebilir. Bu yüzden kaydı HR, LV, MT veya LT ortağı yapmalı. Kayıt tamamlanana kadar site `laroca00.github.io/3dcare` adresinde yayınlanır.
2. **Model lisansı:** Açık. Modeller gelene kadar şablon modeller kullanılacak.
3. **Formlar:** Açık.
4. **Proje/sözleşme numarası:** Bilinmiyor. Koordinatör DTSER'den istenecek (Fondacija Tempus sözleşmesinde, `2026-1-RS01-KA220-ADU-000…` biçiminde). Gelene kadar footer'da yer tutucu kullanılacak.
