import type { StaticImageData } from "next/image";
import type { Localized } from "@/i18n/config";
import img01 from "@/assets/gallery/01.webp";
import img02 from "@/assets/gallery/02.webp";
import img10 from "@/assets/gallery/10.webp";
import masa from "@/assets/gallery/a-masa.webp";
import ogrenciler from "@/assets/gallery/a-ogrenciler.webp";
import terapist from "@/assets/gallery/a-terapist.webp";

export type GalleryItem = {
  image: StaticImageData;
  /** A short label above the row, such as the area of daily life. */
  topic: Localized;
  caption: Localized;
  /** One sentence beside the picture; only what the project says or plans. */
  text: Localized;
  alt: Localized;
};

/**
 * Illustrative pictures of the printed mug in everyday life, shown on the
 * home page after the story. They are not the project's real users or
 * models. Full-size originals are kept locally in design/gallery/ (not in
 * the repository).
 */
export const gallery: GalleryItem[] = [
  {
    image: img01,
    topic: { en: "Eating and drinking", tr: "Yeme ve içme" },
    caption: { en: "Freshly printed, with two handles", tr: "Baskıdan yeni çıkmış, iki kulplu" },
    text: {
      en: "Two wide handles make the mug easier to hold with both hands or with the whole palm.",
      tr: "İki geniş kulp, kupayı iki elle ya da tüm avuçla tutmayı kolaylaştırır.",
    },
    alt: {
      en: "A hand holds a teal 3D-printed mug with two handles, fine layer lines and the 3D Care mark.",
      tr: "Bir el, ince katman çizgileri ve 3D Care işareti olan iki kulplu turkuaz bir 3D baskı kupayı tutuyor.",
    },
  },
  {
    image: img02,
    topic: { en: "Eating and drinking", tr: "Yeme ve içme" },
    caption: { en: "Morning coffee, without help", tr: "Sabah kahvesi, yardım almadan" },
    text: { en: "The morning from the story: a cup of coffee, on your own.", tr: "Hikâyedeki sabah: bir fincan kahve, kendi başına." },
    alt: {
      en: "An adult drinks steaming coffee from the teal printed mug at a wooden kitchen table.",
      tr: "Bir yetişkin, ahşap mutfak masasında turkuaz baskı kupadan dumanı tüten kahvesini içiyor.",
    },
  },
  {
    image: terapist,
    topic: { en: "Testing", tr: "Test" },
    caption: { en: "Tried out with a therapist", tr: "Bir terapistle birlikte deneniyor" },
    text: {
      en: "Every model is tried out by the people who will use it and their therapists before it is published.",
      tr: "Her model yayımlanmadan önce onu kullanacak kişiler ve terapistleri tarafından deneniyor.",
    },
    alt: {
      en: "An adult lifts the teal printed mug with both hands while a therapist beside them takes notes.",
      tr: "Bir yetişkin turkuaz baskı kupayı iki eliyle kaldırıyor, yanındaki terapist not alıyor.",
    },
  },
  {
    image: masa,
    topic: { en: "At the table", tr: "Masada" },
    caption: { en: "Within reach", tr: "Uzanınca elinin altında" },
    text: {
      en: "A handle on each side: whichever hand reaches for it, there is one to hold.",
      tr: "Her iki yanda bir kulp: hangi el uzanırsa uzansın, tutacak bir yer var.",
    },
    alt: {
      en: "A wheelchair user at a dining table reaches for the steaming teal printed mug beside a plate.",
      tr: "Yemek masasındaki tekerlekli sandalye kullanıcısı, tabağın yanındaki dumanı tüten turkuaz baskı kupaya uzanıyor.",
    },
  },
  {
    image: ogrenciler,
    topic: { en: "Education", tr: "Eğitim" },
    caption: { en: "Off the bed, into the hand", tr: "Tabladan ele" },
    text: {
      en: "The vocational schools in Ludbreg and Gölcük design and print the prototypes.",
      tr: "Ludbreg ve Gölcük'teki meslek okulları prototipleri tasarlayıp basıyor.",
    },
    alt: {
      en: "A student lifts the freshly printed teal mug off a 3D printer's bed while two classmates look on.",
      tr: "Bir öğrenci yeni basılmış turkuaz kupayı 3D yazıcının tablasından alıyor, iki arkadaşı izliyor.",
    },
  },
  {
    image: img10,
    topic: { en: "Training", tr: "Eğitim" },
    caption: { en: "A trainer introduces the printer", tr: "Eğitmen yazıcıyı tanıtıyor" },
    text: { en: "Every model comes with a guide for trainers and care staff.", tr: "Her model, eğitmenler ve bakım personeli için bir kullanım rehberiyle geliyor." },
    alt: {
      en: "A trainer shows the teal two-handled mug to a small group of adults beside a 3D printer.",
      tr: "Bir eğitmen, 3D yazıcının yanında küçük bir yetişkin grubuna turkuaz iki kulplu kupayı gösteriyor.",
    },
  },
];
