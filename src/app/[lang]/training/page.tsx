import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "@/i18n/config";

export async function generateMetadata({ params }: PageProps<"/[lang]/training">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: getDictionary(lang).training.title } : {};
}

export default async function TrainingPage({ params }: PageProps<"/[lang]/training">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang).training;

  return (
    <div className="container page prose">
      <h1>{t.title}</h1>
      <p className="lead">{t.lead}</p>
      <h2>{t.plannedTitle}</h2>
      <ul>
        {t.planned.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="notice">{t.when}</p>
    </div>
  );
}
