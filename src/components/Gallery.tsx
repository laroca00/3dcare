import Image from "next/image";
import { gallery } from "@/content/gallery";
import type { Dictionary, Locale } from "@/i18n/config";

/**
 * Pictures of printed aids in everyday life, after the home story: a large
 * title, then a table of rows split by dashed lines, each with a line of text
 * on the left and its picture on the right, which grows in from its top
 * right corner as it scrolls into view.
 */
export function Gallery({ lang, t }: { lang: Locale; t: Dictionary["home"] }) {
  return (
    <section className="section container gallery" aria-labelledby="gallery-title">
      <div className="gallery__hero">
        <h2 id="gallery-title">{t.galleryTitle}</h2>
        <p className="gallery__lead">{t.galleryLead}</p>
      </div>
      <p className="gallery__header" aria-hidden="true">
        <span>{t.galleryHeader.left}</span>
        <span>
          [ {gallery.length} ] {t.galleryHeader.scenes}
        </span>
        <span>{t.galleryHeader.right}</span>
      </p>
      <ol className="gallery__list">
        {gallery.map((item, i) => (
          <li key={item.image.src} className="gallery__row">
            <div className="gallery__text">
              <p className="gallery__topic">
                [ {String(i + 1).padStart(2, "0")} ] {item.topic[lang]}
              </p>
              <h3>{item.caption[lang]}</h3>
              <p>{item.text[lang]}</p>
            </div>
            <div className="gallery__picture">
              <Image src={item.image} alt={item.alt[lang]} sizes="(min-width: 900px) 45vw, 100vw" />
            </div>
          </li>
        ))}
      </ol>
      <p className="gallery__note">{t.galleryNote}</p>
    </section>
  );
}
