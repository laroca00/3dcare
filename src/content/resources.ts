import type { Localized } from "@/i18n/config";

export type Resource = {
  id: string;
  title: Localized;
  text: Localized;
  /** Work package that produces the resource. */
  wp: number;
  /** Files that can be downloaded now (paths under public/). */
  files?: { label: Localized; path: string }[];
  /** Page of this site where the resource lives or will live. */
  page?: "models" | "training" | "network";
};

export const resources: Resource[] = [
  {
    id: "logo",
    title: { en: "Project logo", tr: "Proje logosu" },
    text: {
      en: "The 3D Care logo for presentations, posters and partner websites. Use the dark version on light backgrounds and the light version on dark backgrounds.",
      tr: "Sunumlar, afişler ve ortak web siteleri için 3D Care logosu. Açık zeminde koyu sürümü, koyu zeminde açık sürümü kullanın.",
    },
    wp: 5,
    files: [
      { label: { en: "SVG, for light backgrounds", tr: "SVG, açık zemin için" }, path: "/brand/3dcare-mark.svg" },
      { label: { en: "SVG, for dark backgrounds", tr: "SVG, koyu zemin için" }, path: "/brand/3dcare-mark-dark.svg" },
    ],
  },
  {
    id: "workflow",
    title: { en: "Production and testing workflow", tr: "Üretim ve test iş akışı" },
    text: {
      en: "A step-by-step method for designing, printing and testing assistive models with users, agreed by all partners.",
      tr: "Yardımcı araç modellerini tasarlamak, basmak ve kullanıcılarla test etmek için tüm ortakların üzerinde anlaştığı adım adım yöntem.",
    },
    wp: 2,
  },
  {
    id: "models",
    title: { en: "Model files and guides", tr: "Model dosyaları ve kılavuzları" },
    text: {
      en: "Printable files for the ten validated models, with print settings, safety and ergonomic notes and adaptation tips.",
      tr: "Doğrulanmış on modelin basılabilir dosyaları; baskı ayarları, güvenlik ve ergonomi notları ile uyarlama ipuçlarıyla birlikte.",
    },
    wp: 3,
    page: "models",
  },
  {
    id: "toolkit",
    title: { en: "Training pathway and assessment toolkit", tr: "Eğitim programı ve değerlendirme araçları" },
    text: {
      en: "A competence-based training pathway with pre- and post-checks, practical tasks and checklists for trainers.",
      tr: "Ön ve son değerlendirmeler, uygulamalı görevler ve eğitmen kontrol listeleri içeren yetkinlik temelli eğitim programı.",
    },
    wp: 4,
  },
  {
    id: "training",
    title: { en: "Online training package", tr: "Çevrim içi eğitim paketi" },
    text: {
      en: "Free online modules for adult educators, therapists and care staff on printing, adapting and using the models.",
      tr: "Yetişkin eğitimcileri, terapistler ve bakım personeli için modelleri basma, uyarlama ve kullanma üzerine ücretsiz çevrim içi modüller.",
    },
    wp: 4,
    page: "training",
  },
  {
    id: "transfer",
    title: { en: "Transfer Package", tr: "Transfer Paketi" },
    text: {
      en: "Everything a new centre needs to start: printable files, training materials, safety notes and an equipment checklist.",
      tr: "Yeni bir merkezin başlaması için gereken her şey: basılabilir dosyalar, eğitim materyalleri, güvenlik notları ve ekipman kontrol listesi.",
    },
    wp: 5,
    page: "network",
  },
  {
    id: "sustainability",
    title: { en: "Sustainability Plan", tr: "Sürdürülebilirlik Planı" },
    text: {
      en: "How partners and new centres will keep the models, training and network going after the project ends.",
      tr: "Ortakların ve yeni merkezlerin proje bittikten sonra modelleri, eğitimi ve ağı nasıl sürdüreceği.",
    },
    wp: 5,
  },
];
