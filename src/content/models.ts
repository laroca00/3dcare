import type { Localized } from "@/i18n/config";

export type Model = {
  slug: string;
  /** True until the real, validated model replaces this entry. */
  template: boolean;
  name: Localized;
  summary: Localized;
  use: Localized;
  users: Localized;
  difficulty: "easy" | "medium" | "advanced";
  printTime: string;
  material: string;
  layer: string;
  infill: string;
};

export const models: Model[] = [
  {
    slug: "easy-grip-mug",
    template: true,
    name: { en: "Easy-grip mug handle", tr: "Kolay tutulan kupa kulpu" },
    summary: {
      en: "A wide handle that clips onto a standard mug so it can be held with the whole hand.",
      tr: "Standart bir kupaya takılan geniş kulp; kupa tüm elle kavranabilir.",
    },
    use: { en: "Eating and drinking", tr: "Yeme ve içme" },
    users: {
      en: "People with limited grip strength or tremor",
      tr: "Tutma gücü sınırlı ya da eli titreyen kişiler",
    },
    difficulty: "easy",
    printTime: "2 h 40 min",
    material: "PLA",
    layer: "0.2 mm",
    infill: "20 %",
  },
  {
    slug: "cutlery-handle",
    template: true,
    name: { en: "Adaptive cutlery handle", tr: "Uyarlanabilir çatal-kaşık sapı" },
    summary: {
      en: "A thicker, textured sleeve that slides over standard cutlery for a softer, safer grip.",
      tr: "Standart çatal-kaşığın üzerine geçen kalın, dokulu kılıf; daha yumuşak ve güvenli tutuş sağlar.",
    },
    use: { en: "Eating and drinking", tr: "Yeme ve içme" },
    users: {
      en: "People with limited hand mobility",
      tr: "El hareketleri kısıtlı kişiler",
    },
    difficulty: "medium",
    printTime: "1 h 50 min",
    material: "TPU / PLA",
    layer: "0.2 mm",
    infill: "15 %",
  },
  {
    slug: "instrument-adapter",
    template: true,
    name: { en: "Music instrument adapter", tr: "Müzik aleti adaptörü" },
    summary: {
      en: "A holder that lets a player strike or strum an instrument without fine finger movements.",
      tr: "İnce parmak hareketi gerektirmeden bir çalgıya vurmayı ya da tellerine dokunmayı sağlayan tutucu.",
    },
    use: { en: "Music and creative learning", tr: "Müzik ve yaratıcı öğrenme" },
    users: {
      en: "Learners with motor impairments in music sessions",
      tr: "Müzik etkinliklerinde motor bozukluğu olan öğrenenler",
    },
    difficulty: "advanced",
    printTime: "4 h 10 min",
    material: "PETG",
    layer: "0.16 mm",
    infill: "30 %",
  },
];

export const getModel = (slug: string) => models.find((m) => m.slug === slug);
