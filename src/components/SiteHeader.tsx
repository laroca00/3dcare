import Link from "next/link";
import type { Dictionary, Locale } from "@/i18n/config";
import { LogoMark } from "./Logo";
import { SiteNav } from "./SiteNav";

export function SiteHeader({ lang, t }: { lang: Locale; t: Dictionary }) {
  const items = [
    { href: `/${lang}/models/`, label: t.nav.models },
    { href: `/${lang}/training/`, label: t.nav.training },
    { href: `/${lang}/about/`, label: t.nav.about },
    { href: `/${lang}/partners/`, label: t.nav.partners },
    { href: `/${lang}/contact/`, label: t.nav.contact },
  ];

  return (
    <header className="site-header">
      <a href="#main" className="skip-link">
        {t.nav.skip}
      </a>
      <div className="container site-header__inner">
        <Link href={`/${lang}/`} className="brand">
          <LogoMark className="brand__mark" />
          <span>3D Care</span>
          <span className="visually-hidden">{t.nav.home}</span>
        </Link>
        <SiteNav lang={lang} items={items} menuLabel={t.nav.menu} switchLabel={t.nav.language} />
      </div>
    </header>
  );
}
