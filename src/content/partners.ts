import type { Localized } from "@/i18n/config";

export type Partner = {
  name: string;
  shortName: string;
  country: Localized;
  city: string;
  type: Localized;
  role: Localized;
  website?: string;
  coordinator?: boolean;
};

export const partners: Partner[] = [
  {
    name: "Društvo terapeuta specijalne edukacije i rehabilitacije",
    shortName: "DTSER",
    country: { en: "Serbia", tr: "Sırbistan" },
    city: "Belgrade",
    type: { en: "Association of therapists", tr: "Terapistler derneği" },
    role: {
      en: "Coordinates the project and leads needs analysis and model specification.",
      tr: "Projeyi koordine ediyor; ihtiyaç analizi ve model tanımına liderlik ediyor.",
    },
    coordinator: true,
  },
  {
    name: "Srednja škola Ludbreg",
    shortName: "Ludbreg",
    country: { en: "Croatia", tr: "Hırvatistan" },
    city: "Ludbreg",
    type: { en: "Vocational secondary school", tr: "Mesleki ortaöğretim okulu" },
    role: {
      en: "Leads design, prototyping and printability checks of the models.",
      tr: "Modellerin tasarımına, prototiplenmesine ve basılabilirlik kontrollerine liderlik ediyor.",
    },
    website: "https://www.ssludbreg.hr",
  },
  {
    name: "Gölcük Şehit Volkan Tantürk Mesleki ve Teknik Anadolu Lisesi",
    shortName: "Gölcük VTAHS",
    country: { en: "Türkiye", tr: "Türkiye" },
    city: "Gölcük, Kocaeli",
    type: { en: "Vocational and technical high school", tr: "Mesleki ve teknik Anadolu lisesi" },
    role: {
      en: "Co-leads model development and hosts the second testing cycle.",
      tr: "Model geliştirmeye eş liderlik ediyor ve ikinci test döngüsüne ev sahipliği yapıyor.",
    },
  },
  {
    name: "Do-Re-Mi",
    shortName: "Do-Re-Mi",
    country: { en: "Latvia", tr: "Letonya" },
    city: "Jēkabpils",
    type: { en: "Music education association", tr: "Müzik eğitimi derneği" },
    role: {
      en: "Brings expertise in accessible music and creative learning, and tests models with users.",
      tr: "Erişilebilir müzik ve yaratıcı öğrenme deneyimini katıyor, modelleri kullanıcılarla test ediyor.",
    },
  },
  {
    name: "Future Focus Ltd",
    shortName: "Future Focus",
    country: { en: "Malta", tr: "Malta" },
    city: "Floriana",
    type: { en: "Adult education centre", tr: "Yetişkin eğitimi merkezi" },
    role: {
      en: "Leads the training programme and the online training package.",
      tr: "Eğitim programına ve online eğitim paketine liderlik ediyor.",
    },
    website: "https://www.futurefocus.com.mt",
  },
  {
    name: "Akgün Yaratıcı Fikirler Derneği",
    shortName: "ACIA",
    country: { en: "Türkiye", tr: "Türkiye" },
    city: "Ankara",
    type: { en: "Non-profit association", tr: "Kâr amacı gütmeyen dernek" },
    role: {
      en: "Leads dissemination and sustainability, and runs this website and the open repository.",
      tr: "Yaygınlaştırma ve sürdürülebilirliğe liderlik ediyor; bu siteyi ve açık depoyu yönetiyor.",
    },
  },
  {
    name: "Negalią turinčių asmenų centras „Korys“",
    shortName: "KORYS",
    country: { en: "Lithuania", tr: "Litvanya" },
    city: "Kaunas",
    type: { en: "Day centre for persons with disabilities", tr: "Engelli bireyler için gündüz merkezi" },
    role: {
      en: "Hosts the first testing cycle with adults with disabilities and their carers.",
      tr: "Engelli yetişkinler ve bakım verenleriyle ilk test döngüsüne ev sahipliği yapıyor.",
    },
    website: "https://www.ntackorys.lt",
  },
];
