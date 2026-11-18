import { NextRequest, NextResponse } from "next/server";
import { mockService } from "@/lib/mock-service";
import { readJson } from "@/lib/request";
import { paymentMethods, summarize } from "@/lib/store";
import { cartCookie, mockError, noStore, readCart, readReceipt, receiptCookie, setStoreCookie, validateCheckout } from "@/lib/store-server";

export async function GET(request: Request) {
  try {
    const options = await mockService.run("payment-options", () => ({ methods: paymentMethods }), request.signal);
    return Response.json(options, { headers: noStore });
  } catch (error) {
    return mockError(error);
  }
}

export async function POST(request: NextRequest) {
  const data = await readJson(request);
  if (!data) return NextResponse.json({ error: "invalid_body" }, { status: 400, headers: noStore });

  const { invalid, payment, id } = validateCheckout(data);
  if (invalid.length || !id || !payment) {
    return NextResponse.json({ error: "invalid_checkout", fields: invalid }, { status: 422, headers: noStore });
  }

  const previous = readReceipt(request.cookies.get(receiptCookie)?.value);
  if (previous?.id === id) return NextResponse.json({ order: previous }, { headers: noStore });
  const cart = readCart(request.cookies.get(cartCookie)?.value);
  if (!cart.length) return NextResponse.json({ error: "empty_cart" }, { status: 409, headers: noStore });

  const { total } = summarize(cart);
  if (data.expectedTotal !== total) {
    return NextResponse.json({ error: "cart_changed" }, { status: 409, headers: noStore });
  }

  try {
    const order = await mockService.run("checkout", () => ({ id, payment, total }), request.signal);
    const response = NextResponse.json({ order }, { headers: noStore });
    const secure = request.nextUrl.protocol === "https:";
    setStoreCookie(response, secure, receiptCookie, order);
    setStoreCookie(response, secure, cartCookie, []);
    return response;
  } catch (error) {
    return mockError(error);
  }
}
