import type { NextRequest } from "next/server";
import { mockService } from "@/lib/mock-service";
import { privateHeaders, requestHasSiteAccess } from "@/lib/site-access";
import { configurations, climates } from "@/lib/store";
import { mockError, noStore } from "@/lib/store-server";

export async function GET(request: NextRequest) {
  if (!await requestHasSiteAccess(request)) return new Response(null, { status: 401, headers: privateHeaders });
  try {
    const catalog = await mockService.run("catalog", () => ({ configurations, climates }), request.signal);
    return Response.json(catalog, { headers: noStore });
  } catch (error) {
    return mockError(error);
  }
}
