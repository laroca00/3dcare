"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LazyMotion, MotionConfig, domAnimation, m, useMotionValueEvent, useScroll, type Variants } from "framer-motion";
import { Menu } from "lucide-react";
import type { Dictionary, Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { LogoMark } from "../Logo";
import { ThemeToggle } from "../ThemeToggle";
import { Button } from "./button";

// The mobile menu (Radix dialog) loads only when it is first opened, so its
// code stays out of every page load.
const MobileMenu = React.lazy(() => import("./mobile-menu"));

type Item = { href: string; label: string };

/** Scrolling down past this point folds the bar into a circle. */
const COLLAPSE_AFTER = 150;
/** How far back up the visitor scrolls before it opens again. */
const EXPAND_SCROLL_THRESHOLD = 80;

const containerVariants: Variants = {
  expanded: {
    width: "auto",
    transition: {
      type: "spring",
      damping: 20,
      stiffness: 300,
      staggerChildren: 0.07,
      delayChildren: 0.2,
    },
  },
  collapsed: {
    width: "3rem",
    transition: {
      type: "spring",
      damping: 20,
      stiffness: 300,
      when: "afterChildren",
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

const logoVariants: Variants = {
  expanded: { opacity: 1, x: 0, rotate: 0, transition: { type: "spring", damping: 15 } },
  collapsed: { opacity: 0, x: -25, rotate: -180, transition: { duration: 0.3 } },
};

const itemVariants: Variants = {
  expanded: { opacity: 1, x: 0, scale: 1, transition: { type: "spring", damping: 15 } },
  collapsed: { opacity: 0, x: -20, scale: 0.95, transition: { duration: 0.2 } },
};

const collapsedIconVariants: Variants = {
  expanded: { opacity: 0, scale: 0.8, transition: { duration: 0.2 } },
  collapsed: { opacity: 1, scale: 1, transition: { type: "spring", damping: 15, stiffness: 300, delay: 0.15 } },
};

const linkClass =
  "block rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground no-underline transition-colors hover:text-foreground aria-[current=page]:bg-accent aria-[current=page]:text-foreground";

/**
 * The site's main navigation: a bar floating at the top that folds into a
 * circle while the visitor scrolls down and opens again when they scroll back
 * up or press it. On narrow screens the links open in a side sheet.
 */
export function AnimatedNav({ lang, items, t }: { lang: Locale; items: Item[]; t: Dictionary["nav"] }) {
  const pathname = usePathname();
  const other: Locale = lang === "en" ? "tr" : "en";
  const switchHref = pathname.replace(new RegExp(`^/${lang}(?=/|$)`), `/${other}`);
  const isActive = (href: string) => `${pathname.replace(/\/$/, "")}/`.startsWith(href);

  const [isExpanded, setExpanded] = React.useState(true);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [sheetLoaded, setSheetLoaded] = React.useState(false);
  const menuButton = React.useRef<HTMLButtonElement>(null);
  const { scrollY } = useScroll();
  const lastScrollY = React.useRef(0);
  const scrollPositionOnCollapse = React.useRef(0);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = lastScrollY.current;
    if (isExpanded && latest > previous && latest > COLLAPSE_AFTER) {
      setExpanded(false);
      scrollPositionOnCollapse.current = latest;
    } else if (!isExpanded && latest > scrollPositionOnCollapse.current) {
      // Measure the way back up from the lowest point reached, not from where it folded.
      scrollPositionOnCollapse.current = latest;
    } else if (!isExpanded && latest < previous && scrollPositionOnCollapse.current - latest > EXPAND_SCROLL_THRESHOLD) {
      setExpanded(true);
    }
    lastScrollY.current = latest;
  });

  const switchLink = (className?: string) => (
    <Link href={switchHref} hrefLang={other} lang={other} className={cn(linkClass, "font-semibold text-foreground", className)}>
      {t.language}
    </Link>
  );

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <div className="fixed top-4 left-1/2 z-50 max-w-[calc(100vw-2rem)] -translate-x-1/2">
          <m.nav
            aria-label={t.menu}
            initial={false}
            animate={isExpanded ? "expanded" : "collapsed"}
            variants={containerVariants}
            whileHover={!isExpanded ? { scale: 1.1 } : {}}
            whileTap={!isExpanded ? { scale: 0.95 } : {}}
            className="relative flex h-12 items-center overflow-hidden rounded-full border border-border bg-background/80 shadow-lg backdrop-blur-sm"
          >
            {/* While folded the contents are hidden from keyboard and screen readers too. */}
            <div className="flex items-center" inert={!isExpanded}>
              <m.div variants={logoVariants} className="flex shrink-0 items-center pl-2">
                <Link
                  href={`/${lang}/`}
                  className="flex items-center gap-2 rounded-full px-2 py-1 text-lg font-bold tracking-tight whitespace-nowrap text-foreground no-underline hover:text-foreground"
                >
                  <LogoMark className="h-7 w-7" />
                  3D Care
                  <span className="sr-only">{t.home}</span>
                </Link>
              </m.div>

              <ul className="m-0 hidden list-none items-center gap-1 p-0 pl-2 lg:flex">
                {items.map((item) => (
                  <m.li key={item.href} variants={itemVariants}>
                    <Link href={item.href} aria-current={isActive(item.href) ? "page" : undefined} className={cn(linkClass, "whitespace-nowrap")}>
                      {item.label}
                    </Link>
                  </m.li>
                ))}
                <m.li variants={itemVariants}>{switchLink("whitespace-nowrap")}</m.li>
              </ul>

              <m.div variants={itemVariants} className="flex items-center gap-1 pr-1 pl-2">
                <ThemeToggle label={t.themeLabel} />
                <Button
                  ref={menuButton}
                  variant="ghost"
                  size="icon"
                  aria-haspopup="dialog"
                  aria-expanded={sheetOpen}
                  onClick={() => {
                    setSheetLoaded(true);
                    setSheetOpen(true);
                  }}
                  className="rounded-full lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">{t.menu}</span>
                </Button>
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
                      language={switchLink("px-4 py-3 text-base")}
                      linkClass={linkClass}
                      menuLabel={t.menu}
                      closeLabel={t.close}
                    />
                  </React.Suspense>
                )}
              </m.div>
            </div>

            {/* The folded circle: one button that opens the bar again. */}
            <button
              type="button"
              aria-label={t.menu}
              aria-expanded={false}
              inert={isExpanded}
              onClick={() => setExpanded(true)}
              className={cn(
                "absolute inset-0 flex cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-foreground",
                isExpanded && "pointer-events-none",
              )}
            >
              <m.span variants={collapsedIconVariants} className="flex">
                <Menu className="h-6 w-6" />
              </m.span>
            </button>
          </m.nav>
        </div>
      </MotionConfig>
    </LazyMotion>
  );
}
