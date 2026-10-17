import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "@/i18n/config";

export async function generateMetadata({ params }: PageProps<"/[lang]/about">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: getDictionary(lang).about.title } : {};
}

export default async function AboutPage({ params }: PageProps<"/[lang]/about">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang).about;

  return (
    <div className="container page prose">
      <h1>{t.title}</h1>
      <p className="lead">{t.lead}</p>
      <h2>{t.problemTitle}</h2>
      <p>{t.problem}</p>
      <h2>{t.goalTitle}</h2>
      <p>{t.goal}</p>
      <h2>{t.wpTitle}</h2>
      <ol className="work-packages">
        {t.workPackages.map((wp) => (
          <li key={wp.name}>
            <strong>{wp.name}</strong>
            <span>
              {t.leadLabel}: {wp.lead}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
