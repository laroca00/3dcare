import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate, getPost, posts } from "@/content/news";
import { getDictionary, hasLocale } from "@/i18n/config";
import { shareImage } from "@/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/news/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const post = getPost(slug);
  if (!hasLocale(lang) || !post) return {};
  return {
    title: post.title[lang],
    description: post.summary[lang],
    // Replaces the layout's share card, so the image is repeated here.
    openGraph: {
      type: "article",
      siteName: "3D Care",
      title: post.title[lang],
      description: post.summary[lang],
      publishedTime: post.date,
      images: shareImage(lang, post.title[lang]),
    },
  };
}

export default async function PostPage({ params }: PageProps<"/[lang]/news/[slug]">) {
  const { lang, slug } = await params;
  const post = getPost(slug);
  if (!hasLocale(lang) || !post) notFound();
  const t = getDictionary(lang).news;

  return (
    <article className="container page prose">
      <p>
        <Link href={`/${lang}/news/`}>{t.back}</Link>
      </p>
      <h1>{post.title[lang]}</h1>
      <p className="small">
        {t.published}: <time dateTime={post.date}>{formatDate(post.date, lang)}</time>
      </p>
      <p className="lead">{post.summary[lang]}</p>
      {post.body[lang].map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </article>
  );
}
