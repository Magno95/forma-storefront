import type { Locale } from "./model";

export const configurations = [
  { id: "double", price: 89900 },
  { id: "queen", price: 99900 },
  { id: "king", price: 109900 },
] as const;

export const climates = ["cool", "balanced", "warm"] as const;
export const countries = ["IT", "FR", "DE", "ES", "NL"] as const;
export const paymentMethods = ["demo-card", "demo-apple-pay"] as const;
export const maxQuantity = 5;
export const shipping = 1900;

export type Size = (typeof configurations)[number]["id"];
export type Climate = (typeof climates)[number];
export type PaymentMethod = (typeof paymentMethods)[number];
export type Line = { size: Size; climate: Climate; quantity: number };
export type Receipt = { id: string; total: number; payment: PaymentMethod };

export function lineKey(line: Pick<Line, "size" | "climate">) {
  return `${line.size}:${line.climate}`;
}

export function unitPrice(size: Size) {
  return configurations.find((configuration) => configuration.id === size)!.price;
}

export function summarize(cart: Line[]) {
  const subtotal = cart.reduce((sum, line) => sum + unitPrice(line.size) * line.quantity, 0);
  const delivery = cart.length ? shipping : 0;
  return { subtotal, delivery, total: subtotal + delivery };
}

export function money(cents: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "it" ? "it-IT" : "en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
