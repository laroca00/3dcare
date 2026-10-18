import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TapedFooter } from "@/components/ui/footer-taped-design";
import { PageViews } from "@/components/PageViews";
import { SiteHeader } from "@/components/SiteHeader";
import { getDictionary, hasLocale, locales } from "@/i18n/config";
import { shareImage } from "@/site";
import { themeInitScript } from "@/theme/theme";
import { FontFaces } from "../FontFaces";
import "../globals.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const t = getDictionary(lang);
  return {
    title: { default: t.meta.title, template: `%s | 3D Care` },
    description: t.meta.description,
    openGraph: {
      type: "website",
      siteName: "3D Care",
      locale: lang === "tr" ? "tr_TR" : "en_GB",
      title: t.meta.title,
      description: t.meta.description,
      images: shareImage(lang, t.meta.title),
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang);

  return (
    // The pre-paint script sets data-theme before React hydrates.
    <html lang={lang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <FontFaces extended={lang === "tr"} />
      </head>
      <body>
        <SiteHeader lang={lang} t={t} />
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <TapedFooter lang={lang} t={t} />
        <PageViews />
      </body>
    </html>
  );
}
