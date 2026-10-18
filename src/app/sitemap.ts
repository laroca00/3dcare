import type { MetadataRoute } from "next";
import { models } from "@/content/models";
import { posts } from "@/content/news";
import { locales } from "@/i18n/config";
import { SITE_URL } from "@/site";

export const dynamic = "force-static";

const pages = [
  "",
  "models/",
  ...models.map((m) => `models/${m.slug}/`),
  "training/",
  "resources/",
  "news/",
  ...posts.map((p) => `news/${p.slug}/`),
  "about/",
  "partners/",
  "network/",
  "contact/",
  "privacy/",
  "accessibility/",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return pages.flatMap((page) =>
    locales.map((lang) => ({
      url: `${SITE_URL}/${lang}/${page}`,
      alternates: {
        languages: Object.fromEntries(locales.map((l) => [l, `${SITE_URL}/${l}/${page}`])),
      },
    })),
  );
}
