import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Consent } from "@/components/consent";
import { StorefrontAnalytics } from "@/components/storefront-analytics";
import { copy } from "@/lib/copy";
import { isLocale, locales } from "@/lib/model";
import { storePath } from "@/lib/paths";
import { isSiteAccessRequired } from "@/lib/site-access";
import "@/app/globals.css";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const labels = copy[locale];
  const alternate = locale === "it" ? "en" : "it";

  return (
    <html lang={locale}>
      <body>
        <header className="site-header">
          <div className="shell site-header-inner">
            <a className="wordmark" href={storePath(locale, "home")} aria-label="Forma Home">forma<span>.</span></a>
            <nav aria-label={locale === "it" ? "Navigazione" : "Navigation"}>
              <a href={storePath(locale, "product")} data-cta="nav_product">{labels.product}</a>
              <a href={storePath(locale, "cart")} data-cta="nav_cart">{labels.cart}</a>
              <a className="locale-link" href={storePath(alternate, "home")} hrefLang={alternate} lang={alternate}>
                {alternate === "it" ? "IT" : "EN"}
              </a>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <div className="shell flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <p>{labels.demo}</p>
            {isSiteAccessRequired() && (
              <form action="/access" method="post">
                <input type="hidden" name="action" value="logout" />
                <input type="hidden" name="next" value={storePath(locale, "home")} />
                <button type="submit" className="footer-action">{locale === "it" ? "Esci" : "Sign out"}</button>
              </form>
            )}
            <Consent labels={{
              privacy: labels.privacy,
              consentTitle: labels.consentTitle,
              consentDescription: labels.consentDescription,
              accept: labels.accept,
              decline: labels.decline,
              error: labels.error,
            }} />
          </div>
        </footer>
        <StorefrontAnalytics locale={locale} />
      </body>
    </html>
  );
}
