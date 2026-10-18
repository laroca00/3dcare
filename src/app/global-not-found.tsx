import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { FontFaces } from "./FontFaces";
import "./globals.css";

// Shown for any address that does not exist. The language is unknown here,
// so the page speaks both.
export const metadata: Metadata = {
  title: "Page not found | 3D Care",
};

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <head>
        <FontFaces extended />
      </head>
      <body>
        <header className="site-header">
          <div className="container site-header__inner">
            <Link href="/en/" className="brand">
              <LogoMark className="brand__mark" />
              <span>3D Care</span>
            </Link>
          </div>
        </header>
        <main id="main" className="container not-found">
          <section>
            <h1>Page not found</h1>
            <p className="lead">The page you are looking for does not exist or has moved.</p>
            <p className="actions">
              <Link href="/en/" className="btn btn--primary">
                Go to the home page
              </Link>
            </p>
          </section>
          <section lang="tr">
            <h1>Sayfa bulunamadı</h1>
            <p className="lead">Aradığınız sayfa yok ya da taşındı.</p>
            <p className="actions">
              <Link href="/tr/" className="btn btn--secondary">
                Ana sayfaya git
              </Link>
            </p>
          </section>
        </main>
      </body>
    </html>
  );
}
