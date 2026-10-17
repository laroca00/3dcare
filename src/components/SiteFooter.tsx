import Link from "next/link";
import type { Dictionary, Locale } from "@/i18n/config";
import { EuFlag } from "./EuEmblem";
import { LogoMark } from "./Logo";

export const REPO_URL = "https://github.com/laroca00/3dcare";

export function SiteFooter({ lang, t }: { lang: Locale; t: Dictionary }) {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <div className="site-footer__project">
          <p className="brand brand--footer">
            <LogoMark className="brand__mark" />
            <span>3D Care</span>
          </p>
          <p>{t.footer.project}</p>
          <ul className="site-footer__links">
            <li>
              <Link href={`/${lang}/privacy/`}>{t.footer.privacy}</Link>
            </li>
            <li>
              <Link href={`/${lang}/accessibility/`}>{t.footer.accessibility}</Link>
            </li>
            <li>
              <a href={REPO_URL}>{t.footer.source}</a>
            </li>
          </ul>
        </div>
        <div className="site-footer__eu">
          <p className="eu-emblem">
            <EuFlag className="eu-emblem__flag" />
            <span>{t.footer.cofunded}</span>
          </p>
          <p className="site-footer__disclaimer">{t.footer.disclaimer}</p>
        </div>
      </div>
    </footer>
  );
}
