"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// URL of the Google Apps Script web app that stores page views (see analytics/).
const STATS_URL = process.env.NEXT_PUBLIC_STATS_URL ?? "";

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

/** Sends one anonymous record per page view. No cookies, no identifiers. */
export function PageViews() {
  const pathname = usePathname();

  useEffect(() => {
    if (!STATS_URL || navigator.webdriver || location.hostname === "localhost") return;

    const referrer = firstView ? referrerHost() : location.host;
    const internal = referrer === location.host;
    firstView = false;

    const body = JSON.stringify({
      // usePathname() already excludes the base path.
      path: pathname,
      referrer: internal ? "" : referrer,
      device: deviceType(window.innerWidth),
      screen: `${screen.width}x${screen.height}`,
      newSession: !internal,
    });
    // text/plain avoids a CORS preflight, which Apps Script does not answer.
    navigator.sendBeacon(STATS_URL, new Blob([body], { type: "text/plain" }));
  }, [pathname]);

  return null;
}
