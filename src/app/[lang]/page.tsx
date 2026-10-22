import Link from "next/link";
import { Gallery } from "@/components/Gallery";
import { HomeStory } from "@/components/HomeStory";
import { Unboxing } from "@/components/Unboxing";
import { NewsList } from "@/components/NewsList";
import { posts } from "@/content/news";
import { partners } from "@/content/partners";
import { getDictionary, hasLocale } from "@/i18n/config";
import { notFound } from "next/navigation";

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang).home;

  return (
    <>
      <HomeStory lang={lang} t={t} />

      <Unboxing lang={lang} t={t} />

      <Gallery lang={lang} t={t} />

      <section className="section container" aria-labelledby="process">
        <h2 id="process">{t.processTitle}</h2>
        <ol className="process">
          {t.process.map((step) => (
            <li key={step.title}>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="section container" aria-labelledby="partners">
        <h2 id="partners">{t.partnersTitle}</h2>
        <ul className="partner-strip">
          {partners.map((p) => (
            <li key={p.name}>
              <span className="partner-strip__name">{p.shortName}</span>
              <span className="partner-strip__country">{p.country[lang]}</span>
            </li>
          ))}
        </ul>
        <p>
          <Link href={`/${lang}/partners/`}>{t.partnersLink}</Link>
        </p>
      </section>

      <section className="section container" aria-labelledby="news">
        <h2 id="news">{t.newsTitle}</h2>
        <NewsList lang={lang} posts={posts.slice(0, 3)} headingLevel={3} />
        <p>
          <Link href={`/${lang}/news/`}>{t.newsLink}</Link>
        </p>
      </section>

      <section className="section container" aria-labelledby="network">
        <div className="callout">
          <h2 id="network">{t.networkTitle}</h2>
          <p>{t.networkText}</p>
          <p className="actions">
            <Link href={`/${lang}/network/`} className="btn btn--primary">
              {t.networkLink}
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
