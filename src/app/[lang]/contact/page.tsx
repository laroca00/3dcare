import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactForm } from "@/components/ContactForm";
import { getDictionary, hasLocale } from "@/i18n/config";

export async function generateMetadata({ params }: PageProps<"/[lang]/contact">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: getDictionary(lang).contact.title } : {};
}

export default async function ContactPage({ params }: PageProps<"/[lang]/contact">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang).contact;

  return (
    <div className="container page contact">
      <div>
        <h1>{t.title}</h1>
        <p className="lead">{t.lead}</p>
        <ContactForm t={t} />
        <p className="small">
          <Link href={`/${lang}/privacy/`}>{t.privacy}</Link>
        </p>
      </div>
      <aside aria-labelledby="network">
        <h2 id="network">{t.networkTitle}</h2>
        <p>{t.networkText}</p>
      </aside>
    </div>
  );
}
