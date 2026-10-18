import Link from "next/link";
import { formatDate, type Post } from "@/content/news";
import type { Locale } from "@/i18n/config";

export function NewsList({ lang, posts, headingLevel }: { lang: Locale; posts: Post[]; headingLevel: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <ul className="news-list">
      {posts.map((post) => (
        <li key={post.slug}>
          <time dateTime={post.date}>{formatDate(post.date, lang)}</time>
          <Heading>
            <Link href={`/${lang}/news/${post.slug}/`}>{post.title[lang]}</Link>
          </Heading>
          <p>{post.summary[lang]}</p>
        </li>
      ))}
    </ul>
  );
}
