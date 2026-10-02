"use client";

import { REF_CODE_RE, resolveSource, type Attribution, type EventType } from "./events";

const VID_KEY = "varen_vid";
const SESSION_KEY = "varen_sid";
const ATTR_KEY = "varen_attr";
const SESSION_SOURCE_KEY = "varen_ssrc";
const SESSION_TIMEOUT = 30 * 60 * 1000;
const ATTRIBUTION_TTL = 90 * 24 * 60 * 60 * 1000;

declare global {
  interface Window {
    ym?: (id: number, method: string, ...args: unknown[]) => void;
  }
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function setCookie(name: string, value: string, maxAgeSec: number) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSec}; Path=/; SameSite=Lax${secure}`;
}

export function getVisitorId(): string {
  return safe(() => {
    let id = localStorage.getItem(VID_KEY);
    if (!id) {
      id = uuid();
      localStorage.setItem(VID_KEY, id);
    }
    setCookie(VID_KEY, id, 365 * 24 * 3600);
    return id;
  }, "00000000-0000-4000-8000-000000000000");
}

/** A session ends after 30 minutes of inactivity. Returns [id, isNew]. */
function touchSession(): [string, boolean] {
  return safe<[string, boolean]>(() => {
    const now = Date.now();
    const raw = sessionStorage.getItem(SESSION_KEY);
    const s = raw ? (JSON.parse(raw) as { id: string; last: number }) : null;
    if (s && now - s.last < SESSION_TIMEOUT) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: s.id, last: now }));
      return [s.id, false];
    }
    const id = uuid();
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id, last: now }));
    return [id, true];
  }, [uuid(), true]);
}

export function getAttribution(): Attribution | null {
  return safe(() => {
    const raw = localStorage.getItem(ATTR_KEY);
    if (!raw) return null;
    const a = JSON.parse(raw) as Attribution;
    if (Date.now() - a.ts > ATTRIBUTION_TTL) return null;
    return a;
  }, null);
}

function sessionSource(): string {
  return safe(() => sessionStorage.getItem(SESSION_SOURCE_KEY) ?? "direct", "direct");
}

/**
 * Reads ?ref= and utm_* from the current URL and the external referrer.
 * Last non-direct touch wins and is kept for 90 days (localStorage + cookie),
 * so the source survives navigation across the site and later visits.
 */
export function captureAttribution(isNewSession: boolean): { landingRef: string | null } {
  const url = new URL(location.href);
  const p = url.searchParams;
  const refRaw = p.get("ref")?.toLowerCase().trim() ?? null;
  const ref = refRaw && REF_CODE_RE.test(refRaw) ? refRaw : null;
  const utm = {
    utmSource: p.get("utm_source") ?? undefined,
    utmMedium: p.get("utm_medium") ?? undefined,
    utmCampaign: p.get("utm_campaign") ?? undefined,
    utmContent: p.get("utm_content") ?? undefined,
    utmTerm: p.get("utm_term") ?? undefined,
  };
  const referrer = isNewSession && document.referrer ? document.referrer : undefined;
  const source = resolveSource({ ref, utmSource: utm.utmSource, referrer, host: location.host });

  if (isNewSession || source !== "direct") {
    safe(() => sessionStorage.setItem(SESSION_SOURCE_KEY, source), undefined);
  }

  if (source !== "direct") {
    const attr: Attribution = {
      source,
      ref: ref ?? undefined,
      ...Object.fromEntries(Object.entries(utm).map(([k, v]) => [k, v?.slice(0, 120)])),
      landingPage: (url.pathname + url.search).slice(0, 300),
      referrer: referrer?.slice(0, 300),
      ts: Date.now(),
    };
    safe(() => localStorage.setItem(ATTR_KEY, JSON.stringify(attr)), undefined);
    if (ref) setCookie("varen_ref", ref, 90 * 24 * 3600);
  }
  return { landingRef: ref };
}

export function metrikaGoal(goal: string, params?: Record<string, unknown>) {
  const id = Number(process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID);
  if (!id || typeof window === "undefined" || !window.ym) return;
  window.ym(id, "reachGoal", goal, params);
}

interface TrackOptions {
  label?: string;
  meta?: Record<string, string | number | boolean>;
  landingRef?: string | null;
  /** Skip the Metrika goal (page views are sent to Metrika as hits instead). */
  noGoal?: boolean;
}

export function track(type: EventType, opts: TrackOptions = {}) {
  if (typeof window === "undefined") return;
  const [sessionId, isNew] = touchSession();
  const attr = getAttribution();
  const payload = {
    type,
    visitorId: getVisitorId(),
    sessionId,
    newSession: isNew,
    path: location.pathname.slice(0, 300),
    label: opts.label?.slice(0, 120),
    meta: opts.meta,
    source: sessionSource(),
    refCode: attr?.ref,
    landingRef: opts.landingRef ?? undefined,
  };
  const body = JSON.stringify(payload);
  const sent = safe(() => navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" })) ?? false, false);
  if (!sent) {
    fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => undefined);
  }
  if (!opts.noGoal) metrikaGoal(type, opts.label ? { label: opts.label } : undefined);
}

/** Starts/extends the session and returns whether it is new — used by the page-view tracker. */
export function beginPageView(): boolean {
  return touchSession()[1];
}
