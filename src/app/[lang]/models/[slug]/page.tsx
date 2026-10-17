import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ModelPreview } from "@/components/ModelPreview";
import { getModel, models } from "@/content/models";
import { getDictionary, hasLocale } from "@/i18n/config";

export const dynamicParams = false;

export function generateStaticParams() {
  return models.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/models/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const model = getModel(slug);
  return hasLocale(lang) && model ? { title: model.name[lang] } : {};
}

export default async function ModelPage({ params }: PageProps<"/[lang]/models/[slug]">) {
  const { lang, slug } = await params;
  const model = getModel(slug);
  if (!hasLocale(lang) || !model) notFound();
  const t = getDictionary(lang).models;

  const settings = [
    [t.material, model.material],
    [t.layer, model.layer],
    [t.infill, model.infill],
    [t.printTime, model.printTime],
    [t.difficulty, t.levels[model.difficulty]],
  ];

  return (
    <article className="container page model-page">
      <p>
        <Link href={`/${lang}/models/`}>{t.back}</Link>
      </p>
      <div className="model-page__head">
        <div>
          <h1>{model.name[lang]}</h1>
          <p className="tags">
            {model.template && <span className="tag tag--template">{t.template}</span>}
            <span className="tag">{t.status}</span>
          </p>
          <p className="lead">{model.summary[lang]}</p>
          <dl className="facts">
            <div>
              <dt>{t.use}</dt>
              <dd>{model.use[lang]}</dd>
            </div>
            <div>
              <dt>{t.users}</dt>
              <dd>{model.users[lang]}</dd>
            </div>
          </dl>
        </div>
        <ModelPreview slug={model.slug} label={`${t.previewLabel}: ${model.name[lang]}`} large />
      </div>

      <dl className="settings">
        {settings.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="download">
        <h2 id="download">{t.download}</h2>
        <p className="notice">{t.downloadPending}</p>
      </section>

      <section aria-labelledby="safety">
        <h2 id="safety">{t.safetyTitle}</h2>
        <p className="notice">{t.safetyPending}</p>
      </section>
    </article>
  );
}
