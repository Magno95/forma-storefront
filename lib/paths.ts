import type { Locale } from "./model";

export const pages = ["home", "product", "cart", "confirmation"] as const;
export type StorePage = (typeof pages)[number];

const segments: Record<StorePage, string> = {
  home: "",
  product: "/pod",
  cart: "/cart",
  confirmation: "/confirmation",
};

export function storePath(locale: Locale, page: StorePage) {
  return `/${locale}${segments[page]}`;
}

export function pageFromPath(pathname: string) {
  return pages.find((page) => storePath("it", page) === pathname || storePath("en", page) === pathname);
}
