import type { StaticImageData } from "next/image";
import type { Localized } from "@/i18n/config";
import kahraman from "@/assets/gallery/b-kahraman.webp";
import katmanlar from "@/assets/gallery/b-katmanlar.webp";
import makro from "@/assets/gallery/b-makro.webp";
import malzeme from "@/assets/gallery/b-malzeme.webp";
import renkler from "@/assets/gallery/b-renkler.webp";
import tabla from "@/assets/gallery/b-tabla.webp";
import tarih from "@/assets/gallery/b-tarih.webp";
import tutma from "@/assets/gallery/b-tutma.webp";

export type UnboxingCard = {
  image: StaticImageData;
  title: Localized;
  /** A short spec line under the title, in capitals on the page. */
  spec: Localized;
  alt: Localized;
};

/**
 * The pictures that come out of the mug's box, as a strip of cards that
 * scrolls past: what the mug is, how it is printed, its colours and grips.
 * Illustrative pictures; every spec line is true for the mug in the story.
 */
export const unboxingCards: UnboxingCard[] = [
  {
    image: kahraman,
    title: { en: "Two handles", tr: "İki kulp" },
    spec: { en: "One for each hand, or both for the whole palm", tr: "Her ele bir tane, ya da ikisi birden tüm avuca" },
    alt: { en: "The teal printed mug with two handles on a yellow backdrop in hard sunlight.", tr: "Sert güneş ışığında sarı fonda iki kulplu turkuaz baskı kupa." },
  },
  {
    image: katmanlar,
    title: { en: "About 300 layers", tr: "Yaklaşık 300 katman" },
    spec: { en: "Each one 0.3 mm", tr: "Her biri 0,3 mm" },
    alt: { en: "The mug pulled apart into its thin printed layers, floating in a stack on violet.", tr: "Kupa ince baskı katmanlarına ayrılmış, mor fonda üst üste havada duruyor." },
  },
  {
    image: tarih,
    title: { en: "An old idea", tr: "Eski bir fikir" },
    spec: {
      en: "Troy c. 2500 BCE · Greece 6th c. BCE · Rome 1st c. CE · 3D Care 2026",
      tr: "Truva MÖ 2500 · Yunan MÖ 6. yy · Roma MS 1. yy · 3D Care 2026",
    },
    alt: {
      en: "Four two-handled drinking vessels in a row on a museum plinth: a Bronze Age goblet from Troy, a Greek kantharos, a Roman glass cup and the teal printed mug.",
      tr: "Müze kaidesinde yan yana dört iki kulplu içki kabı: Truva'dan Tunç Çağı kadehi, Yunan kantharosu, Roma cam kabı ve turkuaz baskı kupa.",
    },
  },
  {
    image: renkler,
    title: { en: "Five colours", tr: "Beş renk" },
    spec: { en: "Teal · violet · yellow · white · coral", tr: "Turkuaz · mor · sarı · beyaz · mercan" },
    alt: { en: "The printed mug stacked in teal, violet, yellow, white and coral.", tr: "Turkuaz, mor, sarı, beyaz ve mercan renklerinde üst üste konmuş baskı kupalar." },
  },
  {
    image: tutma,
    title: { en: "Three grips", tr: "Üç tutma şekli" },
    spec: { en: "Two handles · one handle · T-grip", tr: "İki kulp · tek kulp · T tutamak" },
    alt: { en: "Three teal printed mugs side by side: with two handles, one handle and two T-grips.", tr: "Yan yana üç turkuaz baskı kupa: iki kulplu, tek kulplu ve iki T tutamaklı." },
  },
  {
    image: tabla,
    title: { en: "Just off the bed", tr: "Tabladan yeni çıktı" },
    spec: { en: "Still warm", tr: "Hâlâ sıcak" },
    alt: { en: "The teal mug on a 3D printer's bed just after printing, the print head lifted above it.", tr: "Baskıdan hemen sonra 3D yazıcının tablasında turkuaz kupa, baskı kafası üstünde yükselmiş." },
  },
  {
    image: makro,
    title: { en: "0.3 mm", tr: "0,3 mm" },
    spec: { en: "Layer by layer", tr: "Katman katman" },
    alt: { en: "Close-up of the mug's wall: fine horizontal layer lines catching warm light.", tr: "Kupa duvarının yakın çekimi: sıcak ışığı yakalayan ince yatay katman çizgileri." },
  },
  {
    image: malzeme,
    title: { en: "Material", tr: "Malzeme" },
    spec: { en: "Biodegradable and recycled filaments are being tried", tr: "Biyobozunur ve geri dönüştürülmüş filamentler deneniyor" },
    alt: { en: "The teal mug beside a spool of teal filament on a cream table with leaf shadows.", tr: "Yaprak gölgeli krem bir masada, turkuaz filament makarasının yanında turkuaz kupa." },
  },
];
