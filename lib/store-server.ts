import type { NextResponse } from "next/server";
import { climates, configurations, countries, lineKey, maxQuantity, paymentMethods, type Line, type Receipt } from "./store";
import { MockServiceUnavailable } from "./mock-service";

export const cartCookie = "forma_cart";
export const receiptCookie = "forma_receipt";

export function objectData(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function fromCookie(value?: string) {
  try {
    return value ? JSON.parse(value) as unknown : null;
  } catch {
    return null;
  }
}

export function parseLine(value: unknown, minimum = 1): Line | null {
  const data = objectData(value);
  if (!data) return null;
  const size = configurations.find(({ id }) => id === data.size)?.id;
  const climate = climates.find((option) => option === data.climate);
  const quantity = data.quantity;
  if (!size || !climate || typeof quantity !== "number" || !Number.isInteger(quantity)
    || quantity < minimum || quantity > maxQuantity) return null;
  return { size, climate, quantity };
}

export function readCart(value?: string): Line[] {
  const parsed = fromCookie(value);
  if (!Array.isArray(parsed) || parsed.length > configurations.length * climates.length) return [];

  const lines = new Map<string, Line>();
  for (const entry of parsed) {
    const line = parseLine(entry);
    if (line) lines.set(lineKey(line), line);
  }
  return [...lines.values()];
}

export function validId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function readReceipt(value?: string): Receipt | null {
  const data = objectData(fromCookie(value));
  if (!data || !validId(data.id)) return null;
  const payment = paymentMethods.find((method) => method === data.payment);
  const total = data.total;
  if (!payment || typeof total !== "number" || !Number.isSafeInteger(total) || total <= 0) return null;
  return { id: data.id, total, payment };
}

export function setStoreCookie(response: NextResponse, secure: boolean, name: string, value: Line[] | Receipt) {
  const empty = Array.isArray(value) && value.length === 0;
  response.cookies.set(name, empty ? "" : JSON.stringify(value), {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure,
    maxAge: empty ? 0 : name === cartCookie ? 60 * 60 * 24 * 14 : 60 * 60 * 24,
  });
}

export function validateCheckout(data: Record<string, unknown>) {
  const invalid: string[] = [];
  const test = (key: string, pattern: RegExp) => {
    if (typeof data[key] !== "string" || !pattern.test(data[key].trim())) invalid.push(key);
  };
  test("name", /^.{2,100}$/u);
  test("email", /^[^\s@]{1,100}@[^\s@]{1,100}\.[^\s@]{2,24}$/u);
  test("address", /^.{4,120}$/u);
  test("city", /^.{2,80}$/u);
  const country = countries.find((option) => option === data.country);
  if (!country) invalid.push("country");
  const postalPatterns = {
    IT: /^\d{5}$/,
    FR: /^\d{5}$/,
    DE: /^\d{5}$/,
    ES: /^\d{5}$/,
    NL: /^\d{4}\s?[A-Z]{2}$/i,
  };
  test("postalCode", country ? postalPatterns[country] : /^[A-Z0-9 -]{3,10}$/i);
  const payment = paymentMethods.find((method) => method === data.payment);
  if (!payment) invalid.push("payment");
  const id = validId(data.requestId) ? data.requestId : null;
  if (!id) invalid.push("requestId");
  return { invalid, payment, id };
}

export const noStore = { "Cache-Control": "no-store" };

export function mockError(error: unknown) {
  if (!(error instanceof MockServiceUnavailable)) throw error;
  return Response.json({ error: "service_unavailable" }, { status: 503, headers: noStore });
}
