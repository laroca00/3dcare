import Image from "next/image";
import Link from "next/link";
import type { Dictionary, Locale } from "@/i18n/config";
import emblemEn from "@/assets/eu/co-funded-en-neg.png";
import emblemTr from "@/assets/eu/co-funded-tr-neg.png";
import { LogoMark } from "./Logo";

export const REPO_URL = "https://github.com/laroca00/3dcare";

// Official "Co-funded by the European Union" emblems (negative version for dark
// backgrounds) from the European Commission download centre.
const emblems = { en: emblemEn, tr: emblemTr };

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
          <Image src={emblems[lang]} alt={t.footer.cofunded} className="eu-emblem" />
          <p className="site-footer__disclaimer">{t.footer.disclaimer}</p>
        </div>
      </div>
    </footer>
  );
}
