"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// URL of the Google Apps Script web app that stores page views (see analytics/).
const STATS_URL = process.env.NEXT_PUBLIC_STATS_URL ?? "";

// Links to files with these extensions count as downloads.
const DOWNLOAD_EXT = /\.(stl|3mf|obj|step|stp|pdf|zip|docx?|pptx?|mp4)$/i;

// Nothing is written to the visitor's device. A view starts a new session when
// it is the first page of this page load and the visitor did not arrive from
// another page of this site.
let firstView = true;

function deviceType(width: number) {
  if (width < 768) return "mobile";
  if (width < 1100) return "tablet";
  return "desktop";
}

function referrerHost() {
  try {
    return document.referrer ? new URL(document.referrer).host : "";
  } catch {
    return "";
  }
}

/** Browser and operating system family only, never the version or full user agent. */
function browserAndOs() {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /SamsungBrowser/.test(ua)
        ? "Samsung Internet"
        : /Firefox|FxiOS/.test(ua)
          ? "Firefox"
          : /Chrome|CriOS/.test(ua)
            ? "Chrome"
            : /Safari/.test(ua)
              ? "Safari"
              : "Other";
  const os = /iPhone|iPad|iPod/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /CrOS/.test(ua)
            ? "ChromeOS"
            : /Linux/.test(ua)
              ? "Linux"
              : "Other";
  return { browser, os };
}

function send(data: Record<string, unknown>) {
  // A plain-text body avoids a CORS preflight, which Apps Script does not
  // answer. Apps Script rejects sendBeacon requests (503), so use fetch.
  const body = JSON.stringify(data);
  fetch(STATS_URL, { method: "POST", mode: "no-cors", keepalive: true, body }).catch(() => {});
}

function enabled() {
  return Boolean(STATS_URL) && !navigator.webdriver && location.hostname !== "localhost";
}

/** Records downloads and clicks on links to other websites. */
function useLinkClicks(pathname: string) {
  useEffect(() => {
    if (!enabled()) return;

    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || !/^https?:$/.test(link.protocol)) return;

      const download = link.hasAttribute("download") || DOWNLOAD_EXT.test(link.pathname);
      const outbound = link.host !== location.host;
      if (!download && !outbound) return;

      send({
        type: "event",
        kind: download ? "download" : "outbound",
        // Without the query string, which may carry identifiers.
        target: outbound ? link.host + link.pathname : link.pathname,
        path: pathname,
      });
    };

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [pathname]);
}

/** Sends anonymous records per page view. No cookies, no identifiers. */
export function PageViews() {
  const pathname = usePathname();
  useLinkClicks(pathname);

  useEffect(() => {
    if (!enabled()) return;

    const referrer = firstView ? referrerHost() : location.host;
    const internal = referrer === location.host;
    const params = new URLSearchParams(firstView ? location.search : "");
    firstView = false;

    send({
      type: "view",
      // usePathname() already excludes the base path.
      path: pathname,
      referrer: internal ? "" : referrer,
      device: deviceType(window.innerWidth),
      screen: `${screen.width}x${screen.height}`,
      newSession: !internal,
      // The time zone and language only serve to estimate the country.
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      ...browserAndOs(),
      source: params.get("utm_source") ?? "",
      medium: params.get("utm_medium") ?? "",
      campaign: params.get("utm_campaign") ?? "",
    });

    // Time on page counts only while the page is visible.
    let visibleSince = document.visibilityState === "visible" ? Date.now() : 0;
    let visibleMs = 0;
    let maxScroll = 0;
    let sent = false;

    const onScroll = () => {
      const seen = window.scrollY + window.innerHeight;
      const total = document.documentElement.scrollHeight;
      maxScroll = Math.max(maxScroll, total > 0 ? Math.min(100, Math.round((seen / total) * 100)) : 100);
    };
    const pause = () => {
      if (visibleSince) visibleMs += Date.now() - visibleSince;
      visibleSince = 0;
    };
    const leave = () => {
      if (sent) return;
      sent = true;
      pause();
      send({ type: "engagement", path: pathname, seconds: Math.round(visibleMs / 1000), scroll: maxScroll });
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") visibleSince = Date.now();
      else pause();
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", leave);
    return () => {
      // The visitor moved to another page of this site.
      leave();
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", leave);
    };
  }, [pathname]);

  return null;
}
