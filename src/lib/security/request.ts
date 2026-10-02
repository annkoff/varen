import "server-only";
import { createHash } from "node:crypto";

export function getClientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}

/** Short irreversible fingerprint of the IP — used only as a rate-limit key, never stored with leads. */
export function ipKey(headers: Headers): string {
  return createHash("sha256").update(getClientIp(headers)).digest("hex").slice(0, 16);
}

/** Basic CSRF defence for JSON/multipart endpoints: the Origin must match the host. */
export function isSameOrigin(headers: Headers): boolean {
  const origin = headers.get("origin");
  if (!origin) return true; // sendBeacon & same-origin navigations may omit it
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function deviceTypeFromUA(ua: string | null): string {
  if (!ua) return "unknown";
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobile|iphone|android/i.test(ua)) return "mobile";
  return "desktop";
}

export function isBot(ua: string | null): boolean {
  return !ua || /bot|crawler|spider|slurp|lighthouse|preview|facebookexternalhit|yandex(bot|metrika)/i.test(ua);
}
