import { NextRequest, NextResponse } from "next/server";
import { mockService } from "@/lib/mock-service";
import { readJson } from "@/lib/request";
import { lineKey, maxQuantity } from "@/lib/store";
import { cartCookie, mockError, noStore, parseLine, readCart, setStoreCookie } from "@/lib/store-server";

export async function POST(request: NextRequest) {
  const data = await readJson(request);
  const action = data?.action;
  const line = parseLine(data, action === "set" ? 0 : 1);
  if (!line || (action !== "add" && action !== "set")) {
    return NextResponse.json({ error: "invalid_item" }, { status: 400, headers: noStore });
  }

  const cart = readCart(request.cookies.get(cartCookie)?.value);
  const key = lineKey(line);
  const prior = cart.find((entry) => lineKey(entry) === key);
  if (action === "set" && !prior) {
    return NextResponse.json({ error: "item_missing" }, { status: 409, headers: noStore });
  }
  const quantity = action === "add" ? (prior?.quantity ?? 0) + line.quantity : line.quantity;
  if (quantity > maxQuantity) {
    return NextResponse.json({ error: "quantity_limit" }, { status: 409, headers: noStore });
  }

  try {
    const next = await mockService.run("cart", () => {
      const item = { ...line, quantity };
      if (!prior) return [...cart, item];
      return cart.flatMap((entry) => lineKey(entry) === key ? (quantity ? [item] : []) : [entry]);
    }, request.signal);
    const response = NextResponse.json({ cart: next }, { headers: noStore });
    setStoreCookie(response, request.nextUrl.protocol === "https:", cartCookie, next);
    return response;
  } catch (error) {
    return mockError(error);
  }
}
