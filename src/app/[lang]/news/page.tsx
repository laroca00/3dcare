import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NewsList } from "@/components/NewsList";
import { posts } from "@/content/news";
import { getDictionary, hasLocale } from "@/i18n/config";

export async function generateMetadata({ params }: PageProps<"/[lang]/news">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: getDictionary(lang).news.title } : {};
}

export default async function NewsPage({ params }: PageProps<"/[lang]/news">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang).news;

  return (
    <div className="container page">
      <h1>{t.title}</h1>
      <p className="lead">{t.lead}</p>
      <NewsList lang={lang} posts={posts} headingLevel={2} />
    </div>
  );
}
