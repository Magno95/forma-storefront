"use client";

import { useRef, useState, type FormEvent } from "react";
import { ResourceState } from "@/components/resource-state";
import { track } from "@/lib/analytics";
import type { Copy } from "@/lib/copy";
import type { Locale } from "@/lib/model";
import { storePath } from "@/lib/paths";
import { configurations, money, type Climate, type Size } from "@/lib/store";
import { useMockResource } from "@/lib/use-mock-resource";

type ProductLabels = Pick<Copy, "from" | "size" | "climate" | "choose" | Size | Climate |
  "add" | "adding" | "added" | "quantityLimit" | "viewCart" | "loadingConfig" | "retry" | "error">;

export function ProductForm({ locale, labels }: { locale: Locale; labels: ProductLabels }) {
  const catalog = useMockResource<{ configurations: { id: Size; price: number }[]; climates: Climate[] }>("/api/catalog");
  const [size, setSize] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "added" | "limit" | "error">("idle");
  const busy = useRef(false);
  const selected = catalog.data?.configurations.find(({ id }) => id === size);
  const listedPrice = selected ? money(selected.price, locale) : `${labels.from} ${money(configurations[0].price, locale)}`;

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || !selected) return;

    const values = new FormData(event.currentTarget);
    busy.current = true;
    setStatus("pending");
    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", size: selected.id, climate: values.get("climate"), quantity: 1 }),
      });
      if (response.status === 409) {
        setStatus("limit");
      } else if (response.ok) {
        setStatus("added");
        track(locale, { event: "add_to_cart" });
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    } finally {
      busy.current = false;
    }
  }

  return (
    <>
      <p className="product-price" aria-live="polite">{listedPrice}</p>
      {catalog.state !== "ready" ? (
        <ResourceState state={catalog.state} loading={labels.loadingConfig} error={labels.error}
          retry={catalog.retry} retryLabel={labels.retry} />
      ) : (
        <form className="product-form" onSubmit={add} onChange={() => setStatus("idle")}>
          <fieldset disabled={status === "pending"}>
            <label htmlFor="size">{labels.size}</label>
            <select id="size" name="size" autoComplete="off" value={size} required onChange={(event) => setSize(event.target.value)}>
              <option value="" disabled>{labels.choose}</option>
              {catalog.data.configurations.map(({ id }) => (
                <option key={id} value={id}>{labels[id]}</option>
              ))}
            </select>
            <label htmlFor="climate">{labels.climate}</label>
            <select id="climate" name="climate" defaultValue="balanced">
              {catalog.data.climates.map((climate) => <option key={climate} value={climate}>{labels[climate]}</option>)}
            </select>
            <button type="submit" className="primary-action" data-cta="product_add">
              {status === "pending" ? labels.adding : labels.add} <span aria-hidden="true">↗</span>
            </button>
          </fieldset>
          <div className="form-feedback" role="status">
            {status === "added" && (
              <>
                <span>{labels.added}</span>
                <a href={storePath(locale, "cart")} className="text-action" data-cta="product_view_cart">{labels.viewCart}</a>
              </>
            )}
            {status === "limit" && labels.quantityLimit}
            {status === "error" && labels.error}
          </div>
        </form>
      )}
    </>
  );
}
