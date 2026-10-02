/**
 * Pre-generates every optimized image size (next/image cache) so the first visitor never
 * waits for photos.  Run after `npm run start`:  npm run images:warm
 */
const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const pages = new Set(["/", "/projects", "/services", "/about", "/prices", "/reviews", "/contacts", "/request", "/privacy", "/request/success"]);

const html = async (p) => (await fetch(BASE + p)).text();
const decode = (s) => s.replace(/&amp;/g, "&");

// Discover project and service pages from the listings.
for (const p of ["/projects", "/services"]) {
  for (const m of (await html(p)).matchAll(/href="(\/(?:projects|services)\/[a-z0-9-]+)"/g)) pages.add(m[1]);
}

const urls = new Set();
for (const p of pages) {
  const body = await html(p);
  for (const m of body.matchAll(/\/_next\/image\?url=[^"\s,]+/g)) urls.add(decode(m[0]));
}

let done = 0, failed = 0;
const list = [...urls];
const worker = async () => {
  while (list.length) {
    const u = list.pop();
    const res = await fetch(BASE + u, { headers: { accept: "image/webp,image/*" } }).catch(() => null);
    if (res?.ok) {
      await res.arrayBuffer();
      done++;
    } else failed++;
  }
};
await Promise.all(Array.from({ length: 6 }, worker));
console.log(`pages: ${pages.size}, images warmed: ${done}, failed: ${failed}`);
