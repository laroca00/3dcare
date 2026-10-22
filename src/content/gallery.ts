import type { StaticImageData } from "next/image";
import type { Localized } from "@/i18n/config";
import img01 from "@/assets/gallery/01.webp";
import img02 from "@/assets/gallery/02.webp";
import img03 from "@/assets/gallery/03.webp";
import img04 from "@/assets/gallery/04.webp";
import img05 from "@/assets/gallery/05.webp";
import img06 from "@/assets/gallery/06.webp";
import img08 from "@/assets/gallery/08.webp";
import img09 from "@/assets/gallery/09.webp";
import img10 from "@/assets/gallery/10.webp";

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
 * Illustrative pictures of printed aids in everyday life, shown on the home
 * page after the story. They are not the project's real users or models.
 * Full-size originals are kept locally in design/gallery/ (not in the repository).
 */
export const gallery: GalleryItem[] = [
  {
    image: img01,
    topic: { en: "Eating and drinking", tr: "Yeme ve içme" },
    text: { en: "Two wide handles make the mug easier to hold with both hands or with the whole palm.", tr: "İki geniş kulp, kupayı iki elle ya da tüm avuçla tutmayı kolaylaştırır." },
    caption: { en: "Freshly printed, with two handles", tr: "Baskıdan yeni çıkmış, iki kulplu" },
    alt: {
      en: "A hand holds a teal 3D-printed mug with two handles, fine layer lines and the 3D Care mark.",
      tr: "Bir el, ince katman çizgileri ve 3D Care işareti olan iki kulplu turkuaz bir 3D baskı kupayı tutuyor.",
    },
  },
  {
    image: img02,
    topic: { en: "Eating and drinking", tr: "Yeme ve içme" },
    text: { en: "The morning from the story: a cup of coffee, on your own.", tr: "Hikâyedeki sabah: bir fincan kahve, kendi başına." },
    caption: { en: "Morning coffee, without help", tr: "Sabah kahvesi, yardım almadan" },
    alt: {
      en: "An adult drinks steaming coffee from the teal printed mug at a wooden kitchen table.",
      tr: "Bir yetişkin, ahşap mutfak masasında turkuaz baskı kupadan dumanı tüten kahvesini içiyor.",
    },
  },
  {
    image: img04,
    topic: { en: "At home", tr: "Evde" },
    text: { en: "A wide handle turns the key with the whole hand instead of two fingertips.", tr: "Geniş bir tutamak, anahtarı iki parmak ucu yerine tüm elle çevirmeyi sağlar." },
    caption: { en: "A wide grip for turning a key", tr: "Anahtarı çevirmek için geniş bir tutamak" },
    alt: {
      en: "A hand turns a house key held in a wide, teal printed key turner.",
      tr: "Bir el, geniş ve turkuaz bir baskı anahtar tutucuya takılı ev anahtarını çeviriyor.",
    },
  },
  {
    image: img03,
    topic: { en: "Testing", tr: "Test" },
    text: { en: "Every model is tried out by the people who will use it and their therapists before it is published.", tr: "Her model yayımlanmadan önce onu kullanacak kişiler ve terapistleri tarafından deneniyor." },
    caption: { en: "Tried out with a therapist", tr: "Bir terapistle birlikte deneniyor" },
    alt: {
      en: "An older adult tries a spoon with a thick teal printed handle while a therapist takes notes.",
      tr: "Yaşlı bir yetişkin kalın turkuaz baskı saplı bir kaşığı deniyor, bir terapist not alıyor.",
    },
  },
  {
    image: img05,
    topic: { en: "Eating and drinking", tr: "Yeme ve içme" },
    text: { en: "A raised rim keeps the food on the plate, so it can be eaten with one hand.", tr: "Yükseltilmiş kenar yemeği tabakta tutar; tek elle yemek kolaylaşır." },
    caption: { en: "Eating with a plate guard", tr: "Tabak kenarlığıyla yemek" },
    alt: {
      en: "A wheelchair user eats lunch from a plate with a teal printed plate guard on its edge.",
      tr: "Tekerlekli sandalye kullanan biri, kenarına turkuaz baskı kenarlık takılmış tabaktan öğle yemeğini yiyor.",
    },
  },
  {
    image: img06,
    topic: { en: "Education", tr: "Eğitim" },
    text: { en: "The vocational schools in Ludbreg and Gölcük design and print the prototypes.", tr: "Ludbreg ve Gölcük'teki meslek okulları prototipleri tasarlayıp basıyor." },
    caption: { en: "Printing at a vocational school", tr: "Meslek okulunda baskı" },
    alt: {
      en: "Students gather round an open-frame 3D printer printing a small teal part.",
      tr: "Öğrenciler, küçük turkuaz bir parça basan açık çerçeveli bir 3D yazıcının başında toplanmış.",
    },
  },
  {
    image: img09,
    topic: { en: "Printing", tr: "Baskı" },
    text: { en: "Each layer is about 0.3 mm, so a mug is built from a few hundred of them.", tr: "Her katman yaklaşık 0,3 mm; bir kupa birkaç yüz katmandan oluşur." },
    caption: { en: "Layers of 0.3 mm", tr: "0,3 milimetrelik katmanlar" },
    alt: {
      en: "Close-up of a teal printed wall: fine horizontal layer lines catching warm light.",
      tr: "Turkuaz bir baskı yüzeyinin yakın çekimi: sıcak ışığı yakalayan ince yatay katman çizgileri.",
    },
  },
  {
    image: img08,
    topic: { en: "Material", tr: "Malzeme" },
    text: { en: "The schools are trying biodegradable and recycled filaments.", tr: "Okullar biyobozunur ve geri dönüştürülmüş filamentleri deniyor." },
    caption: { en: "Greener filaments are being tried", tr: "Daha yeşil filamentler deneniyor" },
    alt: {
      en: "A spool of teal filament on a cream table beside dried corn husks, with leaf shadows.",
      tr: "Krem bir masada kuru mısır yapraklarının yanında turkuaz bir filament makarası, üzerine yaprak gölgeleri düşüyor.",
    },
  },
  {
    image: img10,
    topic: { en: "Training", tr: "Eğitim" },
    text: { en: "Every model comes with a guide for trainers and care staff.", tr: "Her model, eğitmenler ve bakım personeli için bir kullanım rehberiyle geliyor." },
    caption: { en: "A trainer introduces the printer", tr: "Eğitmen yazıcıyı tanıtıyor" },
    alt: {
      en: "A trainer shows the teal two-handled mug to a small group of adults beside a 3D printer.",
      tr: "Bir eğitmen, 3D yazıcının yanında küçük bir yetişkin grubuna turkuaz iki kulplu kupayı gösteriyor.",
    },
  },
];
