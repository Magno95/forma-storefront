// The UI submits JSON from the same origin. Reject cross-site browser requests.
export function isLocalJson(request: Request) {
  return request.headers.get("content-type")?.split(";")[0] === "application/json"
    && (!request.headers.has("origin") || request.headers.get("origin") === new URL(request.url).origin);
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  if (!isLocalJson(request)) return null;

  const data: unknown = await request.json().catch(() => null);
  return data && typeof data === "object" && !Array.isArray(data)
    ? data as Record<string, unknown>
    : null;
}
