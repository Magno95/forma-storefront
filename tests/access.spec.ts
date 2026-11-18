import { expect, test } from "@playwright/test";
import { testAccessKey } from "./access-fixture";

test("blocks anonymous requests, forged cookies, API routes and product images", async ({ request }) => {
  const response = await request.get("/it/pod", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toContain("/access?next=%2Fit%2Fpod");
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect((await request.get("/api/catalog")).status()).toBe(401);
  expect((await request.get("/images/forma-product.webp")).status()).toBe(401);
  expect((await request.get("/it/pod?_rsc=test", { headers: { RSC: "1" } })).status()).toBe(401);

  const forged = await request.get("/api/catalog", {
    headers: { Cookie: "forma_access=true; __Host-forma_access=true" },
  });
  expect(forged.status()).toBe(401);
});

test("opens a deep link with the correct key and locks it again on sign-out", async ({ page }) => {
  await page.goto("/en/pod");
  await expect(page.getByRole("heading", { name: "Private preview" })).toBeVisible();
  await page.getByLabel("Access key").fill("incorrect-key");
  await page.getByRole("button", { name: "Open preview" }).click();
  await expect(page.getByRole("alert")).toHaveText("Invalid key. Try again.");
  await page.getByLabel("Access key").fill(testAccessKey());
  await page.getByRole("button", { name: "Open preview" }).click();
  await expect(page).toHaveURL(/\/en\/pod$/);
  await expect(page.getByRole("heading", { name: "Forma Cover", level: 1 })).toBeVisible();

  const session = (await page.context().cookies()).find(({ name }) => name.endsWith("forma_access"));
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe("Lax");
  if (process.env.TEST_BASE_URL?.startsWith("https://")) expect(session?.secure).toBe(true);
  expect((await page.request.get("/api/catalog")).ok()).toBe(true);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Private preview" })).toBeVisible();
  expect((await page.request.get("/api/catalog")).status()).toBe(401);
});
