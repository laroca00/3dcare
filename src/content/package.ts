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

export type PackageCard = {
  image: StaticImageData;
  title: Localized;
  /** A short line under the title, in capitals on the page. */
  note: Localized;
  alt: Localized;
};

/**
 * What comes out of the open model package at the end of "design and print":
 * how a model is shared, printed, adapted and tested. Illustrative pictures;
 * every line follows the project application.
 */
export const packageCards: PackageCard[] = [
  {
    image: kahraman,
    title: { en: "An open file", tr: "Açık bir dosya" },
    note: { en: "Free to download, print and adapt", tr: "Ücretsiz indir, bas, uyarla" },
    alt: { en: "The teal printed mug with two handles on a yellow backdrop in hard sunlight.", tr: "Sert güneş ışığında sarı fonda iki kulplu turkuaz baskı kupa." },
  },
  {
    image: tutma,
    title: { en: "Adapted to the hand", tr: "Ele göre uyarlanır" },
    note: { en: "Two handles · one handle · T-grip", tr: "İki kulp · tek kulp · T tutamak" },
    alt: { en: "Three teal printed mugs side by side: with two handles, one handle and two T-grips.", tr: "Yan yana üç turkuaz baskı kupa: iki kulplu, tek kulplu ve iki T tutamaklı." },
  },
  {
    image: katmanlar,
    title: { en: "Print settings included", tr: "Baskı ayarları içinde" },
    note: { en: "About 300 layers of 0.3 mm", tr: "0,3 mm'lik yaklaşık 300 katman" },
    alt: { en: "The mug pulled apart into its thin printed layers, floating in a stack on violet.", tr: "Kupa ince baskı katmanlarına ayrılmış, mor fonda üst üste havada duruyor." },
  },
  {
    image: tabla,
    title: { en: "Printed at the centre", tr: "Merkezde basılır" },
    note: { en: "On a low-cost desktop printer", tr: "Düşük maliyetli bir masaüstü yazıcıda" },
    alt: { en: "The teal mug on a 3D printer's bed just after printing, the print head lifted above it.", tr: "Baskıdan hemen sonra 3D yazıcının tablasında turkuaz kupa, baskı kafası üstünde yükselmiş." },
  },
  {
    image: renkler,
    title: { en: "With the filament at hand", tr: "Eldeki filamentle" },
    note: { en: "The colour is up to the centre", tr: "Renk merkezin seçimi" },
    alt: { en: "The printed mug stacked in teal, violet, yellow, white and coral.", tr: "Turkuaz, mor, sarı, beyaz ve mercan renklerinde üst üste konmuş baskı kupalar." },
  },
  {
    image: makro,
    title: { en: "Checked layer by layer", tr: "Katman katman kontrol" },
    note: { en: "Testing and quality steps in the guide", tr: "Test ve kalite adımları rehberde" },
    alt: { en: "Close-up of the mug's wall: fine horizontal layer lines catching warm light.", tr: "Kupa duvarının yakın çekimi: sıcak ışığı yakalayan ince yatay katman çizgileri." },
  },
  {
    image: malzeme,
    title: { en: "Greener materials", tr: "Daha yeşil malzemeler" },
    note: { en: "Biodegradable and recycled filaments are being tried", tr: "Biyobozunur ve geri dönüştürülmüş filamentler deneniyor" },
    alt: { en: "The teal mug beside a spool of teal filament on a cream table with leaf shadows.", tr: "Yaprak gölgeli krem bir masada, turkuaz filament makarasının yanında turkuaz kupa." },
  },
  {
    image: tarih,
    title: { en: "An old idea, shared again", tr: "Eski bir fikir, yeniden paylaşılıyor" },
    note: { en: "Troy c. 2500 BCE · Greece 6th c. BCE · Rome 1st c. CE · 2026", tr: "Truva MÖ 2500 · Yunan MÖ 6. yy · Roma MS 1. yy · 2026" },
    alt: {
      en: "Four two-handled drinking vessels in a row on a museum plinth: a Bronze Age goblet from Troy, a Greek kantharos, a Roman glass cup and the teal printed mug.",
      tr: "Müze kaidesinde yan yana dört iki kulplu içki kabı: Truva'dan Tunç Çağı kadehi, Yunan kantharosu, Roma cam kabı ve turkuaz baskı kupa.",
    },
  },
];
