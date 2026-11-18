import { mockService } from "@/lib/mock-service";
import { configurations, climates } from "@/lib/store";
import { mockError, noStore } from "@/lib/store-server";

export async function GET(request: Request) {
  try {
    const catalog = await mockService.run("catalog", () => ({ configurations, climates }), request.signal);
    return Response.json(catalog, { headers: noStore });
  } catch (error) {
    return mockError(error);
  }
}
