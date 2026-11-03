import en from './en.json';
import es from './es.json';
import pt from './pt.json';

export const locales = ['pt', 'en', 'es'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'pt';

/** PT is the reference dictionary: EN and ES must carry exactly its keys (checked by the type below and by a unit test). */
export type Dictionary = typeof pt;
export type StringKey = { [K in keyof Dictionary]: Dictionary[K] extends string ? K : never }[keyof Dictionary];
export type FlowLabels = Dictionary['flow'];

export const dictionaries: Record<Locale, Dictionary> = { pt, en, es };

/** BCP 47 tag used for `<html lang>`, `hreflang` and the `lang` attribute of the switcher links. */
export const htmlLang: Record<Locale, string> = { pt: 'pt-BR', en: 'en', es: 'es' };

export const isLocale = (value: unknown): value is Locale => locales.includes(value as Locale);

/** Route of a locale under the site base: PT at the root, the others in a folder named after the locale. */
export function localePath(locale: Locale, base: string = import.meta.env.BASE_URL): string {
  const root = base.endsWith('/') ? base : `${base}/`;
  return locale === defaultLocale ? root : `${root}${locale}/`;
}

export function useTranslations(locale: Locale) {
  const dict = dictionaries[locale];
  return (key: StringKey): string => dict[key];
}
