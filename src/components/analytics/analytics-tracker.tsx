"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { beginPageView, captureAttribution, track } from "@/lib/analytics/client";

/**
 * Mounted once in the public layout:
 *  - page views on every client-side navigation (+ Metrika hit);
 *  - referral / UTM attribution capture;
 *  - delegated click tracking: tel:, mailto:, [data-cta].
 */
export function AnalyticsTracker({ metrikaId }: { metrikaId?: string }) {
  const pathname = usePathname();
  const first = useRef(true);
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    // Guards against the double effect run of React StrictMode in development.
    if (lastTracked.current === pathname) return;
    lastTracked.current = pathname;
    const isNewSession = beginPageView();
    const { landingRef } = captureAttribution(isNewSession);
    track("page_view", { landingRef, noGoal: true });

    if (!first.current && metrikaId && window.ym) {
      window.ym(Number(metrikaId), "hit", location.href, { referer: document.referrer });
    }
    first.current = false;

    // Drop ?ref= from the address bar so a reload or a shared link is not counted twice.
    if (landingRef) {
      const url = new URL(location.href);
      url.searchParams.delete("ref");
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }
  }, [pathname, metrikaId]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("a, button");
      if (!el) return;
      const href = el.getAttribute("href") ?? "";
      if (href.startsWith("tel:")) track("phone_click", { label: location.pathname });
      else if (href.startsWith("mailto:")) track("email_click", { label: location.pathname });
      const cta = el.dataset.cta;
      if (cta) track("cta_click", { label: cta });
    }
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
