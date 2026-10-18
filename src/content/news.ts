import type { Locale, Localized } from "@/i18n/config";

export type Post = {
  slug: string;
  /** Publication date, YYYY-MM-DD. */
  date: string;
  title: Localized;
  summary: Localized;
  /** Paragraphs of the article. */
  body: Record<Locale, string[]>;
};

// Newest first.
export const posts: Post[] = [
  {
    slug: "website-online",
    date: "2026-10-18",
    title: {
      en: "The project website is online",
      tr: "Proje web sitesi yayında",
    },
    summary: {
      en: "The 3D Care website is now live in English and Turkish. It will host the models, the training package and news from the partners.",
      tr: "3D Care web sitesi İngilizce ve Türkçe olarak yayında. Modeller, eğitim paketi ve ortaklardan haberler burada yer alacak.",
    },
    body: {
      en: [
        "The 3D Care website is now online. It is the project’s central access point: the ten 3D models, their print settings and safety notes, the online training package and resources for new centres will all be published here.",
        "Until the first models pass user testing, the model catalogue shows templates that illustrate what each model page will contain. The website is available in English and Turkish, and more partner languages can be added.",
        "The website and the model files are developed in an open repository on GitHub, so anyone can follow the work and reuse the results. Visits are counted without cookies and without storing personal data.",
      ],
      tr: [
        "3D Care web sitesi yayına girdi. Site projenin merkezi erişim noktası: on 3D model, baskı ayarları ve güvenlik notları, çevrim içi eğitim paketi ve yeni merkezler için kaynaklar burada yayımlanacak.",
        "İlk modeller kullanıcı testlerinden geçene kadar model kataloğunda, her model sayfasının neler içereceğini gösteren şablonlar yer alıyor. Site İngilizce ve Türkçe olarak hazırlandı; diğer ortak dilleri de eklenebilir.",
        "Web sitesi ve model dosyaları GitHub’daki açık bir depoda geliştiriliyor; böylece herkes çalışmaları takip edip sonuçları yeniden kullanabilir. Ziyaretler çerez kullanılmadan ve kişisel veri saklanmadan sayılıyor.",
      ],
    },
  },
  {
    slug: "project-started",
    date: "2026-09-01",
    title: {
      en: "3D Care has started",
      tr: "3D Care projesi başladı",
    },
    summary: {
      en: "Seven organisations from six countries begin a two-year Erasmus+ partnership on 3D-printed assistive tools for adults with disabilities.",
      tr: "Altı ülkeden yedi kuruluş, engelli yetişkinler için 3D baskıyla üretilen yardımcı araçlar üzerine iki yıllık bir Erasmus+ ortaklığına başladı.",
    },
    body: {
      en: [
        "3D Care: Printing a More Inclusive Future started on 1 September 2026. The Erasmus+ cooperation partnership in adult education runs until 31 October 2028 and is coordinated by Društvo terapeuta specijalne edukacije i rehabilitacije (DTSER) in Belgrade, Serbia.",
        "Care and rehabilitation services, vocational schools and adult education providers from Serbia, Croatia, Türkiye, Latvia, Malta and Lithuania will develop ten open 3D models of assistive tools. Each model is tested with adults with disabilities and their therapists in two testing cycles before it is released.",
        "The partners will also train adult educators, therapists and care staff to print and use the models, and support new local learning centres in taking up the work.",
        "In the first phase, partners collect everyday needs from their own centres and agree on the ten priority models.",
      ],
      tr: [
        "3D Care: Daha Kapsayıcı Bir Geleceği Basıyoruz projesi 1 Eylül 2026’da başladı. Yetişkin eğitimi alanındaki bu Erasmus+ işbirliği ortaklığı 31 Ekim 2028’e kadar sürecek ve Belgrad’daki Društvo terapeuta specijalne edukacije i rehabilitacije (DTSER) tarafından koordine ediliyor.",
        "Sırbistan, Hırvatistan, Türkiye, Letonya, Malta ve Litvanya’dan bakım ve rehabilitasyon hizmetleri, meslek okulları ve yetişkin eğitimi kuruluşları, yardımcı araçlar için on açık 3D model geliştirecek. Her model yayımlanmadan önce engelli yetişkinler ve terapistleriyle iki test döngüsünde denenecek.",
        "Ortaklar ayrıca yetişkin eğitimcileri, terapistleri ve bakım personelini modelleri basıp kullanabilmeleri için eğitecek ve yeni yerel öğrenme merkezlerinin bu çalışmayı benimsemesine destek olacak.",
        "İlk aşamada ortaklar kendi merkezlerindeki günlük ihtiyaçları toplayıp öncelikli on model üzerinde uzlaşacak.",
      ],
    },
  },
];

export const getPost = (slug: string) => posts.find((p) => p.slug === slug);

export function formatDate(date: string, lang: Locale) {
  return new Intl.DateTimeFormat(lang === "tr" ? "tr-TR" : "en-GB", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}
