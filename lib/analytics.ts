import { consentCookie, type Locale } from "./model";
import { pageFromPath } from "./paths";

type StoreEvent =
  | { event: "storefront_view" | "add_to_cart" | "begin_checkout" | "demo_order_completed" }
  | { event: "cta_click"; cta_id: string }
  | { event: "web_vital"; vital_name: "LCP" | "INP" | "CLS" | "TTFB"; vital_value: number; vital_id: string };

export const consentChangeEvent = "forma:analytics-consent";

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

export function analyticsConsent() {
  const cookie = document.cookie.split("; ").find((entry) => entry.startsWith(`${consentCookie}=`));
  return cookie?.slice(consentCookie.length + 1);
}

function dataLayer() {
  return window.dataLayer ??= [];
}

function tagArguments(..._args: unknown[]) {
  // The Google tag API expects an arguments object on the data layer.
  return arguments;
}

export function track(locale: Locale, event: StoreEvent) {
  if (analyticsConsent() !== "granted") return;

  const pathname = window.location.pathname;
  const page = pageFromPath(pathname);
  if (!page) return;

  dataLayer().push({
    ...event,
    locale,
    page_type: page,
    page_location: window.location.origin + pathname,
    cta_id: event.event === "cta_click" ? event.cta_id : null,
  });
}

export function revokeAnalytics() {
  if (window.dataLayer) {
    dataLayer().push(tagArguments("consent", "update", { analytics_storage: "denied" }));
  }
}

export function loadTagManager() {
  const id = process.env.NEXT_PUBLIC_GTM_ID;
  if (!id || !/^GTM-[A-Z0-9]+$/.test(id) || analyticsConsent() !== "granted") return;
  if (document.getElementById("forma-gtm")) return;

  // GTM consumes consent defaults before the gtm.js trigger. The existing
  // queue contains app events emitted while the container was downloading.
  dataLayer().unshift(
    tagArguments("consent", "default", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    }),
    { "gtm.start": Date.now(), event: "gtm.js" },
  );

  const script = document.createElement("script");
  script.id = "forma-gtm";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${id}`;
  document.head.append(script);
}
