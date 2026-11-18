export const locales = ["it", "en"] as const;
export type Locale = (typeof locales)[number];

export function isLocale(value: string): value is Locale {
  return locales.some((locale) => locale === value);
}

export const consentCookie = "forma_analytics";
export const consentMaxAge = 60 * 60 * 24 * 180;
