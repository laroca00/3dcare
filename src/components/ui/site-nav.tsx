"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Dictionary, Locale } from "@/i18n/config";
import { LogoMark } from "../Logo";

// The mobile menu (Radix dialog) loads only when it is first opened, so its
// code stays out of every page load.
const MobileMenu = React.lazy(() => import("./mobile-menu"));

type Item = { href: string; label: string };

const sheetLinkClass =
  "block rounded-full px-4 py-3 text-base font-medium text-muted-foreground no-underline transition-colors hover:text-foreground aria-[current=page]:bg-accent aria-[current=page]:text-foreground";

/**
 * The site's main navigation: the logo at the top left and the links in small
 * capitals at the top right, lying straight on the page with no bar behind
 * them. On narrow screens the links open in a side sheet.
 */
export function SiteNav({ lang, items, t }: { lang: Locale; items: Item[]; t: Dictionary["nav"] }) {
  const pathname = usePathname();
  const other: Locale = lang === "en" ? "tr" : "en";
  const switchHref = pathname.replace(new RegExp(`^/${lang}(?=/|$)`), `/${other}`);
  const isActive = (href: string) => `${pathname.replace(/\/$/, "")}/`.startsWith(href);
  const isHome = pathname.replace(/\/$/, "") === `/${lang}`;

  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [sheetLoaded, setSheetLoaded] = React.useState(false);
  const menuButton = React.useRef<HTMLButtonElement>(null);

  return (
    <div className="site-nav">
      <Link href={`/${lang}/`} className="site-nav__brand" aria-current={isHome ? "page" : undefined}>
        <LogoMark className="site-nav__mark" />
        3D Care
        <span className="visually-hidden">{t.home}</span>
      </Link>
      <nav aria-label={t.menu} className="site-nav__links">
        <ul>
          {items.map((item) => (
            <li key={item.href}>
              <Link href={item.href} aria-current={isActive(item.href) ? "page" : undefined}>
                {item.label}
              </Link>
            </li>
          ))}
          <li>
            <Link href={switchHref} hrefLang={other} lang={other}>
              {t.language}
            </Link>
          </li>
        </ul>
      </nav>
      <button
        ref={menuButton}
        type="button"
        className="site-nav__menu"
        aria-haspopup="dialog"
        aria-expanded={sheetOpen}
        onClick={() => {
          setSheetLoaded(true);
          setSheetOpen(true);
        }}
      >
        {t.menu}
      </button>
      {sheetLoaded && (
        <React.Suspense fallback={null}>
          <MobileMenu
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            onCloseAutoFocus={(event) => {
              // No Radix trigger here, so hand focus back to the menu button.
              event.preventDefault();
              menuButton.current?.focus();
            }}
            items={items.map((item) => ({ ...item, active: isActive(item.href) }))}
            language={
              <Link href={switchHref} hrefLang={other} lang={other} className={`${sheetLinkClass} font-semibold text-foreground`}>
                {t.language}
              </Link>
            }
            linkClass={sheetLinkClass}
            menuLabel={t.menu}
            closeLabel={t.close}
          />
        </React.Suspense>
      )}
    </div>
  );
}
