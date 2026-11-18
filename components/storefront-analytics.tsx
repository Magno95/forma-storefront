"use client";

import { useEffect, useRef } from "react";
import type { CLSMetric, INPMetric, LCPMetric, TTFBMetric } from "web-vitals";
import { analyticsConsent, consentChangeEvent, loadTagManager, track } from "@/lib/analytics";
import type { Locale } from "@/lib/model";

export function StorefrontAnalytics({ locale }: { locale: Locale }) {
  const tracked = useRef(false);

  useEffect(() => {
    let idle: number | undefined;
    let timer: number | undefined;

    function scheduleTagManager() {
      if (typeof window.requestIdleCallback === "function") {
        idle = window.requestIdleCallback(loadTagManager, { timeout: 1500 });
      } else {
        timer = window.setTimeout(loadTagManager, 300);
      }
    }

    function activate() {
      if (document.visibilityState !== "visible" || analyticsConsent() !== "granted") return;
      if (!tracked.current) {
        tracked.current = true;
        track(locale, { event: "storefront_view" });
        import("web-vitals").then(({ onLCP, onINP, onCLS, onTTFB }) => {
          const report = ({ name, value, id }: CLSMetric | INPMetric | LCPMetric | TTFBMetric) =>
            track(locale, { event: "web_vital", vital_name: name, vital_value: value, vital_id: id });

          onLCP(report);
          onINP(report);
          onCLS(report);
          onTTFB(report);
        }).catch(() => {
          // The storefront remains usable if a measurement chunk fails to load.
        });
      }
      if (document.readyState === "complete") scheduleTagManager();
      else window.addEventListener("load", scheduleTagManager, { once: true });
    }

    function recordClick(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;
      const cta = event.target.closest<HTMLElement>("[data-cta]")?.dataset.cta;
      if (cta) track(locale, { event: "cta_click", cta_id: cta });
    }

    activate();
    document.addEventListener("visibilitychange", activate);
    document.addEventListener("click", recordClick);
    window.addEventListener(consentChangeEvent, activate);

    return () => {
      window.removeEventListener(consentChangeEvent, activate);
      window.removeEventListener("load", scheduleTagManager);
      document.removeEventListener("visibilitychange", activate);
      document.removeEventListener("click", recordClick);
      if (idle !== undefined) window.cancelIdleCallback(idle);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [locale]);

  return null;
}
