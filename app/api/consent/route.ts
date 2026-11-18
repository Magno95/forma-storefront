import { NextRequest, NextResponse } from "next/server";
import { consentCookie, consentMaxAge } from "@/lib/model";
import { readJson } from "@/lib/request";
import { privateHeaders, requestHasSiteAccess } from "@/lib/site-access";

export async function POST(request: NextRequest) {
  if (!await requestHasSiteAccess(request)) return new Response(null, { status: 401, headers: privateHeaders });
  const body = await readJson(request);
  const choice = body?.choice;
  if (choice !== "granted" && choice !== "denied") {
    return NextResponse.json({ error: "invalid_choice" }, { status: 400 });
  }

  const response = NextResponse.json({ choice }, {
    headers: { "Cache-Control": "no-store" },
  });
  const cookieOptions = {
    path: "/",
    sameSite: "lax" as const,
    secure: request.nextUrl.protocol === "https:",
    maxAge: consentMaxAge,
  };

  response.cookies.set(consentCookie, choice, cookieOptions);
  if (request.cookies.has("forma_visitor")) {
    response.cookies.set("forma_visitor", "", { ...cookieOptions, maxAge: 0, httpOnly: true });
  }

  if (choice === "denied") {
    // The demo Google tag is configured with cookie_domain=none (host-only).
    for (const { name } of request.cookies.getAll()) {
      if (name === "_ga" || name.startsWith("_ga_")) {
        response.cookies.set(name, "", { ...cookieOptions, maxAge: 0 });
      }
    }
  }

  return response;
}
