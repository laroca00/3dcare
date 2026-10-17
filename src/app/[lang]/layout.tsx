import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getDictionary, hasLocale, locales } from "@/i18n/config";
import "@fontsource-variable/inter";
import "../globals.css";

// GoatCounter site code (the "xxx" in xxx.goatcounter.com). Statistics stay off until it is set.
const GOATCOUNTER_CODE = process.env.NEXT_PUBLIC_GOATCOUNTER_CODE;

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
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang);

  return (
    <html lang={lang}>
      <body>
        <SiteHeader lang={lang} t={t} />
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter lang={lang} t={t} />
        {GOATCOUNTER_CODE && (
          <Script
            src="https://gc.zgo.at/count.js"
            data-goatcounter={`https://${GOATCOUNTER_CODE}.goatcounter.com/count`}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
