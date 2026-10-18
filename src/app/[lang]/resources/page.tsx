import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { resources } from "@/content/resources";
import { getDictionary, hasLocale } from "@/i18n/config";

// Plain links to files in public/ are not prefixed by Next.js.
const basePath = process.env.BASE_PATH ?? "";

export async function generateMetadata({ params }: PageProps<"/[lang]/resources">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: getDictionary(lang).resources.title } : {};
}

export default async function ResourcesPage({ params }: PageProps<"/[lang]/resources">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang).resources;

  return (
    <div className="container page">
      <h1>{t.title}</h1>
      <p className="lead">{t.lead}</p>
      <ul className="resource-list">
        {resources.map((r) => (
          <li key={r.id}>
            <p className="tags">
              <span className={r.files ? "tag tag--available" : "tag"}>{r.files ? t.available : t.planned}</span>
              <span className="tag">
                {t.wp} {r.wp}
              </span>
            </p>
            <h2>{r.title[lang]}</h2>
            <p>{r.text[lang]}</p>
            {r.files && (
              <ul className="resource-list__files">
                {r.files.map((f) => (
                  <li key={f.path}>
                    <a href={`${basePath}${f.path}`} download>
                      {t.download}: {f.label[lang]}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {r.page && (
              <p>
                <Link href={`/${lang}/${r.page}/`}>{t.links[r.page]}</Link>
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
