"use client";

import { useEffect, useState } from "react";

type Resource<T> =
  | { state: "loading" | "error"; data?: undefined }
  | { state: "ready"; data: T };

export function useMockResource<T>(url: string) {
  const [resource, setResource] = useState<Resource<T>>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error("Request failed");
        const data = await response.json() as T;
        if (!controller.signal.aborted) setResource({ state: "ready", data });
      } catch {
        if (!controller.signal.aborted) setResource({ state: "error" });
      }
    }
    void load();
    return () => controller.abort();
  }, [url, attempt]);

  function retry() {
    setResource({ state: "loading" });
    setAttempt((current) => current + 1);
  }

  return { ...resource, retry };
}
