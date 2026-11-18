import { NextResponse, type NextRequest } from "next/server";
import { pageFromPath } from "@/lib/paths";
import { isSiteAccessRequired, privateHeaders, requestHasSiteAccess } from "@/lib/site-access";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/access" || !isSiteAccessRequired()) return NextResponse.next();

  if (await requestHasSiteAccess(request)) return NextResponse.next({ headers: privateHeaders });

  if (request.method === "GET" && !request.headers.has("rsc") && (pathname === "/" || pageFromPath(pathname))) {
    const login = new URL("/access", request.url);
    login.searchParams.set("next", pathname === "/" ? "/it" : pathname);
    return NextResponse.redirect(login, { headers: privateHeaders });
  }
  return new NextResponse(null, { status: 401, headers: privateHeaders });
}

export const config = { matcher: ["/:path*"] };
