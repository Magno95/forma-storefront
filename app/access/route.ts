import { NextRequest, NextResponse } from "next/server";
import {
  accessCookie, accessKey, createAccessSession, hasAccessSession,
  matchesAccessKey, privateHeaders, safeStorePath,
} from "@/lib/site-access";

const pageHeaders = {
  ...privateHeaders,
  "Content-Type": "text/html; charset=utf-8",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  "Referrer-Policy": "same-origin",
  "X-Content-Type-Options": "nosniff",
};

function accessPage(next: string, status = 200) {
  const unavailable = status === 503;
  const rejected = status === 401;
  const english = next.startsWith("/en");
  const title = english ? "Private preview" : "Anteprima privata";
  const description = unavailable
    ? english ? "Access is being configured." : "L'accesso è in fase di configurazione."
    : english ? "Enter the key to open Forma." : "Inserisci la chiave per aprire Forma.";
  const label = english ? "Access key" : "Chiave di accesso";
  const error = english ? "Invalid key. Try again." : "Chiave non valida. Riprova.";
  const action = english ? "Open preview" : "Apri anteprima";
  return new Response(`<!doctype html>
<html lang="${english ? "en" : "it"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} · Forma</title>
  <style>
    * { box-sizing: border-box }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 1.25rem; background: #111e30; color: #f8f5ed; font: 1rem/1.55 system-ui, sans-serif; }
    main { width: min(100%, 27rem); padding: clamp(1.4rem, 5vw, 2.8rem); border: 1px solid #75849a; border-radius: 0.55rem; background: #17263a; }
    .wordmark { font: 600 2rem/1 Georgia, serif; letter-spacing: -0.1em; margin: 0 0 1.25rem; }
    .wordmark span { color: #ecc690; }
    h1 { font: 400 clamp(2rem, 7vw, 2.8rem)/1 Georgia, serif; letter-spacing: -0.05em; margin: 0; }
    p { color: #d0d9e4; }
    label { display: block; margin-block: 1.25rem 0.35rem; font-weight: 650; }
    input, button { width: 100%; min-height: 3rem; border-radius: 0.35rem; padding: 0.55rem 0.75rem; font: inherit; }
    input { background: #fffdf7; color: #101b29; border: 1px solid #9baac0; }
    button { border: 0; background: #ecc690; color: #101b29; font-weight: 650; cursor: pointer; margin-top: 0.9rem; }
    :focus-visible { outline: 2px solid #ecc690; outline-offset: 0.2rem; }
    [role=alert] { color: #ffd0be; font-size: 0.9rem; margin: 0.5rem 0 0; }
  </style>
</head>
<body>
  <main>
    <div class="wordmark">forma<span>.</span></div>
    <h1>${title}</h1>
    <p>${description}</p>
    ${unavailable ? "" : `<form action="/access" method="post">
      <input type="hidden" name="next" value="${next}">
      <label for="access-key">${label}</label>
      <input id="access-key" type="password" name="key" required maxlength="128" autocomplete="current-password"${rejected ? ' aria-invalid="true" aria-describedby="access-error"' : ""}>
      ${rejected ? `<p id="access-error" role="alert">${error}</p>` : ""}
      <button type="submit">${action}</button>
    </form>`}
  </main>
</body>
</html>`, { status, headers: pageHeaders });
}

function redirectTo(path: string) {
  return new NextResponse(null, { status: 303, headers: { ...privateHeaders, Location: path } });
}

export async function GET(request: NextRequest) {
  const next = safeStorePath(request.nextUrl.searchParams.get("next"));
  if (!accessKey()) return accessPage(next, 503);

  if (await hasAccessSession(request.cookies.get(accessCookie(request).name)?.value)) {
    return redirectTo(next);
  }
  return accessPage(next);
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin
    || request.headers.get("content-type")?.split(";")[0] !== "application/x-www-form-urlencoded") {
    return new Response(null, { status: 403, headers: privateHeaders });
  }

  const form = await request.formData().catch(() => null);
  const next = safeStorePath(form?.get("next"));
  const cookie = accessCookie(request);
  if (form?.get("action") === "logout") {
    const response = redirectTo(`/access?next=${encodeURIComponent(next)}`);
    response.cookies.set({ ...cookie, value: "", maxAge: 0 });
    return response;
  }

  const value = accessKey();
  if (!value) return accessPage(next, 503);
  const entered = form?.get("key");
  if (typeof entered !== "string" || entered.length > 128 || !await matchesAccessKey(value, entered)) {
    return accessPage(next, 401);
  }

  const response = redirectTo(next);
  response.cookies.set({ ...cookie, value: await createAccessSession(value) });
  return response;
}
