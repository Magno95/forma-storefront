import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./access-fixture";

async function fillAddress(page: Page, postcode = "20121") {
  await page.getByLabel("Full name").fill("Alex Example");
  await page.getByLabel("Email").fill("alex@example.test");
  await page.getByLabel("Street address").fill("Via Esempio 10");
  await page.getByLabel("City").fill("Milano");
  await page.getByLabel("Postal code").fill(postcode);
  await page.getByLabel("Country").selectOption("IT");
}

test("checks out with Apple Pay demo, updates quantity, and reloads the receipt", async ({ page }) => {
  await signIn(page.request);
  await page.goto("/en");
  await expect(page.getByRole("heading", { name: "Let the night take shape." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Designed for the night." })).toBeVisible();
  await page.getByRole("button", { name: "Decline analytics" }).click();
  await expect(page.getByRole("heading", { name: "Optional measurement" })).toHaveCount(0);
  await page.getByRole("link", { name: "Explore Forma" }).click();

  await expect(page.getByRole("heading", { name: "Forma Cover", level: 1 })).toBeVisible();
  await page.getByLabel("Bed size").selectOption("queen");
  await page.getByLabel("Preferred climate").selectOption("cool");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.getByRole("link", { name: "View cart" }).click();
  await expect(page.getByRole("heading", { name: "Cart", exact: true })).toBeVisible();

  await page.getByLabel("Quantity").selectOption("2");
  await expect(page.getByRole("complementary").getByText("€2,017.00")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Quantity")).toHaveValue("2");

  await fillAddress(page, "abcde");
  await page.getByLabel("Apple Pay demo").check();
  await page.getByRole("button", { name: "Simulate Apple Pay" }).click();
  await expect(page.getByLabel("Postal code")).toHaveAttribute("aria-invalid", "true");
  await page.getByLabel("Postal code").fill("20121");
  await page.getByRole("button", { name: "Simulate Apple Pay" }).click();

  await expect(page).toHaveURL(/\/en\/confirmation$/);
  await expect(page.getByRole("heading", { name: "Order confirmed." })).toBeVisible();
  await expect(page.getByText("Apple Pay demo", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Order reference")).toBeVisible();
  await page.getByRole("link", { name: "Cart", exact: true }).click();
  await expect(page.getByText("Your cart is empty.")).toBeVisible();
});

test("server validates the cart, totals, payment and repeated checkout", async ({ request }) => {
  await signIn(request);
  const checkout = {
    name: "Alex Example",
    email: "alex@example.test",
    address: "Via Esempio 10",
    city: "Milano",
    postalCode: "20121",
    country: "IT",
    payment: "demo-card",
    requestId: randomUUID(),
    expectedTotal: 91800,
  };
  expect((await request.post("/api/checkout", { data: checkout })).status()).toBe(409);
  const badItem = await request.post("/api/cart", {
    data: { action: "add", size: "unsupported", climate: "balanced", quantity: 1 },
  });
  expect(badItem.status()).toBe(400);
  const item = { action: "add", size: "double", climate: "balanced", quantity: 1 };
  expect((await request.post("/api/cart", { data: item })).ok()).toBe(true);
  expect((await request.post("/api/cart", { data: { ...item, quantity: 5 } })).status()).toBe(409);
  const invalid = await request.post("/api/checkout", { data: { ...checkout, payment: "card", email: "alex" } });
  expect(invalid.status()).toBe(422);
  expect((await invalid.json()).fields).toEqual(expect.arrayContaining(["payment", "email"]));
  expect((await request.post("/api/checkout", { data: { ...checkout, expectedTotal: 1 } })).status()).toBe(409);
  const response = await request.post("/api/checkout", { data: checkout });
  expect(response.ok()).toBe(true);
  const receipt = await response.json();
  expect(receipt).toEqual({ order: { id: checkout.requestId, total: 91800, payment: "demo-card" } });
  expect(await (await request.post("/api/checkout", { data: checkout })).json()).toEqual(receipt);
});

test("emits visits and clicks after consent", async ({ page }) => {
  await signIn(page.request);
  await page.route("https://www.googletagmanager.com/**", (route) =>
    route.fulfill({ contentType: "text/javascript", body: "/* GTM stub */" }),
  );
  await page.goto("/it/pod");
  expect(await page.evaluate(() => window.dataLayer)).toBeUndefined();
  await page.getByRole("button", { name: "Accetta analytics" }).click();
  await expect(page.getByRole("heading", { name: "Misurazione facoltativa" })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.dataLayer)).toEqual(expect.arrayContaining([
    expect.objectContaining({ event: "storefront_view", locale: "it", page_type: "product" }),
  ]));
  await page.getByLabel("Misura del letto").selectOption("double");
  await page.getByRole("button", { name: "Aggiungi al carrello" }).click();
  await expect(page.getByText("Aggiunto al carrello.")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.dataLayer)).toEqual(expect.arrayContaining([
    expect.objectContaining({ event: "cta_click", cta_id: "product_add" }),
    expect.objectContaining({ event: "add_to_cart", page_type: "product" }),
  ]));
});
