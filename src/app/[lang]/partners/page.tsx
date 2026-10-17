import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { partners } from "@/content/partners";
import { getDictionary, hasLocale } from "@/i18n/config";

export async function generateMetadata({ params }: PageProps<"/[lang]/partners">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: getDictionary(lang).partners.title } : {};
}

export default async function PartnersPage({ params }: PageProps<"/[lang]/partners">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang).partners;

  return (
    <div className="container page">
      <h1>{t.title}</h1>
      <p className="lead">{t.lead}</p>
      <ul className="partner-list">
        {partners.map((p) => (
          <li key={p.name}>
            <p className="partner-list__place">
              {p.city}, {p.country[lang]}
              {p.coordinator && <span className="tag tag--template">{t.coordinator}</span>}
            </p>
            <h2>{p.name}</h2>
            <p className="partner-list__type">{p.type[lang]}</p>
            <p>{p.role[lang]}</p>
            {p.website && (
              <p>
                <a href={p.website}>
                  {t.website}
                  <span className="visually-hidden">: {p.name}</span>
                </a>
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
