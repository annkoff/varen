"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics/client";

/** Fires `contacts_open` once when the contacts block scrolls into view. */
export function ContactsOpenTracker() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current?.parentElement;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        track("contacts_open", { label: location.pathname });
        io.disconnect();
      }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <span ref={ref} hidden />;
}
