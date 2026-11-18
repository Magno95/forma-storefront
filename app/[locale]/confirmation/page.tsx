import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { copy } from "@/lib/copy";
import { isLocale } from "@/lib/model";
import { storePath } from "@/lib/paths";
import { storeMetadata } from "@/lib/seo";
import { money } from "@/lib/store";
import { readReceipt, receiptCookie } from "@/lib/store-server";

type Props = { params: Promise<{ locale: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return storeMetadata(locale, "confirmation", `${copy[locale].confirmation} · Forma`);
}

export default async function Confirmation({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const order = readReceipt((await cookies()).get(receiptCookie)?.value);
  const labels = copy[locale];

  return (
    <section className="light-panel">
      <div className="shell confirmation content-pad">
        <h1 className="page-heading">{order ? labels.confirmation : labels.missingOrder}</h1>
        {order && (
          <>
            <p className="page-description">{labels.confirmationDescription}</p>
            <dl className="receipt">
              <div><dt>{labels.orderNumber}</dt><dd>{order.id.slice(0, 8).toUpperCase()}</dd></div>
              <div><dt>{labels.payment}</dt><dd>{order.payment === "demo-apple-pay" ? labels.applePay : labels.demoCard}</dd></div>
              <div className="summary-total"><dt>{labels.total}</dt><dd>{money(order.total, locale)}</dd></div>
            </dl>
          </>
        )}
        <a className="primary-action" href={storePath(locale, "home")} data-cta="confirmation_home">
          {labels.backHome} <span aria-hidden="true">↗</span>
        </a>
      </div>
    </section>
  );
}
