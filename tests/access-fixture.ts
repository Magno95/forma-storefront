import type { APIRequestContext } from "@playwright/test";

export const localTestAccessKey = "local-playwright-access-key-used-only-by-the-test-server";
export const testOrigin = new URL(process.env.TEST_BASE_URL || "http://localhost:4173").origin;

export function testAccessKey() {
  const key = process.env.TEST_BASE_URL ? process.env.TEST_SITE_ACCESS_KEY : localTestAccessKey;
  if (!key) throw new Error("Set TEST_SITE_ACCESS_KEY to run authenticated tests on a deployment.");
  return key;
}

export async function signIn(request: APIRequestContext) {
  const response = await request.post("/access", {
    headers: { Origin: testOrigin },
    form: { key: testAccessKey() },
    maxRedirects: 0,
  });
  if (response.status() !== 303) throw new Error(`Preview sign-in failed with HTTP ${response.status()}`);
}
