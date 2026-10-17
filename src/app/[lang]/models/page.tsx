import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ModelPreview } from "@/components/ModelPreview";
import { models } from "@/content/models";
import { getDictionary, hasLocale } from "@/i18n/config";

export async function generateMetadata({ params }: PageProps<"/[lang]/models">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: getDictionary(lang).models.title } : {};
}

export default async function ModelsPage({ params }: PageProps<"/[lang]/models">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang).models;

  return (
    <div className="container page">
      <h1>{t.title}</h1>
      <p className="lead">{t.lead}</p>
      <ul className="model-list">
        {models.map((m) => (
          <li key={m.slug} className="model-item">
            <ModelPreview slug={m.slug} label={`${t.previewLabel}: ${m.name[lang]}`} />
            <div>
              <h2>
                <Link href={`/${lang}/models/${m.slug}/`}>{m.name[lang]}</Link>
              </h2>
              <p>{m.summary[lang]}</p>
              <p className="tags">
                {m.template && <span className="tag tag--template">{t.template}</span>}
                <span className="tag">{m.use[lang]}</span>
                <span className="tag">{t.levels[m.difficulty]}</span>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
