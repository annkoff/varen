/**
 * Visual check helper: full-page screenshots at several widths + console errors.
 *   node scripts/screenshot.mjs <outDir> <path> [width ...]
 *   node scripts/screenshot.mjs ./shots / 1440 390
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const [outDir = "./shots", urlPath = "/", ...widthsRaw] = process.argv.slice(2);
const widths = widthsRaw.length ? widthsRaw.map(Number) : [1440, 820, 390];
const base = process.env.BASE_URL ?? "http://localhost:3000";
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
for (const w of widths) {
  const context = await browser.newContext({ viewport: { width: w, height: w < 600 ? 844 : 900 }, deviceScaleFactor: 1 });
  // LOGIN=1 signs in to the admin first (ADMIN_EMAIL / ADMIN_PASSWORD).
  if (process.env.LOGIN) {
    const lp = await context.newPage();
    await lp.goto(base + "/admin/login");
    await lp.fill("#email", process.env.ADMIN_EMAIL);
    await lp.fill("#password", process.env.ADMIN_PASSWORD);
    await lp.click('button[type="submit"]');
    await lp.waitForURL(base + "/admin");
    await lp.close();
  }
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(base + urlPath, { waitUntil: "networkidle", timeout: 90_000 });
  // Trigger reveal animations and lazy images.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-in"));
  });
  await page.waitForTimeout(1200);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const name = `${urlPath.replace(/[^a-z0-9]+/gi, "_") || "home"}_${w}.png`;
  await page.screenshot({ path: path.join(outDir, name), fullPage: true });
  console.log(`${name}  overflowX=${overflow}px  errors=${errors.length}`);
  for (const e of errors) console.log("   ", e.slice(0, 300));
  await page.close();
}
await browser.close();
