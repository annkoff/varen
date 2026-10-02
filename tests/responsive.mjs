/**
 * Responsive check: no horizontal overflow and no JS errors on every page at 320–1440px,
 * including admin pages (logs in with ADMIN_EMAIL / ADMIN_PASSWORD).
 *   node --env-file=.env tests/responsive.mjs [screenshotDir]
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const shots = process.argv[2];
if (shots) fs.mkdirSync(shots, { recursive: true });
const WIDTHS = [320, 390, 768, 1024, 1440];
const PUBLIC = ["/", "/projects", "/projects/neoklassika-barviha", "/services", "/services/blagoustroystvo-territorii", "/about", "/prices", "/reviews", "/contacts", "/request", "/request/success?n=1", "/privacy", "/nope-404"];
const ADMIN = ["/admin", "/admin/leads", "/admin/leads/1", "/admin/projects", "/admin/projects/new", "/admin/reviews", "/admin/referrals", "/admin/analytics", "/admin/settings"];

const browser = await chromium.launch();
let problems = 0;

async function check(ctx, urls, w) {
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
  for (const u of urls) {
    errors.length = 0;
    await page.goto(BASE + u, { waitUntil: "networkidle" });
    await page.evaluate(() => document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-in")));
    // Elements wider than the viewport (ignores intentionally scrollable containers).
    const offenders = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const out = [];
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || getComputedStyle(el).position === "fixed") continue;
        let p = el.parentElement, scroller = false;
        while (p && p !== document.body) { const ox = getComputedStyle(p).overflowX; if (ox === "auto" || ox === "scroll" || ox === "hidden") { scroller = true; break; } p = p.parentElement; }
        if (!scroller && (r.right > vw + 1 || r.left < -1)) out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}`);
      }
      return { scroll: document.documentElement.scrollWidth - vw, out: out.slice(0, 4) };
    });
    const bad = offenders.scroll > 0 || offenders.out.length > 0 || errors.length > 0;
    if (bad) {
      problems++;
      console.log(`✘ ${w}px ${u}  overflow=${offenders.scroll}px ${offenders.out.join(", ")} ${errors.join(" | ")}`);
    }
    if (shots && (w === 320 || w === 768)) await page.screenshot({ path: path.join(shots, `${w}${u.replace(/[^a-z0-9]+/gi, "_")}.png`), fullPage: false });
  }
  await page.close();
}

for (const w of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 800 } });
  await check(ctx, PUBLIC, w);
  const login = await ctx.newPage();
  await login.goto(BASE + "/admin/login");
  await login.fill("#email", process.env.ADMIN_EMAIL);
  await login.fill("#password", process.env.ADMIN_PASSWORD);
  await login.click('button[type="submit"]');
  await login.waitForURL(BASE + "/admin");
  await login.close();
  await check(ctx, ADMIN, w);
  await ctx.close();
  console.log(`· ${w}px проверено (${PUBLIC.length + ADMIN.length} страниц)`);
}

// Mobile menu opens and links are reachable.
const m = await browser.newContext({ viewport: { width: 320, height: 640 } });
const mp = await m.newPage();
await mp.goto(BASE + "/");
await mp.click('button[aria-controls="mobile-menu"]');
await mp.waitForTimeout(600);
const visible = await mp.locator("#mobile-menu a", { hasText: "Контакты" }).isVisible();
console.log(visible ? "✔ мобильное меню открывается" : "✘ мобильное меню не открылось");
if (!visible) problems++;
if (shots) await mp.screenshot({ path: path.join(shots, "320_menu.png") });
await mp.click('#mobile-menu a:has-text("Контакты")');
await mp.waitForURL("**/contacts");
console.log("✔ переход из мобильного меню");
await browser.close();
console.log(problems ? `✘ Проблем: ${problems}` : "✔ Переполнений и ошибок нет");
process.exit(problems ? 1 : 0);
