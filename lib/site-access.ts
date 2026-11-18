import type { NextRequest } from "next/server";
import { pageFromPath } from "./paths";

const encoder = new TextEncoder();
export const sessionSeconds = 60 * 60 * 24;

export const privateHeaders = {
  "Cache-Control": "private, no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

let signingKey: { value: string; imported: Promise<CryptoKey> } | undefined;

export function isSiteAccessRequired() {
  return process.env.NODE_ENV !== "development" || Boolean(process.env.VERCEL) || Boolean(process.env.SITE_ACCESS_KEY);
}

export function accessKey() {
  const value = process.env.SITE_ACCESS_KEY;
  return value && /^[A-Za-z0-9_-]{43,128}$/.test(value) ? value : undefined;
}

function getSigningKey(value: string) {
  if (signingKey?.value !== value) {
    signingKey = {
      value,
      imported: crypto.subtle.importKey("raw", encoder.encode(value), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]),
    };
  }
  return signingKey.imported;
}

export async function matchesAccessKey(value: string, entered: string) {
  const key = await getSigningKey(value);
  const expected = await crypto.subtle.sign("HMAC", key, encoder.encode(`forma-key:${value}`));
  return crypto.subtle.verify("HMAC", key, expected, encoder.encode(`forma-key:${entered}`));
}

export async function createAccessSession(value: string) {
  const expires = Math.floor(Date.now() / 1000) + sessionSeconds;
  const payload = `v1.${expires}.${crypto.randomUUID()}`;
  const mac = await crypto.subtle.sign("HMAC", await getSigningKey(value), encoder.encode(payload));
  const signature = Array.from(new Uint8Array(mac), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${payload}.${signature}`;
}

export async function hasAccessSession(token?: string) {
  const value = accessKey();
  if (!value || !token) return false;

  const fields = /^(v1\.([0-9]{1,12})\.[0-9a-f-]{36})\.([0-9a-f]{64})$/.exec(token);
  if (!fields) return false;
  const [, payload, expires, signature] = fields;
  if (Math.floor(Date.now() / 1000) >= Number(expires)) return false;

  const mac = new Uint8Array(32);
  for (let index = 0; index < mac.length; index++) {
    mac[index] = Number.parseInt(signature.slice(index * 2, index * 2 + 2), 16);
  }
  return crypto.subtle.verify("HMAC", await getSigningKey(value), mac, encoder.encode(payload));
}

export function accessCookie(request: NextRequest) {
  const secure = request.nextUrl.protocol === "https:" || process.env.VERCEL === "1";
  return {
    name: secure ? "__Host-forma_access" : "forma_access",
    secure,
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: sessionSeconds,
  };
}

export async function requestHasSiteAccess(request: NextRequest) {
  if (!isSiteAccessRequired()) return true;
  return hasAccessSession(request.cookies.get(accessCookie(request).name)?.value);
}

export function safeStorePath(path: unknown) {
  return typeof path === "string" && pageFromPath(path) ? path : "/it";
}
