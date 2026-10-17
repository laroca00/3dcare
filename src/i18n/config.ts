import { en } from "./en";
import { tr } from "./tr";

export const locales = ["en", "tr"] as const;
export type Locale = (typeof locales)[number];

export type Dictionary = typeof en;

const dictionaries: Record<Locale, Dictionary> = { en, tr };

export const hasLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);

export const getDictionary = (locale: Locale) => dictionaries[locale];

/** Pick the string for the current locale from a bilingual content field. */
export type Localized = Record<Locale, string>;
