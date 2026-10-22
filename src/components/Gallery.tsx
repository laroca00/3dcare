import Image from "next/image";
import { gallery } from "@/content/gallery";
import type { Locale } from "@/i18n/config";

/** Pictures of printed aids in everyday life, after the home story. */
export function Gallery({ lang, title, note }: { lang: Locale; title: string; note: string }) {
  return (
    <section className="section container" aria-labelledby="gallery">
      <h2 id="gallery">{title}</h2>
      <ul className="gallery">
        {gallery.map((item) => (
          <li key={item.image.src}>
            <figure>
              <Image src={item.image} alt={item.alt[lang]} sizes="(min-width: 900px) 33vw, (min-width: 600px) 50vw, 100vw" />
              <figcaption>{item.caption[lang]}</figcaption>
            </figure>
          </li>
        ))}
      </ul>
      <p className="gallery__note">{note}</p>
    </section>
  );
}
