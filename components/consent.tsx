"use client";

import { useEffect, useRef, useState } from "react";
import { analyticsConsent, consentChangeEvent, revokeAnalytics } from "@/lib/analytics";
import type { Copy } from "@/lib/copy";

type ConsentCopy = Pick<Copy, "privacy" | "consentTitle" | "consentDescription" | "accept" | "decline" | "error">;

export function Consent({ labels }: { labels: ConsentCopy }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => { setOpen(!analyticsConsent()); }, []);

  async function choose(choice: "granted" | "denied") {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(false);
    try {
      const prior = analyticsConsent();
      const response = await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice }),
      });
      if (!response.ok) throw new Error("Consent update failed");
      if (choice === "denied") revokeAnalytics();
      if (choice === "denied" && prior === "granted") {
        window.location.reload();
        return;
      }
      if (choice !== prior) window.dispatchEvent(new Event(consentChangeEvent));
      setOpen(false);
    } catch {
      setError(true);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      <button className="footer-action" type="button" onClick={() => setOpen(!open)} aria-expanded={open}>
        {labels.privacy}
      </button>
      {open && (
        <aside className="consent-panel" aria-labelledby="consent-title">
          <h2 id="consent-title">{labels.consentTitle}</h2>
          <p>{labels.consentDescription}</p>
          <div className="consent-actions">
            <button type="button" disabled={busy} onClick={() => choose("denied")}>{labels.decline}</button>
            <button type="button" disabled={busy} onClick={() => choose("granted")}>{labels.accept}</button>
          </div>
          {error && <p role="alert">{labels.error}</p>}
        </aside>
      )}
    </>
  );
}
