"use client";

import { useRef, useState, type FormEvent } from "react";
import { ResourceState } from "@/components/resource-state";
import { track } from "@/lib/analytics";
import type { Copy } from "@/lib/copy";
import type { Locale } from "@/lib/model";
import { storePath } from "@/lib/paths";
import {
  countries, lineKey, maxQuantity, money, summarize, unitPrice,
  type Climate, type Line, type PaymentMethod, type Size,
} from "@/lib/store";
import { useMockResource } from "@/lib/use-mock-resource";

type CartLabels = Pick<Copy, Size | Climate | (typeof countries)[number] | "product" | "emptyCart" | "shop" |
  "summary" | "subtotal" | "shipping" | "total" | "quantity" | "remove" | "updating" |
  "checkout" | "checkoutDescription" | "name" | "email" | "address" | "city" | "postalCode" |
  "country" | "countryPrompt" | "payment" | "demoCard" | "applePay" | "payApple" | "placeOrder" |
  "loadingPayments" | "ordering" | "invalidCheckout" | "invalidField" | "cartChanged" | "error" | "retry">;

type CheckoutProps = { locale: Locale; labels: CartLabels; total: number; cartBusy: boolean; onProcessing: (value: boolean) => void };

function Checkout({ locale, labels, total, cartBusy, onProcessing }: CheckoutProps) {
  const paymentOptions = useMockResource<{ methods: PaymentMethod[] }>("/api/checkout");
  const [payment, setPayment] = useState<PaymentMethod>("demo-card");
  const [status, setStatus] = useState<"idle" | "pending" | "validation" | "conflict" | "error">("idle");
  const [invalid, setInvalid] = useState<string[]>([]);
  const requestId = useRef<string | null>(null);
  const busy = useRef(false);
  const started = useRef(false);
  const feedback = useRef<HTMLParagraphElement>(null);
  const fields = [
    { name: "name", autoComplete: "name", min: 2, max: 100, type: "text" },
    { name: "email", autoComplete: "email", max: 225, type: "email" },
    { name: "address", autoComplete: "shipping street-address", min: 4, max: 120, type: "text" },
    { name: "city", autoComplete: "shipping address-level2", min: 2, max: 80, type: "text" },
    { name: "postalCode", autoComplete: "shipping postal-code", min: 3, max: 10, type: "text" },
  ] as const;

  function start() {
    if (started.current) return;
    started.current = true;
    track(locale, { event: "begin_checkout" });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || cartBusy || paymentOptions.state !== "ready") return;

    const formData = new FormData(event.currentTarget);
    start();
    busy.current = true;
    onProcessing(true);
    setStatus("pending");
    setInvalid([]);
    requestId.current ??= crypto.randomUUID();

    let navigating = false;
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...Object.fromEntries(formData), requestId: requestId.current, expectedTotal: total }),
      });
      if (response.ok) {
        navigating = true;
        track(locale, { event: "demo_order_completed" });
        window.location.assign(storePath(locale, "confirmation"));
      } else if (response.status === 422) {
        const result = await response.json() as { fields: string[] };
        setInvalid(result.fields);
        setStatus("validation");
      } else {
        setStatus(response.status === 409 ? "conflict" : "error");
      }
    } catch {
      setStatus("error");
    } finally {
      if (!navigating) {
        busy.current = false;
        onProcessing(false);
        feedback.current?.focus();
      }
    }
  }

  return (
    <section className="checkout-panel" aria-labelledby="checkout-heading">
      <h2 id="checkout-heading">{labels.checkout}</h2>
      <p className="page-description">{labels.checkoutDescription}</p>
      <form className="checkout-form" onSubmit={submit} onChange={start}>
        <fieldset className="address-grid" disabled={status === "pending"}>
          {fields.map(({ name, ...field }) => {
            const invalidField = invalid.includes(name);
            return (
              <div key={name} className={name === "address" ? "wide-field" : undefined}>
                <label htmlFor={name}>{labels[name]}</label>
                <input
                  id={name} name={name} type={field.type} autoComplete={field.autoComplete}
                  minLength={"min" in field ? field.min : undefined} maxLength={field.max} required
                  aria-invalid={invalidField || undefined}
                  aria-describedby={invalidField ? `${name}-error` : undefined}
                />
                {invalidField && <p className="field-error" id={`${name}-error`}>{labels.invalidField}</p>}
              </div>
            );
          })}
          <div>
            <label htmlFor="country">{labels.country}</label>
            <select id="country" name="country" autoComplete="shipping country" defaultValue="" required>
              <option value="" disabled>{labels.countryPrompt}</option>
              {countries.map((country) => <option key={country} value={country}>{labels[country]}</option>)}
            </select>
          </div>
        </fieldset>

        {paymentOptions.state !== "ready" ? (
          <ResourceState state={paymentOptions.state} loading={labels.loadingPayments} error={labels.error}
            retry={paymentOptions.retry} retryLabel={labels.retry} />
        ) : (
          <fieldset className="payment-fieldset" disabled={status === "pending" || cartBusy}>
            <legend>{labels.payment}</legend>
            <div className="payment-options">
              {paymentOptions.data.methods.map((method) => (
                <label key={method} className="payment-option">
                  <input type="radio" name="payment" value={method} checked={method === payment} onChange={() => setPayment(method)} />
                  {method === "demo-card" ? labels.demoCard : labels.applePay}
                </label>
              ))}
            </div>
            <button type="submit" className={`primary-action ${payment === "demo-apple-pay" ? "wallet-action" : ""}`} data-cta="checkout_submit">
              {status === "pending" ? labels.ordering : payment === "demo-apple-pay" ? labels.payApple : labels.placeOrder}
              <span aria-hidden="true">↗</span>
            </button>
          </fieldset>
        )}
        <p ref={feedback} className="form-feedback" role="status" tabIndex={-1}>
          {status === "pending" ? labels.ordering :
            status === "validation" ? labels.invalidCheckout :
              status === "conflict" ? labels.cartChanged : status === "error" ? labels.error : ""}
        </p>
      </form>
    </section>
  );
}

export function CartCheckout({ initialCart, locale, labels }: {
  initialCart: Line[]; locale: Locale; labels: CartLabels;
}) {
  const [cart, setCart] = useState(initialCart);
  const [updating, setUpdating] = useState(false);
  const [cartError, setCartError] = useState(false);
  const [processing, setProcessing] = useState(false);
  const busy = useRef(false);
  const amounts = summarize(cart);

  async function update(line: Line, quantity: number) {
    if (busy.current || processing) return;
    busy.current = true;
    setUpdating(true);
    setCartError(false);
    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...line, action: "set", quantity }),
      });
      if (!response.ok) throw new Error("Update failed");
      const result = await response.json() as { cart: Line[] };
      setCart(result.cart);
    } catch {
      setCartError(true);
    } finally {
      busy.current = false;
      setUpdating(false);
    }
  }

  if (!cart.length) {
    return (
      <div className="empty-state">
        <p role="status">{labels.emptyCart}</p>
        <a className="primary-action" href={storePath(locale, "product")} data-cta="cart_empty_shop">{labels.shop} <span aria-hidden="true">↗</span></a>
      </div>
    );
  }

  return (
    <div className="cart-grid">
      <div>
        <ul className="cart-lines">
          {cart.map((line) => {
            const key = lineKey(line);
            return (
              <li className="cart-line" key={key}>
                <img src="/images/forma-product-small.webp" width={720} height={540} alt="" />
                <div className="cart-line-copy">
                  <div className="cart-line-title"><h2>{labels.product}</h2><span>{money(unitPrice(line.size) * line.quantity, locale)}</span></div>
                  <p>{labels[line.size]} · {labels[line.climate]}</p>
                  <div className="cart-line-controls">
                    <label htmlFor={`qty-${key}`}>{labels.quantity}</label>
                    <select id={`qty-${key}`} value={line.quantity} disabled={updating || processing}
                      onChange={(event) => void update(line, Number(event.target.value))}>
                      {Array.from({ length: maxQuantity }, (_, index) => index + 1).map((quantity) => (
                        <option key={quantity} value={quantity}>{quantity}</option>
                      ))}
                    </select>
                    <button className="text-action" type="button" disabled={updating || processing}
                      onClick={() => void update(line, 0)} data-cta="cart_remove">
                      {labels.remove}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="form-feedback" role="status">{updating ? labels.updating : cartError ? labels.error : ""}</p>
        <Checkout locale={locale} labels={labels} total={amounts.total} cartBusy={updating} onProcessing={setProcessing} />
      </div>
      <aside className="order-summary" aria-labelledby="summary-heading">
        <h2 id="summary-heading">{labels.summary}</h2>
        <dl>
          <div><dt>{labels.subtotal}</dt><dd>{money(amounts.subtotal, locale)}</dd></div>
          <div><dt>{labels.shipping}</dt><dd>{money(amounts.delivery, locale)}</dd></div>
          <div className="summary-total"><dt>{labels.total}</dt><dd>{money(amounts.total, locale)}</dd></div>
        </dl>
      </aside>
    </div>
  );
}
