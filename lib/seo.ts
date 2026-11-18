import type { Metadata } from "next";
import type { Locale } from "./model";
import { storePath, type StorePage } from "./paths";

export function storeMetadata(locale: Locale, page: StorePage, title: string, description?: string): Metadata {
  const origin = process.env.SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  const url = (target: Locale) => origin
    ? new URL(storePath(target, page), origin).href
    : storePath(target, page);
  return {
    title,
    description,
    alternates: { canonical: url(locale), languages: { it: url("it"), en: url("en") } },
    robots: process.env.VERCEL_ENV === "preview" || page === "cart" || page === "confirmation"
      ? { index: false, follow: false }
      : undefined,
  };
}
