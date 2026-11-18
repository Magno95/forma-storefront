import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { CartCheckout } from "@/components/cart-checkout";
import { copy } from "@/lib/copy";
import { isLocale } from "@/lib/model";
import { storeMetadata } from "@/lib/seo";
import { cartCookie, readCart } from "@/lib/store-server";

type Props = { params: Promise<{ locale: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return storeMetadata(locale, "cart", `${copy[locale].cart} · Forma`);
}

export default async function Cart({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const cart = readCart((await cookies()).get(cartCookie)?.value);
  const labels = copy[locale];

  return (
    <section className="light-panel">
      <div className="shell content-pad">
        <h1 className="page-heading">{labels.cart}</h1>
        <CartCheckout initialCart={cart} locale={locale} labels={{
          product: labels.product, double: labels.double, queen: labels.queen, king: labels.king, cool: labels.cool,
          balanced: labels.balanced, warm: labels.warm, emptyCart: labels.emptyCart, shop: labels.shop, summary: labels.summary,
          subtotal: labels.subtotal, shipping: labels.shipping, total: labels.total, quantity: labels.quantity,
          remove: labels.remove, updating: labels.updating, checkout: labels.checkout, checkoutDescription: labels.checkoutDescription,
          name: labels.name, email: labels.email, address: labels.address, city: labels.city, postalCode: labels.postalCode,
          country: labels.country, countryPrompt: labels.countryPrompt, IT: labels.IT, FR: labels.FR, DE: labels.DE,
          ES: labels.ES, NL: labels.NL, payment: labels.payment, demoCard: labels.demoCard, applePay: labels.applePay,
          payApple: labels.payApple, placeOrder: labels.placeOrder, loadingPayments: labels.loadingPayments, ordering: labels.ordering,
          invalidCheckout: labels.invalidCheckout, invalidField: labels.invalidField, cartChanged: labels.cartChanged,
          error: labels.error, retry: labels.retry,
        }} />
      </div>
    </section>
  );
}
