import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "@/i18n/config";

export async function generateMetadata({ params }: PageProps<"/[lang]/accessibility">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: getDictionary(lang).accessibility.title } : {};
}

export default async function AccessibilityPage({ params }: PageProps<"/[lang]/accessibility">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang).accessibility;

  return (
    <div className="container page prose">
      <h1>{t.title}</h1>
      {t.body.map((p) => (
        <p key={p}>{p}</p>
      ))}
    </div>
  );
}
