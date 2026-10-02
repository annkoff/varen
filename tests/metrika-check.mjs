/**
 * Verifies that Yandex Metrika is installed and receives page views and goals.
 *   BASE_URL=https://site node --env-file=.env tests/metrika-check.mjs
 * Watches real network requests from the browser to mc.yandex.ru.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const ID = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
const hits = [];
page.on("request", (r) => {
  const u = r.url();
  if (u.includes("mc.yandex.ru") || u.includes("mc.yandex.com")) hits.push(u);
});
page.on("response", (r) => {
  if (r.url().includes("mc.yandex.") && r.url().includes("/watch/")) hits.push(`STATUS ${r.status()} ${r.url().slice(0, 80)}`);
});

await page.goto(BASE + "/", { waitUntil: "load" });
await page.waitForTimeout(4000);
const ymReady = await page.evaluate(() => typeof window.ym === "function");
const scriptTag = await page.locator('script[id="yandex-metrika"]').count();
console.log(`Счётчик ${ID}: скрипт на странице — ${scriptTag ? "да" : "нет"}, ym() — ${ymReady ? "загружен" : "нет"}`);

// Trigger goals: CTA click → navigation, phone click, calculator.
await page.click('a[data-cta="hero_calculate"]');
await page.waitForURL("**/prices**");
await page.waitForTimeout(2500);
await page.getByRole("button", { name: "180 м²" }).click();
await page.waitForTimeout(2500);
await page.evaluate(() => {
  const a = document.querySelector('a[href^="tel:"]');
  a?.addEventListener("click", (e) => e.preventDefault(), { once: true });
  a?.click();
});
await page.waitForTimeout(4000);

const watch = hits.filter((u) => u.includes(`/watch/${ID}`));
const goals = [...new Set(watch.map((u) => decodeURIComponent(u)).map((u) => /goal:\/\/[^/]+\/([a-z_]+)/.exec(u)?.[1]).filter(Boolean))];
const statuses = [...new Set(hits.filter((h) => h.startsWith("STATUS")).map((h) => h.split(" ")[1]))];
console.log(`Запросов к Метрике: ${watch.length}, ответы сервера: ${statuses.join(", ") || "—"}`);
console.log(`Цели, отправленные в Метрику: ${goals.join(", ") || "—"}`);
await browser.close();
process.exit(watch.length && ymReady ? 0 : 1);
