import type { Dictionary, Locale } from "@/i18n/config";
import { AnimatedNav } from "./ui/animated-nav";

export function SiteHeader({ lang, t }: { lang: Locale; t: Dictionary }) {
  const items = [
    { href: `/${lang}/models/`, label: t.nav.models },
    { href: `/${lang}/training/`, label: t.nav.training },
    { href: `/${lang}/resources/`, label: t.nav.resources },
    { href: `/${lang}/news/`, label: t.nav.news },
    { href: `/${lang}/about/`, label: t.nav.about },
    { href: `/${lang}/partners/`, label: t.nav.partners },
    { href: `/${lang}/contact/`, label: t.nav.contact },
  ];

  return (
    <header className="site-header">
      <a href="#main" className="skip-link">
        {t.nav.skip}
      </a>
      <AnimatedNav lang={lang} items={items} t={t.nav} />
    </header>
  );
}
