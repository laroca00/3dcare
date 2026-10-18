import type { Locale } from "@/i18n/config";

// Public address of the site, used for links in the sitemap and share cards.
// Set the SITE_URL repository variable to https://3dcare.eu once the domain is live.
export const SITE_URL = (process.env.SITE_URL || "https://laroca00.github.io/3dcare").replace(/\/$/, "");

/** Share card image for social media and messaging apps (1200 × 630). */
export const shareImage = (lang: Locale, alt: string) => [
  { url: `${SITE_URL}/og/og-${lang}.png`, width: 1200, height: 630, alt },
];
