import fs from "node:fs";
import path from "node:path";

let cached: { url: string; at: number } | null = null;

/**
 * Public address of the site. Normally SITE_URL; when PUBLIC_URL_FILE is set (demo tunnel,
 * see scripts/tunnel.mjs) the address is read from that file, so a changed tunnel URL is
 * picked up without restarting the server or the bot.
 */
export function publicSiteUrl(): string {
  const fallback = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const file = process.env.PUBLIC_URL_FILE;
  if (!file) return fallback;
  if (cached && Date.now() - cached.at < 10_000) return cached.url;
  let url = fallback;
  try {
    const v = fs.readFileSync(path.resolve(/* turbopackIgnore: true */ process.cwd(), file), "utf8").trim();
    if (/^https:\/\/[a-z0-9.-]+$/i.test(v)) url = v;
  } catch {
    /* no tunnel yet */
  }
  cached = { url, at: Date.now() };
  return url;
}
