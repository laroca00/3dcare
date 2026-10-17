"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n/config";

type Item = { href: string; label: string };

export function SiteNav({
  lang,
  items,
  menuLabel,
  switchLabel,
}: {
  lang: Locale;
  items: Item[];
  menuLabel: string;
  switchLabel: string;
}) {
  const pathname = usePathname();
  const other: Locale = lang === "en" ? "tr" : "en";
  const switchHref = pathname.replace(new RegExp(`^/${lang}(?=/|$)`), `/${other}`);

  return (
    <nav aria-label={menuLabel} className="site-nav">
      <ul>
        {items.map((item) => {
          const active = `${pathname.replace(/\/$/, "")}/`.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link href={item.href} aria-current={active ? "page" : undefined}>
                {item.label}
              </Link>
            </li>
          );
        })}
        <li>
          <Link href={switchHref} hrefLang={other} lang={other} className="lang-switch">
            {switchLabel}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
