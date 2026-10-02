/**
 * End-to-end check of the full user path (spec §35) against a running server.
 *   BASE_URL=http://localhost:3000 ADMIN_EMAIL=... ADMIN_PASSWORD=... node --env-file=.env tests/e2e.mjs
 * Uses a real browser (Playwright/Chromium) and verifies results directly in the database.
 */
import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";
import sharp from "sharp";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const db = new PrismaClient();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "varen-e2e-"));
let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? "  ✔" : "  ✘"} ${msg}`);
  if (!cond) failures++;
};
const step = (s) => console.log(`\n▸ ${s}`);

// ─── Fixtures ───
const pdf = path.join(tmp, "Планировка дома.pdf");
fs.writeFileSync(pdf, "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
const png = path.join(tmp, "facade-reference.png");
await sharp({ create: { width: 400, height: 300, channels: 3, background: "#887766" } }).png().toFile(png);
const jpg = path.join(tmp, "interior.jpg");
await sharp({ create: { width: 400, height: 300, channels: 3, background: "#334455" } }).jpeg().toFile(jpg);
const fake = path.join(tmp, "virus.pdf");
fs.writeFileSync(fake, "MZ this is not a pdf");

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const consoleErrors = [];
page.on("pageerror", (e) => consoleErrors.push(String(e)));

// Unique phone per run: the server allows max 3 leads per phone in 10 minutes (anti-spam).
const phoneDigits = () => String(Math.floor(1_000_000 + Math.random() * 8_999_999));
let lastPhone = "";
async function fillLeadForm(p, name) {
  await p.fill("#name", name);
  const d = phoneDigits();
  lastPhone = `+7999${d}`;
  await p.fill("#phone", `+7 (999) ${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`);
  await p.fill("#email", "e2e@example.com");
  await p.fill("#region", "Московская область");
}

try {
  step("1–4. Главная, проект, галерея, услуги");
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  ok((await page.title()).includes("VAREN"), "главная открылась, title содержит VAREN");
  ok((await page.locator("h1").count()) === 1, "на главной ровно один h1");
  await page.click("text=Смотреть проекты");
  await page.waitForURL("**/projects");
  const cards = await page.locator('a[href^="/projects/"]').count();
  ok(cards >= 12, `в каталоге ${cards} ссылок на проекты (ожидается ≥ 12)`);
  await page.locator('a[href^="/projects/"]').first().click();
  await page.waitForURL(/\/projects\/[a-z0-9-]+$/);
  ok(await page.getByText("В этом проекте выполнено").isVisible(), "страница проекта: блок «В этом проекте выполнено»");
  await page.locator('button[aria-label^="Открыть фото"]').first().click();
  ok(await page.locator('[role="dialog"]').isVisible(), "галерея: лайтбокс открылся");
  await page.keyboard.press("ArrowRight");
  ok((await page.locator('[role="dialog"]').innerText()).includes("02 /"), "галерея: переключение стрелкой");
  await page.keyboard.press("Escape");
  ok(!(await page.locator('[role="dialog"]').isVisible()), "галерея: закрытие по Esc");
  await page.goto(BASE + "/services", { waitUntil: "networkidle" });
  ok((await page.locator("h2").count()) >= 5, "услуги: 5 направлений");

  step("5–10. Калькулятор");
  await page.goto(BASE + "/prices#calculator", { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.removeItem("varen_calc_v1"));
  await page.reload({ waitUntil: "networkidle" });
  const total = () => page.locator('[data-testid="calc-total"]').innerText();
  const t0 = await total();
  await page.getByRole("button", { name: "180 м²" }).click();
  const t1 = await total();
  ok(t1 !== t0, `площадь 180 м²: ${t0} → ${t1}`);
  await page.getByRole("button", { name: "Кирпич", exact: true }).click();
  const t2 = await total();
  ok(t2 !== t1, `материал кирпич: → ${t2}`);
  await page.getByRole("button", { name: /^Предчистовая/ }).click();
  const t3 = await total();
  ok(t3 !== t2, `комплектация предчистовая: → ${t3}`);
  await page.getByRole("button", { name: /^Под ключ/ }).click();
  await page.getByRole("switch", { name: /Ландшафтный проект/ }).click();
  await page.getByRole("switch", { name: /^Газон/ }).click();
  const lawn = page.getByLabel("Площадь газона, м²");
  await lawn.fill("300");
  await lawn.blur();
  const t4 = await total();
  // 180 × 110 000 × 1.12 × 1.0 + 150 000 + 300 × 800 = 22 176 000 + 390 000 = 22 566 000 → round 10 000
  ok(t4.replace(/\D/g, "") === "22570000", `под ключ + ландшафт + газон 300 м² = ${t4} (ожидается 22 570 000 ₽)`);
  ok(await page.getByText("Расчёт является предварительным").first().isVisible(), "дисклеймер о предварительном расчёте");

  step("11–14. Заявка с расчётом и файлами");
  await page.click('[data-testid="calc-request"]');
  await page.waitForURL("**/request?from=calculator");
  await page.waitForSelector('[data-testid="calc-summary"]');
  const summary = await page.locator('[data-testid="calc-summary"]').innerText();
  ok(summary.includes("180 м²") && summary.includes("Кирпич") && summary.includes("Под ключ") && summary.includes("300 м²"), "параметры калькулятора подставились в заявку");

  // validation: empty submit
  await page.click('[data-testid="lead-submit"]');
  ok(await page.getByText("Укажите имя").isVisible(), "валидация: пустое имя");
  ok(await page.getByText("Нужно согласие").isVisible(), "валидация: согласие обязательно");

  await fillLeadForm(page, "E2E Тестовый клиент");
  const firstPhone = lastPhone;
  await page.fill("#description", "Автотест: заявка с расчётом и файлами.");
  await page.locator('input[type="file"]').setInputFiles([pdf, png, jpg, fake]);
  await page.waitForFunction(() => !document.body.innerText.includes("Загрузка…"), null, { timeout: 30_000 });
  const filesText = await page.locator('[aria-label="Выбранные файлы"]').innerText();
  ok((filesText.match(/загружен/g) ?? []).length === 3, "3 корректных файла загружены (с прогрессом)");
  ok(filesText.includes("не соответствует"), "поддельный PDF отклонён по сигнатуре");
  await page.locator('input[type="file"]').setInputFiles([png, png, jpg]);
  await page.waitForFunction(() => !document.body.innerText.includes("Загрузка…"), null, { timeout: 30_000 });
  ok(await page.getByText(/не больше 5 файлов|максимум 5 файлов/).first().isVisible(), "лимит 5 файлов соблюдается");

  await page.check('input[name="consent"]');
  await page.waitForTimeout(2600); // anti-bot minimal fill time
  const submit = page.locator('[data-testid="lead-submit"]');
  await submit.dblclick(); // double click must not create two leads
  await page.waitForURL(/\/request\/success\?n=\d+/, { timeout: 30_000 });
  const leadId = Number(new URL(page.url()).searchParams.get("n"));
  ok(leadId > 0, `страница успеха, заявка №${leadId}`);

  step("15–17. Проверка в БД");
  await new Promise((r) => setTimeout(r, 1500));
  const lead = await db.lead.findUnique({ where: { id: leadId }, include: { files: true } });
  ok(!!lead, "заявка сохранена в БД");
  ok((await db.lead.count({ where: { name: "E2E Тестовый клиент", createdAt: { gt: new Date(Date.now() - 120_000) } } })) === 1, "двойной клик не создал дубль");
  ok(lead?.files.length === 5, `файлы привязаны к заявке: ${lead?.files.length} (3 + 2 до лимита)`);
  ok(lead?.calcArea === 180 && lead?.calcMaterial === "Кирпич" && lead?.calcPackage === "Под ключ", "параметры калькулятора в БД");
  ok(lead?.estimatedPrice === 22_570_000, `предварительная стоимость пересчитана сервером: ${lead?.estimatedPrice}`);
  ok(lead?.phone === firstPhone, `телефон нормализован: ${lead?.phone}`);
  ok(["SENT", "SKIPPED", "FAILED"].includes(lead?.telegramStatus ?? ""), `Telegram: статус ${lead?.telegramStatus}${lead?.telegramError ? ` (${lead.telegramError})` : ""}`);
  const storageDir = path.resolve(process.env.STORAGE_LOCAL_DIR ?? "./storage");
  if ((process.env.STORAGE_DRIVER ?? "local") === "local") {
    ok(lead?.files.every((f) => fs.existsSync(path.join(storageDir, f.storageKey))), "файлы физически лежат в хранилище");
  }

  step("18. Защита админки");
  const anon = await browser.newContext();
  const ap = await anon.newPage();
  await ap.goto(BASE + "/admin/leads");
  ok(ap.url() === BASE + "/admin/login", "без входа /admin → /admin/login (тот же origin)");
  const r401 = await ap.request.get(BASE + "/api/admin/leads/export");
  ok(r401.status() === 401, `экспорт без входа → ${r401.status()}`);
  const rf = await ap.request.get(BASE + `/api/admin/files/${lead?.files[0].id}`);
  ok(rf.status() === 401, `файл клиента без входа → ${rf.status()}`);
  const forged = await anon.newPage();
  await anon.addCookies([{ name: "varen_admin", value: "forged-token", url: BASE }]);
  await forged.goto(BASE + "/admin");
  ok(forged.url().endsWith("/admin/login"), "поддельная cookie не пускает в админку");
  await ap.goto(BASE + "/admin/login");
  await ap.fill("#email", process.env.ADMIN_EMAIL);
  await ap.fill("#password", "wrong-password-123");
  await ap.click('button[type="submit"]');
  ok(await ap.getByText("Неверный email или пароль").waitFor({ timeout: 15_000 }).then(() => true, () => false), "неверный пароль отклонён");
  for (let i = 0; i < 5; i++) {
    await ap.fill("#email", "brute-force@example.com");
    await ap.fill("#password", `guess-${i}-password`);
    await Promise.all([ap.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/admin/login")), ap.click('button[type="submit"]')]);
  }
  await ap.fill("#password", "guess-final-password");
  await ap.click('button[type="submit"]');
  ok(await ap.getByText("Слишком много неудачных попыток").waitFor({ timeout: 15_000 }).then(() => true, () => false), "перебор пароля блокируется после 5 попыток");
  await anon.close();

  step("18–22. Админка: вход, заявка, файлы, статус, Excel");
  await page.goto(BASE + "/admin/login");
  await page.fill("#email", process.env.ADMIN_EMAIL);
  await page.fill("#password", process.env.ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(BASE + "/admin");
  ok(await page.getByRole("heading", { name: "Дашборд" }).isVisible(), "вход выполнен, дашборд");
  const cookie = (await ctx.cookies()).find((c) => c.name === "varen_admin");
  ok(cookie?.httpOnly === true && cookie?.sameSite === "Lax", "сессионная cookie httpOnly + SameSite=Lax");
  await page.goto(BASE + `/admin/leads?q=${encodeURIComponent("E2E Тестовый")}`);
  ok((await page.locator(`a[href="/admin/leads/${leadId}"]`).count()) > 0, "поиск заявок находит новую заявку");
  await page.goto(BASE + `/admin/leads/${leadId}`);
  ok(await page.getByText("22 570 000 ₽").first().isVisible(), "карточка заявки: стоимость");
  ok(await page.getByText("Планировка дома.pdf").isVisible(), "карточка заявки: имя файла");
  const dl = await page.request.get(BASE + `/api/admin/files/${lead?.files[0].id}`);
  const body = await dl.body();
  ok(dl.status() === 200 && body.length > 10, `скачивание файла: ${dl.status()}, ${body.length} байт, ${dl.headers()["content-type"]}`);
  await page.selectOption('select[aria-label="Статус заявки"]', "IN_PROGRESS");
  await page.waitForTimeout(1500);
  ok((await db.lead.findUnique({ where: { id: leadId } }))?.status === "IN_PROGRESS", "статус «В работе» сохранён в БД");
  const xr = await page.request.get(BASE + "/api/admin/leads/export");
  const xbuf = await xr.body();
  ok(xr.headers()["content-type"]?.includes("spreadsheetml"), "экспорт: MIME xlsx");
  ok(xbuf[0] === 0x50 && xbuf[1] === 0x4b, "экспорт: файл — ZIP-контейнер Office Open XML (не CSV)");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(xbuf);
  const ws = wb.getWorksheet("Заявки");
  const header = ws.getRow(1).values.filter(Boolean);
  ok(["ID", "Дата", "Имя", "Телефон", "Email", "Регион", "Услуги", "Площадь, м²", "Описание", "Комплектация", "Материал", "Этажность", "Предварительная стоимость, ₽", "Источник", "Реферальный код", "Статус"].every((h) => header.includes(h)), "экспорт: все обязательные колонки");
  ok(ws.rowCount - 1 === (await db.lead.count()), `экспорт: строк ${ws.rowCount - 1} = заявок в БД`);
  fs.writeFileSync(path.join(tmp, "export.xlsx"), xbuf);

  step("23–27. Реферальная ссылка и сохранение источника");
  const refName = `E2E кампания ${Date.now() % 100000}`;
  await page.goto(BASE + "/admin/referrals");
  await page.fill('input[name="name"]', refName);
  await page.click("text=Создать ссылку");
  await page.getByText("Ссылка создана").waitFor();
  const link = await db.referralLink.findFirst({ where: { name: refName } });
  ok(!!link, `ссылка создана, код «${link?.code}»`);

  const visitor = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" });
  const vp = await visitor.newPage();
  await vp.goto(BASE + `/r/${link.code}?utm_source=e2e&utm_campaign=spring`, { waitUntil: "networkidle" });
  ok(await vp.waitForFunction(() => !location.search.includes("ref="), null, { timeout: 5000 }).then(() => true, () => false), "после /r/<code> параметр ref убран из адресной строки");
  await vp.waitForTimeout(800);
  await vp.goto(BASE + "/projects", { waitUntil: "networkidle" });
  await vp.locator('a[href^="/projects/"]').nth(3).click();
  await vp.waitForURL(/\/projects\/.+/);
  await vp.goto(BASE + "/prices#calculator", { waitUntil: "networkidle" });
  await vp.getByRole("button", { name: "120 м²" }).click();
  await vp.locator('[data-testid="calc-request"]').click();
  await vp.waitForURL("**/request?from=calculator");
  await fillLeadForm(vp, "E2E Реферальный клиент");
  await vp.check('input[name="consent"]');
  await vp.waitForTimeout(2600);
  await vp.click('[data-testid="lead-submit"]');
  await vp.waitForURL(/\/request\/success\?n=\d+/, { timeout: 30_000 });
  const refLeadId = Number(new URL(vp.url()).searchParams.get("n"));
  const refLead = await db.lead.findUnique({ where: { id: refLeadId } });
  ok(refLead?.refCode === link.code && refLead?.referralLinkId === link.id, `источник сохранился через 4 страницы: ${refLead?.source}`);
  ok(refLead?.utmSource === "e2e" && refLead?.utmCampaign === "spring", "UTM-метки сохранены");
  ok(refLead?.landingPage?.startsWith("/?ref=") === true, `страница входа: ${refLead?.landingPage}`);
  ok(refLead?.deviceType === "mobile", "тип устройства: mobile");
  await visitor.close();

  step("28. Статистика");
  const clicks = await db.referralClick.count({ where: { referralLinkId: link.id } });
  ok(clicks === 1, `клики по ссылке: ${clicks}`);
  await page.goto(BASE + "/admin/referrals");
  const row = page.locator("tr", { hasText: refName });
  const cells = await row.locator("td").allInnerTexts();
  ok(cells[3]?.trim() === "1" && cells[4]?.trim() === "1" && cells[5]?.trim() === "1", `таблица ссылок: клики ${cells[3]}, уникальные ${cells[4]}, заявки ${cells[5]}, конверсия ${cells[6]}`);
  for (const period of ["today", "yesterday", "7d", "30d", "month", "year"]) {
    const res = await page.goto(BASE + `/admin/analytics?period=${period}`);
    ok(res?.status() === 200 && (await page.getByText("Когорты по неделе первого визита").isVisible()), `аналитика за период ${period}`);
  }
  const todayLeads = await page.goto(BASE + "/admin/analytics?period=today").then(() => page.locator("text=Заявки").first().isVisible());
  ok(todayLeads, "аналитика: KPI отображаются");
  await page.locator(".recharts-surface").nth(2).waitFor({ timeout: 10_000 }).catch(() => undefined);
  ok((await page.locator(".recharts-surface").count()) >= 3, "аналитика: графики отрисованы");
  const events = await db.event.groupBy({ by: ["type"], where: { createdAt: { gt: new Date(Date.now() - 10 * 60_000) } }, _count: { _all: true } });
  const types = events.map((e) => e.type);
  for (const t of ["page_view", "project_view", "gallery_open", "calculator_start", "calculator_change", "form_start", "form_submit", "cta_click"]) ok(types.includes(t), `событие ${t} записано`);

  step("Каталог: создание проекта, фото, публикация, удаление");
  const title = `E2E Проект ${Date.now() % 100000}`;
  await page.goto(BASE + "/admin/projects/new");
  await page.fill('input[name="title"]', title);
  await page.fill('input[name="location"]', "Тестовая область");
  await page.fill('input[name="style"]', "Минимализм");
  await page.fill('textarea[name="summary"]', "Короткое описание тестового проекта для проверки.");
  await page.fill('textarea[name="description"]', "Полное описание тестового проекта.\n\nВторой абзац.");
  await page.fill('input[name="area"]', "175");
  await page.fill('input[name="material"]', "Газобетон");
  await page.fill('textarea[name="worksDone"]', "Фундамент\nКоробка\nКровля");
  await page.click("text=Создать проект");
  await page.waitForURL(/\/admin\/projects\/[a-z0-9]+\?created=1/);
  const created = await db.project.findFirst({ where: { title } });
  ok(!!created, `проект создан в БД (slug: ${created?.slug})`);
  await page.locator('input[type="file"]').setInputFiles([jpg]);
  await page.getByText("Загружено фото: 1").waitFor({ timeout: 30_000 });
  const img = await db.projectImage.findFirst({ where: { projectId: created.id } });
  ok(img?.url.startsWith("/media/media/") && img.storageKey, `фото загружено и сжато в WebP: ${img?.url}`);
  const media = await page.request.get(BASE + img.url);
  ok(media.status() === 200 && media.headers()["content-type"] === "image/webp", "фото отдаётся публично через /media");
  const pub = await browser.newContext();
  const pp = await pub.newPage();
  const pr = await pp.goto(BASE + `/projects/${created.slug}`);
  ok(pr.status() === 200 && (await pp.getByRole("heading", { name: title }).isVisible()), "проект виден на сайте");
  await page.goto(BASE + "/admin/projects");
  await page.locator("li", { hasText: title }).getByRole("button", { name: "Скрыть" }).click();
  await page.waitForTimeout(1200);
  const hidden = await pp.goto(BASE + `/projects/${created.slug}`);
  ok(hidden.status() === 404, `скрытый проект недоступен на сайте → ${hidden.status()}`);
  await pub.close();
  await page.goto(BASE + `/admin/projects/${created.id}`);
  await page.getByRole("button", { name: "Удалить проект" }).click();
  await page.getByRole("button", { name: "Да, удалить" }).click();
  await page.waitForURL(BASE + "/admin/projects");
  ok(!(await db.project.findUnique({ where: { id: created.id } })), "проект удалён вместе с фото");

  const wh = await page.request.post(BASE + "/api/telegram/webhook", { data: { message: { chat: { id: 1 }, text: "/leads" } } });
  ok(wh.status() === 401, `Telegram webhook без секрета → ${wh.status()}`);

  ok(consoleErrors.length === 0, `ошибок JS в браузере: ${consoleErrors.length}${consoleErrors.length ? " — " + consoleErrors.join(" | ") : ""}`);
} catch (e) {
  failures++;
  console.error("\n✘ Сценарий прерван:", e);
  await page.screenshot({ path: path.join(tmp, "failure.png"), fullPage: true }).catch(() => undefined);
} finally {
  await browser.close();
  if (!process.env.KEEP_E2E) {
    // Remove what this run created so the demo database stays clean.
    const leads = await db.lead.findMany({ where: { name: { startsWith: "E2E " } }, include: { files: true } });
    const dir = path.resolve(process.env.STORAGE_LOCAL_DIR ?? "./storage");
    for (const f of leads.flatMap((l) => l.files)) fs.rmSync(path.join(dir, f.storageKey), { force: true });
    await db.lead.deleteMany({ where: { id: { in: leads.map((l) => l.id) } } });
    await db.referralLink.deleteMany({ where: { name: { startsWith: "E2E " } } });
    await db.visitor.deleteMany({ where: { events: { some: { source: { startsWith: "ref:e2e-" } } } } });
    console.log(`\n(очищено тестовых заявок: ${leads.length})`);
  }
  await db.$disconnect();
  console.log(`\n${failures ? `✘ Проблем: ${failures}` : "✔ Все проверки пройдены"}  (артефакты: ${tmp})`);
  process.exit(failures ? 1 : 0);
}
