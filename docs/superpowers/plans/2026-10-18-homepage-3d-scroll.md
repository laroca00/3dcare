# Ana sayfa 3D kaydırma deneyimi ve açık/koyu tema: uygulama planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ana sayfanın üstüne, kaydırmayla ilerleyen beş sahneli bir 3D yazıcı hikâyesi eklemek ve sitenin tamamına açık/koyu tema getirmek. Tüm bunlar performans bütçesi içinde kalmalı.

**Architecture:**
- **Tema:** CSS değişkenleri ve `<html data-theme>` ile çalışır. İlk boyamadan önce küçük bir satır içi betik temayı uygular.
- **3D sahne:** Ana sayfadaki `HomeStory` istemci bileşeni, uzun bir bölümün içinde sabit (sticky) bir tuval tutar. Three.js sahnesini ilk boyamadan sonra dinamik içe aktarır ve kaydırma ilerlemesini (0–1) saf bir zaman çizelgesi modülünden okur.
- **Yedek:** "Hareketi azalt" açıksa ya da WebGL yoksa, aynı sahneden üretilmiş sabit kareler gösterilir.

**Tech Stack:** Next.js 16 (statik dışa aktarım), React 19, TypeScript, Three.js 0.178.0, testler için `node --test` (Node 24 TypeScript'i doğrudan çalıştırır), kareler için başsız Edge ve sharp.

**Spec:** [docs/superpowers/specs/2026-10-18-homepage-3d-scroll-design.md](../specs/2026-10-18-homepage-3d-scroll-design.md)

## Global Constraints

- LCP < 2,5 sn (orta seviye telefon, 4G); başlık ve açıklama 3D'yi beklemeden görünür.
- Lighthouse Performans (mobil) ≥ 90; CLS = 0.
- 3D için ek JavaScript (gzip) ≤ 200 KB, ilk boyamadan sonra tembel yüklenir.
- Harici model ya da doku dosyası yok: geometri ve dokular kodla üretilir.
- 60 fps (orta seviye dizüstü), ≥ 30 fps ve takılma yok (orta seviye Android).
- Kaydırma kilitlenmez; yumuşatma kütüphanesi (Lenis, GSAP) kullanılmaz.
- "Hareketi azalt" açıksa ya da WebGL yoksa 3D yüklenmez, sabit kareler gösterilir.
- Tuval `aria-hidden`; hikâye metni her zaman DOM'da, okunabilir ve seçilebilir.
- Varsayılan tema `prefers-color-scheme`; iki konumlu düğme; seçim `localStorage` anahtarı `3dcare-theme`, okuma ve yazma try/catch içinde.
- Tüm metinler EN + TR, `src/i18n/en.ts` ve `src/i18n/tr.ts` içinde (tipler `typeof en` ile eşleşmeli).
- WCAG 2.2 AA: her iki temada metin kontrastı ≥ 4.5:1, büyük metin ve arayüz öğeleri ≥ 3:1.
- Commit mesajlarında yapay zekâ veya araç adı geçmez, Co-Authored-By satırı yok. Her yayınlanabilir aşamada `CHANGELOG.md` güncellenir.
- Footer her iki temada koyu kalır. Bu yüzden AB logosunun negatif sürümü her iki temada da doğru sürümdür ve pozitif sürüm indirilmez. Spec'teki "iki temada doğru sürüm" şartı bu şekilde karşılanır.

## Review Focus

1. **Tema sahne ortasında değişirse:** Ziyaretçi 3. sahnedeyken temayı değiştirirse ışık ve arka plan yeniden yüklenmeden geçer; kaydırma konumu ve parçalanma durumu korunur. (Task 6, `applyTheme` testi)
2. **localStorage erişilemezse:** Gizli pencerede ya da site verisi engelliyken okuma veya yazma hata fırlatırsa tema cihaz ayarına düşer ve düğme yine çalışır (sadece hatırlamaz). (Task 1, `resolveTheme` ve `themeInitScript` testleri)
3. **Kaydırma uçları ve hızlı kaydırma:** İlerleme 0'ın altına ya da 1'in üstüne çıkamaz. Hızlı kaydırmada sahne atlanmaz, her kare doğrudan ilerlemeden hesaplanır (durumsuz). Bölüm ekrandan kısaysa bölmeden kaynaklanan NaN oluşmaz. (Task 3, `progressFor` ve `sceneAt` testleri)
4. **Yavaş cihaz:** Kare süresi sürekli bütçenin üstündeyse kalite düşer, ama tek bir takılma yüzünden düşmez. Kalite düştükten sonra geri salınım (aç-kapa) olmaz. (Task 3, `QualityController` testleri)
5. **Sekme arka planda ya da tuval görünmüyorken:** Çizim döngüsü durur, geri dönünce kaldığı yerden sürer. (Task 4, manuel doğrulama adımı)

---

## Dosya yapısı

| Dosya | Sorumluluk |
|---|---|
| `src/theme/theme.ts` | Saf tema mantığı: `Theme` tipi, `resolveTheme`, `THEME_STORAGE_KEY`, `themeInitScript` |
| `src/theme/theme.test.ts` | Tema mantığı testleri |
| `src/components/ThemeToggle.tsx` | Başlıktaki tema düğmesi (istemci) |
| `src/app/globals.css` | Koyu tema değişkenleri, sabit renklerin değişkene taşınması, hikâye bölümü stilleri |
| `scripts/check-contrast.test.mjs` | `globals.css` içindeki iki temanın renk çiftlerinin kontrastını doğrular |
| `src/scene/timeline.ts` | Saf zaman çizelgesi: sahne aralıkları, `sceneAt`, `localProgress`, `smoothstep` |
| `src/scene/scrollProgress.ts` | Saf `progressFor(rectTop, rectHeight, viewportHeight)` |
| `src/scene/quality.ts` | Saf `initialQuality`, `QualityController` |
| `src/scene/*.test.ts` | Saf modüllerin testleri |
| `src/components/HomeStory.tsx` | Hikâye bölümü: metinler, sticky tuval, mod seçimi (3D / sabit kareler), tembel yükleme |
| `src/scene/runScene.ts` | Three.js sahnesini kurar ve çalıştırır; `startScene` ve `SceneHandle` |
| `src/scene/printer.ts` | Kodla kurulan yazıcı ve parça listesi |
| `src/scene/studio.ts` | Işık, ortam ve arka plan; temaya göre ayar |
| `src/scene/drawing.ts` | Sahne 1'deki teknik çizim katmanı |
| `src/scene/printJob.ts` | Sahne 4'te katman katman basılan kupa kulpu |
| `src/scene/hand.ts` | Sahne 5'teki stilize el (ya da yedek plan) |
| `scripts/render-stills.mjs` | Sabit kareleri üretir (başsız Edge ve sharp) |
| `scripts/check-budget.mjs` | Derleme çıktısında 3D parçalarının gzip boyutunu doğrular |
| `public/story/{light,dark}-{1..5}.webp` | Sabit kareler |

`package.json` script'leri:
- `"test": "node --test \"src/**/*.test.ts\" \"scripts/**/*.test.mjs\""`
- `"check:budget": "node scripts/check-budget.mjs out"`

`tsconfig.json`'a `"allowImportingTsExtensions": true` eklenir. Test dosyaları saf modülleri `./timeline.ts` gibi uzantılı göreli yolla içe aktarır; `@/` takma adı testlerde çözülmez, bu yüzden saf modüller yalnızca göreli içe aktarma kullanır.

---

## Aşama 1: Tema (tek başına yayınlanabilir)

### Task 1: Tema mantığı ve ilk boyama betiği

**Files:**
- Create: `src/theme/theme.ts`, `src/theme/theme.test.ts`
- Modify: `package.json` (test script'i), `tsconfig.json` (`allowImportingTsExtensions`), `src/app/[lang]/layout.tsx` (head betiği, `suppressHydrationWarning`)

**Interfaces:**
- Produces:
  - `type Theme = "light" | "dark"`
  - `const THEME_STORAGE_KEY = "3dcare-theme"`
  - `resolveTheme(stored: string | null, prefersDark: boolean): Theme`
  - `const themeInitScript: string`: kendi başına çalışan IIFE kaynak metni. `localStorage`'ı try/catch ile okur, `matchMedia('(prefers-color-scheme: dark)')`'a bakar ve `document.documentElement.dataset.theme` değerini atar.

- [ ] **Step 1: Testleri yaz** (`src/theme/theme.test.ts`, `node:test` + `node:assert/strict`)
  - `resolveTheme("dark", false) === "dark"`, `resolveTheme("light", true) === "light"`
  - `resolveTheme(null, true) === "dark"`, `resolveTheme(null, false) === "light"`
  - Geçersiz değer cihaz ayarına düşer: `resolveTheme("purple", true) === "dark"`
  - `themeInitScript`, sahte bir `document`, çalışan `localStorage` (`"light"`) ve `matchMedia` (dark = true) ile `new Function("document","localStorage","matchMedia", themeInitScript)` biçiminde çalıştırılınca `dataset.theme === "light"` olur.
  - `localStorage.getItem` hata fırlatırken aynı çalıştırmada `dataset.theme === "dark"` olur ve hata dışarı sızmaz.
- [ ] **Step 2: Çalıştır, başarısız olduğunu gör.** Komut: `npm test`. Beklenen: `theme.ts` bulunamadığı için FAIL.
- [ ] **Step 3: `src/theme/theme.ts`'i yaz** (yukarıdaki imzalar). `themeInitScript`, `resolveTheme` ile aynı kuralı küçük bir IIFE metni olarak tekrarlar; içe aktarma yapamadığı için bu tekrar kabul edilir ve testler ikisini aynı girdilerle doğrular.
- [ ] **Step 4: Layout'a ekle.** `layout.tsx` içinde `<html lang={lang} suppressHydrationWarning>` ve `<head><script dangerouslySetInnerHTML={{ __html: themeInitScript }} /></head>`.
- [ ] **Step 5: Doğrula.** `npm test` PASS, `npx tsc --noEmit` temiz.
- [ ] **Step 6: Commit.** Mesaj: `Add theme resolution and pre-paint theme script`

### Task 2: Koyu tema renkleri, düğme ve kontrast denetimi

**Files:**
- Modify: `src/app/globals.css`, `src/components/SiteHeader.tsx`, `src/i18n/en.ts`, `src/i18n/tr.ts`, `src/app/[lang]/privacy` metni (en/tr `privacy.body`), `CHANGELOG.md`
- Create: `src/components/ThemeToggle.tsx`, `scripts/check-contrast.test.mjs`

**Interfaces:**
- Consumes: `Theme`, `THEME_STORAGE_KEY`, `resolveTheme` (Task 1)
- Produces:
  - DOM sözleşmesi: tema `document.documentElement.dataset.theme` üzerinde yaşar (`"light" | "dark"`). Task 4'teki sahne bu niteliği `MutationObserver` ile izler.
  - Yeni CSS değişkenleri: `--surface` (kartlar, başlık), `--on-accent` (teal düğme üstü metin), `--footer-bg`, `--footer-text`, `--footer-muted`. Mevcut `--white` kullanımları `--surface`'e taşınır.
  - Sözlük: `nav.themeLabel` (EN "Dark mode", TR "Koyu mod").

- [ ] **Step 1: Kontrast testini yaz** (`scripts/check-contrast.test.mjs`). Test `globals.css`'i okur, `:root { … }` ve `:root[data-theme="dark"] { … }` bloklarından değişkenleri ayrıştırır ve WCAG göreli parlaklık formülüyle şu çiftleri iki tema için doğrular:
  - `--ink` / `--paper` ≥ 4.5
  - `--ink` / `--surface` ≥ 4.5
  - `--muted` / `--paper` ≥ 4.5
  - `--teal` / `--paper` ≥ 4.5 (bağlantılar)
  - `--on-accent` / `--teal` ≥ 4.5 (birincil düğme)
  - `--footer-text` / `--footer-bg` ≥ 4.5
  - `--footer-muted` / `--footer-bg` ≥ 4.5
  - `--plate` / `--paper` ≥ 1.2 (kenarlıkların görünürlüğü; dekoratif)
- [ ] **Step 2: Çalıştır.** `npm test`. Beklenen: koyu blok ve yeni değişkenler olmadığı için FAIL.
- [ ] **Step 3: CSS'i güncelle.**
  - Koyu değerler `:root[data-theme="dark"]` bloğunda; ayrıca `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { … } }` ile betik çalışmadan da doğru görünüm.
  - Sabit renkler (`#c9d3cf`, `#ffffff` vb.) değişkene taşınır.
  - Footer her iki temada koyu kalır.
  - `color-scheme: light dark` eklenir.
- [ ] **Step 4: `ThemeToggle.tsx`'i yaz.** `ThemeToggle({ label }: { label: string })`, `"use client"`.
  - `<button type="button" aria-pressed={theme === "dark"}>`: ay/güneş ikonu (inline SVG, `aria-hidden`) ve görünmez etiket.
  - Tıklayınca `dataset.theme`'i değiştirir ve `localStorage`'a try/catch ile yazar.
  - İlk durumu `dataset.theme`'den okur. Hidrasyon uyumsuzluğunu önlemek için ilk render'da `aria-pressed` değerini `useEffect` sonrası ayarlar.
  - `SiteHeader`'da dil düğmesinin yanına eklenir.
- [ ] **Step 5: Gizlilik metnine tek cümle ekle.**
  - EN: "Your light or dark theme choice is saved only in your browser."
  - TR: "Açık ya da koyu tema seçiminiz yalnızca tarayıcınızda saklanır."
- [ ] **Step 6: Doğrula.** `npm test` PASS; `npm run lint` ve `npx tsc --noEmit` temiz; `MSYS_NO_PATHCONV=1 BASE_PATH=/3dcare npm run build` başarılı.
- [ ] **Step 7: Görsel kontrol.** Başsız Edge ile `/en/`, `/en/resources/` ve `/en/contact/` sayfalarının iki temada ekran görüntüsünü al. Koyu tema `--force-dark-mode` bayrağıyla açılır; bu bayrak `prefers-color-scheme: dark` sağlar. Okunmayan metin ya da beyaz kalan yüzey olmamalı.
- [ ] **Step 8: CHANGELOG'a "Light and dark theme" girdisi ekle, commit ve push.** Mesaj: `Add light and dark theme with a header toggle`. Deploy'un bitmesini bekle, canlıda iki temayı kontrol et.

---

## Aşama 2: Sahne iskeleti

### Task 3: Saf hikâye modülleri (zaman çizelgesi, kaydırma ilerlemesi, kalite)

**Files:**
- Create: `src/scene/timeline.ts`, `src/scene/scrollProgress.ts`, `src/scene/quality.ts` ve her birinin `.test.ts` dosyası

**Interfaces:**
- Produces:
  - `type SceneId = "draw" | "meet" | "explode" | "print" | "use"`
  - `const SCENES: readonly { id: SceneId; start: number; end: number }[]`: başlangıç değerleri `draw 0–0.16`, `meet 0.16–0.36`, `explode 0.36–0.58`, `print 0.58–0.82`, `use 0.82–1`. Bitişik, boşluksuz.
  - `sceneAt(progress: number): SceneId`: `[0,1]` dışındaki değerler kırpılır.
  - `localProgress(progress: number, id: SceneId): number`: sahne içinde 0–1, sahne öncesinde 0, sonrasında 1.
  - `smoothstep(t: number): number`: `t*t*(3-2t)`, `[0,1]`'e kırpılmış.
  - `progressFor(rectTop: number, rectHeight: number, viewportHeight: number): number`: `clamp(-rectTop / (rectHeight - viewportHeight), 0, 1)`. `rectHeight <= viewportHeight` ise 0.
  - `type QualityLevel = 0 | 1 | 2` (2 = en yüksek)
  - `initialQuality(env: { width: number; dpr: number; cores: number }): QualityLevel`: `width < 768` ya da `cores <= 4` ise 1, değilse 2.
  - `class QualityController { constructor(start: QualityLevel, budgetMs = 1000 / 50); sample(frameMs: number): QualityLevel; get level(): QualityLevel }`: son 60 karenin ortalaması bütçeyi aşarsa bir kademe düşer, pencere sıfırlanır. Asla yükselmez. En düşük seviye 0.
- [ ] **Step 1: Testleri yaz.**
  - **timeline:**
    - Sahneler 0'dan başlar, 1'de biter ve bitişiktir.
    - `sceneAt(-0.5) === "draw"`, `sceneAt(1.7) === "use"`, `sceneAt(0.5) === "explode"`.
    - `localProgress(0.26, "meet") ≈ 0.5`; `localProgress(0.1, "print") === 0`; `localProgress(0.9, "meet") === 1`.
    - `smoothstep(-1) === 0`, `smoothstep(2) === 1`, `smoothstep(0.5) === 0.5`.
  - **scrollProgress:**
    - `progressFor(0, 5000, 1000) === 0`, `progressFor(-2000, 5000, 1000) === 0.5`, `progressFor(-9000, 5000, 1000) === 1`.
    - `progressFor(-100, 800, 1000) === 0` (NaN değil).
  - **quality:**
    - `initialQuality({ width: 390, dpr: 3, cores: 8 }) === 1`, `initialQuality({ width: 1440, dpr: 2, cores: 8 }) === 2`.
    - 59 kare 50 ms ve 1 kare 10 ms ile seviye düşmez (pencere dolmadı).
    - 60 kare 30 ms ile 2 → 1.
    - Tek bir 200 ms takılma (diğerleri 10 ms) seviyeyi düşürmez.
    - 0'dan aşağı inmez.
    - Hızlı karelerle tekrar yükselmez.
- [ ] **Step 2: Çalıştır.** `npm test`. Beklenen: modüller yok, FAIL.
- [ ] **Step 3: Üç modülü yaz** (yalnızca yukarıdaki imzalar, harici bağımlılık yok).
- [ ] **Step 4: Doğrula.** `npm test` PASS.
- [ ] **Step 5: Commit.** Mesaj: `Add scroll story timeline, progress and quality helpers`

### Task 4: HomeStory bölümü, tembel 3D yükleme ve basit sahne

**Files:**
- Create: `src/components/HomeStory.tsx`, `src/scene/runScene.ts`
- Modify: `src/app/[lang]/page.tsx` (hero yerine `HomeStory`; `PrintFigure` içe aktarması kalkar), `src/app/globals.css` (`.story` stilleri), `src/i18n/en.ts`, `src/i18n/tr.ts`, `package.json` (`three@0.178.0`, `@types/three` aynı minor)

**Interfaces:**
- Consumes: `sceneAt`, `localProgress`, `smoothstep`, `SCENES`, `progressFor`, `initialQuality`, `QualityController` (Task 3); `Theme` (Task 1); `dataset.theme` sözleşmesi (Task 2)
- Produces:
  - `startScene(canvas: HTMLCanvasElement, opts: { theme: Theme; quality: QualityLevel; getProgress: () => number; labels: Record<PartId, string> }): SceneHandle`
  - `interface SceneHandle { setTheme(theme: Theme): void; invalidate(): void; dispose(): void }`
  - `invalidate()` bir sonraki kareyi ister. Döngü yalnızca ilerleme değişince ya da bir geçiş sürerken çizer.
  - Sözlük `home.story`:
    - `scenes: { title: string; text: string }[]`: 5 öğe, sahne sırasıyla.
    - `labels: Record<PartId, string>`
    - `stillAlt: string[]`: 5 öğe.
    - `cta: string`
  - `PartId` Task 5'te tanımlanır. Bu task'ta `runScene.ts` geçici olarak tek kutulu bir yer tutucu çizer ve etiketleri yok sayar.
- Sahne metinleri (EN; TR karşılıklarını aynı tonda yaz):
  1. Mevcut `home.title` ve `home.lead`, iki düğmesiyle.
  2. "Low-cost printers, already within reach" / "A desktop 3D printer costs less than many assistive tools it can make."
  3. "Simple parts, nothing hidden" / "Every part of the printer and every model file is open, so any centre can learn, repair and adapt."
  4. "Ten tools, tested with the people who use them" / "Each model is printed layer by layer, then tried by adults with disabilities and their therapists."
  5. "From the printer to everyday life" / `cta`: mevcut `home.browse`.
- [ ] **Step 1: Bağımlılığı ekle.** `npm install three@0.178.0 && npm install -D @types/three@0.178`
- [ ] **Step 2: `HomeStory` bileşenini yaz** (`"use client"`).
  - `<section className="story">`: `--story-length` ile masaüstünde `600vh`, mobilde `500vh` yükseklik.
  - İçinde `position: sticky; top: 0; height: 100svh` bir sahne kutusu ve `aria-hidden` tuval.
  - Metinler normal akışta: her sahne için bir `<div className="story__beat">`, başlık h1/h2 hiyerarşisini korur.
  - Mod seçimi istemcide yapılır:
    - `matchMedia("(prefers-reduced-motion: reduce)")` ya da WebGL2 bağlamı alınamıyorsa `"stills"`.
    - Değilse `"live"`.
    - İlk render her zaman metin ile sabit bir görseli gösterir; böylece LCP ve CLS 3D'ye bağlı olmaz. Bu görsel Task 8'e kadar mevcut `PrintFigure`, Task 8'den sonra `/story/{theme}-1.webp`. 3D hazır olunca tuval görselin üstüne yumuşakça geçer.
  - `?story=<0..1>` sorgu parametresi burada tanımlanır (Task 5–8 bunu kullanır). Parametre varken ilerleme sabittir, metin katmanı gizlidir, `&theme=light|dark` varsa tema ona zorlanır ve sahne ilk kareyi çizince `document.documentElement.dataset.storyReady = "1"` atanır.
  - `"live"` modunda `requestIdleCallback` (yoksa `setTimeout(…, 200)`) sonrası `import("@/scene/runScene")`.
  - Kaydırma: `passive` scroll dinleyicisi `progressFor(...)` hesaplar ve `handle.invalidate()` çağırır.
  - Sahne görünmüyorsa `IntersectionObserver`, sekme gizliyse `visibilitychange` ile döngü durur.
  - Tema: `MutationObserver` `data-theme`'i izler ve `handle.setTheme(...)` çağırır.
  - Beat metinleri ilerlemeye göre `--reveal` CSS değişkeniyle griden tam renge geçer. `prefers-reduced-motion`'da hep tam renk.
- [ ] **Step 3: `runScene.ts`'i yaz** (geçici yer tutucu yazıcı).
  - `WebGLRenderer`'ın `antialias` ayarı kaliteye bağlı. Piksel oranı `min(dpr, quality === 2 ? 2 : 1.5)`.
  - Kare süresi `QualityController`'a beslenir; seviye düşünce piksel oranı ve gölge ayarlanır.
  - `dispose()` tüm geometri, malzeme ve renderer'ı serbest bırakır.
- [ ] **Step 4: Bütçe betiğini yaz** (`scripts/check-budget.mjs`).
  - `out/_next/static/chunks/*.js` içinde `WebGLRenderer` geçen dosyaları ve onların içe aktardığı parçaları bulur.
  - gzip toplamı 200 KB'ı aşarsa çıkış kodu 1 ile biter.
  - Ana sayfanın ilk yüklenen script'lerinde `WebGLRenderer` olmadığını da doğrular (tembel yükleme).
  - Toplamı yazdırır.
- [ ] **Step 5: Derle ve ölç.** `MSYS_NO_PATHCONV=1 BASE_PATH=/3dcare npm run build && npm run check:budget`. Beklenen: "3D chunks: NNN KB gzip (budget 200 KB)" ve çıkış kodu 0.
- [ ] **Step 6: Manuel doğrulama** (yerel sunucu: `MSYS_NO_PATHCONV=1 node <scratchpad>/serve.mjs out /3dcare 4173`, başsız Edge `--use-angle=swiftshader`):
  - İlk ekranda başlık görünür.
  - Kaydırınca yer tutucu döner.
  - Tema düğmesi arka planı değiştirir.
  - Sekme gizlenince döngü durur: `requestAnimationFrame` sayacı konsola yazılır, sonra kaldırılır.
- [ ] **Step 7: Lint, tip ve test kontrolü; commit.** Mesaj: `Add home story section with lazy 3D scene`. Bu aşamada sabit kareler yok; `"stills"` modu geçici olarak mevcut `PrintFigure`'ı gösterir.

---

## Aşama 3: Yazıcı ve ışık

### Task 5: Kodla kurulan detaylı yazıcı

**Files:**
- Create: `src/scene/printer.ts`
- Modify: `src/scene/runScene.ts` (yer tutucu yerine yazıcı)

**Interfaces:**
- Produces:
  - `type PartId = "base" | "bed" | "frame" | "gantry" | "head" | "spool" | "display"`
  - `interface PrinterPart { id: PartId; object: THREE.Group; home: THREE.Vector3; explodeDir: THREE.Vector3; labelAnchor: THREE.Vector3 }`
  - `buildPrinter(quality: QualityLevel): { root: THREE.Group; parts: PrinterPart[]; nozzle: THREE.Object3D; bedSurface: THREE.Object3D; dispose(): void }`
  - `setExplode(parts: PrinterPart[], amount: number): void`: `amount` 0–1, `smoothstep` uygulanmış.
- Yapı: klasik bedslinger (Prusa/Ender benzeri), marka kopyalanmaz. Prototipteki oranlar başlangıç noktası (`.superpowers/brainstorm/*/content/printer-model.html` içindeki `buildPrinter`).
- Detay (kalite 2):
  - pahlı alüminyum profiller (`ExtrudeGeometry` ile oluklu kesit)
  - çelik miller, GT2 kayış (ince kutu zinciri)
  - step motorlar (kenarları yuvarlatılmış kutu ve soğutucu çizgileri)
  - baskı kafasında fan ızgarası (halka geometrisi) ve nozul
  - makaradan kafaya giden filament (`TubeGeometry`, `CatmullRomCurve3`)
  - ekranda `CanvasTexture` ile çizilmiş basit arayüz
- Kalite 1'de kayış dişleri, vida başları ve fan ızgarası çıkarılır. Kalite 0'da yalnızca ana kütleler kalır.
- [ ] **Step 1:** `printer.ts`'i yaz ve `runScene`'e bağla. Patlama miktarı `localProgress(p, "explode")`'dan, toplanma da `print` sahnesinin ilk %20'sinde tersine çalışır.
- [ ] **Step 2: Bütçeyi doğrula.** `npm run build && npm run check:budget` hâlâ ≤ 200 KB.
- [ ] **Step 3: Görsel kontrol.** Başsız Edge ile `?story=0.2` ve `?story=0.5` karelerini al ve parçaların birbirine girmediğini, patlamanın okunaklı olduğunu kontrol et.
- [ ] **Step 4: Commit.** Mesaj: `Build the detailed printer model for the home story`

### Task 6: Stüdyo ışığı ve iki tema

**Files:**
- Create: `src/scene/studio.ts`
- Modify: `src/scene/runScene.ts`

**Interfaces:**
- Produces:
  - `createStudio(renderer: THREE.WebGLRenderer, scene: THREE.Scene, theme: Theme, quality: QualityLevel): Studio`
  - `interface Studio { setTheme(theme: Theme): void; update(dtSeconds: number): boolean; dispose(): void }`
  - `update` geçiş sürerken `true` döner; `runScene` bu durumda çizmeye devam eder.
- Değerler:
  - **Koyu:** arka plan `#15120F`, kenarlarda sıcak radyal parlama (arka plan dokusu, `CanvasTexture`), ana spot `#FFB070` sol üstten, kenar ışığı `#FFD2A0` arkadan, ortam yansıması 0.3–0.4.
  - **Açık:** arka plan `--paper` (`#F5F7F6`) ile `#E6EBE9` arası dikey geçiş, geniş yumuşak üst ışık, zeminde `ShadowMaterial` gölge (opaklık 0.12–0.18), ortam yansıması 0.8–1.
- Tema geçişi 600 ms; ışık yoğunlukları ve renkler `smoothstep` ile karışır.
- Ortam: `RoomEnvironment` + `PMREMGenerator`, kalite 0'da kapalı.
- [ ] **Step 1: Test yaz.** `src/scene/studioMix.test.ts`. `studio.ts` içindeki saf `mixStudio(from: StudioValues, to: StudioValues, t: number): StudioValues` fonksiyonu için:
  - `t=0` → `from`, `t=1` → `to`
  - `t=0.5`'te renkler ve yoğunluklar arada
  - `t` 0–1 dışına çıkınca kırpılır
  - Geçiş ortasında yeni bir `setTheme` gelirse mevcut karışık değerden yeni hedefe gider. Bunu `StudioTransition` saf sınıfıyla test et: `start(to)`, `step(dt)`, `current`.
- [ ] **Step 2: Çalıştır, FAIL gör.** Sonra `mixStudio` ve `StudioTransition`'ı uygula, PASS.
- [ ] **Step 3: Three.js tarafını bağla.** `runScene.setTheme` → `studio.setTheme`.
- [ ] **Step 4: Görsel kontrol.** İki temada `?story=0.3` kareleri: koyu temada Oryzo benzeri kenar ışığı, açık temada yumuşak gölge görünmeli.
- [ ] **Step 5: Bütçe kontrolü, commit.** Mesaj: `Add studio lighting for light and dark themes`

---

## Aşama 4: Hikâye

### Task 7: Çizim, etiketler, baskı ve el

**Files:**
- Create: `src/scene/drawing.ts`, `src/scene/printJob.ts`, `src/scene/hand.ts`
- Modify: `src/scene/runScene.ts`, `src/components/HomeStory.tsx` (etiket katmanı), `src/app/globals.css`

**Interfaces:**
- Produces:
  - `createDrawing(root: THREE.Group, printer: ReturnType<typeof buildPrinter>): { setReveal(lineT: number, fillT: number): void; dispose(): void }`: yazıcının ön kesit çizgileri (`EdgesGeometry` → `LineSegments`, kesikli çizgi), ölçü okları ve logodaki eş merkezli yayları çağrıştıran üç yay. Çizgi rengi teal, vurgu sarı. `fillT` ilerledikçe çizgiler söner ve gerçek malzemeler `opacity` ile belirir.
  - `createPrintJob(bedSurface: THREE.Object3D, quality: QualityLevel): { setProgress(t: number): void; object: THREE.Group; nozzleTarget(t: number): THREE.Vector3; dispose(): void }`: kolay tutulan kupa kulpu (`easy-grip-mug` şablon modeli). Kupa gövdesi ve kulp, `LatheGeometry` ile katman bantları. `setProgress` görünür katman sayısını belirler. En üstteki katman sarı (mevcut `PrintFigure` dili). Baskı kafası `nozzleTarget(t)`'yi izler.
  - `createHand(quality: QualityLevel): { object: THREE.Group; setPose(t: number): void; dispose(): void }`: stilize, mat, heykelsi el (palmiye kütlesi ve kapsül parmaklar). `setPose(1)` parmaklar kupayı kavrar.
  - Etiketler: `runScene`, `getLabelPositions(): { id: PartId; x: number; y: number; visible: boolean }[]` (ekran pikseli) sunar. `HomeStory` bunları `transform` ile konumlanan `<span>` öğeleri olarak çizer. Bu öğeler `aria-hidden`; ekran okuyucular için parça listesi aynı beat metninde düz liste olarak bulunur.
- Zaman çizelgesi bağlantıları:
  - `draw`: `setReveal(localProgress, smoothstep(localProgress))`
  - `meet`: yazıcı `-0.6 → +1.5` rad döner
  - `explode`: `setExplode`; etiketler patlama 0.5'i geçince belirir
  - `print`: ilk %20 toplanma, sonra `printJob.setProgress`
  - `use`: kupa kalkar, el girer, `setPose`
- [ ] **Step 1: Çizim ve etiketleri yaz;** `?story=0.08` ve `?story=0.5` karelerini al.
- [ ] **Step 2: Baskıyı yaz;** `?story=0.7` karesini al. Katmanlar ve nozul hizalı olmalı.
- [ ] **Step 3: Eli ve yedek planı yaz.** Yedek plan: kupa masaya iner ve kamera yaklaşır. `?story=0.95` için iki kareyi (el / yedek) her iki temada al.
- [ ] **Step 4: Kullanıcı kararı.** İki seçeneği ekran görüntüleriyle kullanıcıya göster (spec bölüm 5) ve seçilmeyeni sil.
- [ ] **Step 5: Bütçe kontrolü, testler, lint; commit.** Mesaj: `Add drawing, part labels, printing and hand scenes`

### Task 8: Sabit kareler ve yedek mod

**Files:**
- Create: `scripts/render-stills.mjs`, `public/story/light-{1..5}.webp`, `public/story/dark-{1..5}.webp`
- Modify: `src/components/HomeStory.tsx`, `CHANGELOG.md`

**Interfaces:**
- Consumes: `SCENES` (Task 3); `?story=…&theme=…` ve `dataset.storyReady` (Task 4).
- Kareler: her sahnenin orta noktası, yani `(start + end) / 2`. 1600×900, WebP kalite 78. Toplamda tema başına 600 KB'ı geçmemeli.
- [ ] **Step 1: `render-stills.mjs`'i yaz.**
  - `out/` klasörünü yerel sunucuyla (`serve.mjs` mantığı betiğe gömülü) sunar.
  - Her tema ve sahne için başsız Edge'i (`--use-angle=swiftshader --enable-unsafe-swiftshader --window-size=1600,900`) `?story=<orta nokta>&theme=<tema>` ile çalıştırır. `--virtual-time-budget` kullanılmaz: sürekli animasyon sanal zamanın bitmesini engelliyor. Bunun yerine sabit bir bekleme ve süre aşımı kullanılır.
  - PNG'yi sharp ile WebP'ye çevirir.
  - Edge yolu: `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`. Ortam değişkeni `EDGE_PATH` ile değiştirilebilir.
- [ ] **Step 2: Kareleri üret ve göz at.** Kareler boş ya da siyah olmamalı.
- [ ] **Step 3: Yedek modu bağla.** `HomeStory` `"stills"` modunda beat'lerin yanında `<img src=… alt={stillAlt[i]} loading="lazy" width height>` gösterir; ilk kare `loading="eager"` ve `fetchpriority="high"`. `PrintFigure` artık ana sayfada kullanılmıyorsa ve başka yerde de kullanılmıyorsa dosyası silinir.
- [ ] **Step 4: Doğrula.**
  - `--force-prefers-reduced-motion` bayrağıyla başsız Edge ekran görüntüsü: canvas yok, kareler var.
  - `--disable-webgl` ile aynı sonuç.
- [ ] **Step 5: CHANGELOG girdisi ("Scroll-driven 3D printer story on the home page"), commit ve push.** Mesaj: `Add still frames for reduced motion and no-WebGL visitors`

---

## Aşama 5: Ölçüm ve cila

### Task 9: Performans ve erişilebilirlik doğrulaması

**Files:**
- Modify: duruma göre sahne dosyaları; `CHANGELOG.md`

- [ ] **Step 1: Lighthouse mobil.** `CHROME_PATH="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" npx --yes lighthouse@12 http://localhost:4173/3dcare/en/ --only-categories=performance,accessibility --form-factor=mobile --screenEmulation.mobile --output=json --output-path=<scratchpad>/lh-en.json`. Beklenen: performans ≥ 90, erişilebilirlik ≥ 95, LCP < 2500 ms, CLS = 0. Aynısını `/tr/` için tekrarla.
- [ ] **Step 2: Kare hızı.** Sayfaya geçici bir `?fps` modu koyma. Bunun yerine başsız olmayan Edge'de DevTools Performance kaydı al ve sonuçları kullanıcıya özetle: dizüstü 60 fps; "Mid-tier mobile" CPU 4× yavaşlatma ile ≥ 30 fps. Takılma varsa kalite eşiklerini ayarla.
- [ ] **Step 3: Erişilebilirlik kontrolleri.**
  - Klavye ile "İçeriğe geç", tema düğmesi ve CTA'ya ulaşılır.
  - Ekran okuyucu metni: beat'ler sırayla okunur; etiketler tekrar okunmaz.
  - Kontrast testi PASS.
- [ ] **Step 4: Bütçeyi son kez çalıştır.** `npm test && npm run lint && npx tsc --noEmit && npm run build && npm run check:budget`
- [ ] **Step 5: CHANGELOG'u tamamla, commit, push ve canlıda kontrol et.** Mesaj: `Tune home story performance and accessibility`. Ölçüm sonuçlarını kullanıcıya sayılarla bildir.
