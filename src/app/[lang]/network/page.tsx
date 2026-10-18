import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "@/i18n/config";

export async function generateMetadata({ params }: PageProps<"/[lang]/network">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: getDictionary(lang).network.title } : {};
}

export default async function NetworkPage({ params }: PageProps<"/[lang]/network">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang).network;

  const lists = [
    ["who", t.whoTitle, t.who],
    ["get", t.getTitle, t.get],
    ["ask", t.askTitle, t.ask],
  ] as const;

  return (
    <div className="container page prose">
      <h1>{t.title}</h1>
      <p className="lead">{t.lead}</p>
      {lists.map(([id, title, items]) => (
        <section key={id} aria-labelledby={id}>
          <h2 id={id}>{title}</h2>
          <ul>
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {id === "get" && <p className="notice">{t.kits}</p>}
        </section>
      ))}
      <section aria-labelledby="join">
        <h2 id="join">{t.joinTitle}</h2>
        <p>{t.join}</p>
        <p className="actions">
          <Link href={`/${lang}/contact/`} className="btn btn--primary">
            {t.contact}
          </Link>
        </p>
      </section>
    </div>
  );
}
