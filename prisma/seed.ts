import { PrismaClient, type LeadStatus, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { SEED_PROJECTS, SEED_REFERRALS, SEED_REVIEWS } from "./seed-data";
import { DEFAULT_PRICING, DEFAULT_INPUT, calculate, type CalculatorInput } from "../src/lib/calculator";
import { DEFAULT_CONTACTS } from "../src/content/site";

const db = new PrismaClient();
const img = (n: number) => `/images/photos/ph-${n}.webp`;

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("• ADMIN_EMAIL / ADMIN_PASSWORD not set — admin not created (use `npm run admin:create`).");
    return;
  }
  if (password.length < 10) throw new Error("ADMIN_PASSWORD must be at least 10 characters");
  const existing = await db.admin.findUnique({ where: { email } });
  if (existing) {
    console.log(`• Admin ${email} already exists — password left unchanged.`);
    return;
  }
  await db.admin.create({ data: { email, passwordHash: await bcrypt.hash(password, 12) } });
  console.log(`• Admin created: ${email}`);
}

async function seedCatalog() {
  for (const [i, p] of SEED_PROJECTS.entries()) {
    const { images, ...data } = p;
    const project = await db.project.upsert({
      where: { slug: p.slug },
      create: { ...data, sortOrder: i },
      update: { ...data, sortOrder: i },
    });
    // Replace only seed images; photos uploaded via the admin (storageKey set) are kept.
    await db.projectImage.deleteMany({ where: { projectId: project.id, storageKey: null } });
    await db.projectImage.createMany({
      data: images.map(([n, category, alt], idx) => ({ projectId: project.id, url: img(n), alt, category, sortOrder: idx })),
    });
  }
  console.log(`• Projects: ${SEED_PROJECTS.length}`);

  await db.review.deleteMany({ where: { isDemo: true } });
  for (const [i, r] of SEED_REVIEWS.entries()) {
    const project = r.projectSlug ? await db.project.findUnique({ where: { slug: r.projectSlug } }) : null;
    await db.review.create({
      data: { authorName: r.authorName, authorCity: r.authorCity, text: r.text, rating: r.rating, projectId: project?.id, isDemo: true, sortOrder: i },
    });
  }
  console.log(`• Reviews: ${SEED_REVIEWS.length} (demo)`);

  for (const r of SEED_REFERRALS) {
    await db.referralLink.upsert({ where: { code: r.code }, create: r, update: {} });
  }
  console.log(`• Referral links: ${SEED_REFERRALS.length}`);

  for (const [key, value] of [["contacts", DEFAULT_CONTACTS], ["pricing", DEFAULT_PRICING]] as const) {
    await db.setting.upsert({ where: { key }, create: { key, value: value as object }, update: {} });
  }
}

// ─── Demo analytics ──────────────────────────────────────────

let seed = 42;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rnd() * arr.length)];
function weighted<T>(items: Array<[T, number]>): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = rnd() * total;
  for (const [v, w] of items) if ((r -= w) <= 0) return v;
  return items[0][0];
}

const SOURCES: Array<[string, number]> = [
  ["direct", 30], ["yandex", 28], ["google", 9], ["ref:instagram", 12], ["ref:telegram", 7], ["ref:avito", 5], ["ref:direct", 6], ["vk", 3],
];
const PATHS = ["/", "/projects", "/services", "/about", "/prices", "/reviews", "/contacts", ...SEED_PROJECTS.map((p) => `/projects/${p.slug}`)];
const NAMES = ["Алексей", "Мария", "Иван", "Екатерина", "Дмитрий", "Ольга", "Сергей", "Наталья", "Андрей", "Татьяна", "Павел", "Юлия"];
const REGIONS = ["Москва", "Московская область", "Санкт-Петербург", "Ленинградская область", "Краснодарский край", "Тверская область", "Калужская область"];
const SERVICE_SETS = [["construction"], ["construction", "interior"], ["construction", "landscape"], ["interior", "design"], ["architecture"], ["landscape", "lawn", "lighting"], ["engineering"], ["construction", "architecture", "landscape"]];

async function seedDemoAnalytics() {
  const already = await db.visitor.count({ where: { isDemo: true } });
  if (already > 0 && !process.argv.includes("--reset-demo")) {
    console.log("• Demo analytics already present (run with --reset-demo to regenerate).");
    return;
  }
  await db.lead.deleteMany({ where: { isDemo: true } });
  await db.visitor.deleteMany({ where: { isDemo: true } });

  const links = Object.fromEntries((await db.referralLink.findMany()).map((l) => [l.code, l.id]));
  const DAYS = 60;
  const now = Date.now();
  const dayMs = 86_400_000;
  const visitors: Prisma.VisitorCreateManyInput[] = [];
  const events: Prisma.EventCreateManyInput[] = [];
  const clicks: Prisma.ReferralClickCreateManyInput[] = [];
  const leads: Array<{ visitorId: string; source: string; at: Date }> = [];

  for (let d = DAYS - 1; d >= 0; d--) {
    const dayStart = now - d * dayMs - (now % dayMs);
    const weekday = new Date(dayStart).getUTCDay();
    const growth = 1 + (DAYS - d) / DAYS;
    const count = Math.round((weekday === 0 || weekday === 6 ? 18 : 28) * growth * (0.8 + rnd() * 0.4));
    for (let v = 0; v < count; v++) {
      const id = randomUUID();
      const source = weighted(SOURCES);
      const refCode = source.startsWith("ref:") ? source.slice(4) : null;
      const first = new Date(Math.min(dayStart + Math.floor(rnd() * dayMs), now - 60_000));
      const device = weighted([["mobile", 58], ["desktop", 36], ["tablet", 6]] as Array<[string, number]>);
      const sessionsCount = rnd() < 0.27 ? 1 + Math.ceil(rnd() * 3) : 1;
      let last = first;
      let engaged = 0;
      for (let s = 0; s < sessionsCount; s++) {
        const sAt = s === 0 ? first : new Date(first.getTime() + Math.ceil(rnd() * 20) * dayMs * (s / sessionsCount + 0.3));
        if (sAt.getTime() > now) break;
        last = sAt;
        const sessionId = randomUUID();
        const sSource = s === 0 ? source : weighted([["direct", 70], ["yandex", 30]] as Array<[string, number]>);
        const pages = 1 + Math.floor(rnd() * 6);
        let t = sAt.getTime();
        const ev = (type: string, path: string, label?: string) => {
          t += 15_000 + Math.floor(rnd() * 90_000);
          events.push({ visitorId: id, sessionId, type, path, label, source: sSource, refCode, createdAt: new Date(Math.min(t, now)) });
        };
        for (let pIdx = 0; pIdx < pages; pIdx++) {
          const path = pIdx === 0 ? (refCode ? "/" : pick(PATHS.slice(0, 7))) : pick(PATHS);
          ev("page_view", path);
          if (path.startsWith("/projects/")) ev("project_view", path, path.split("/")[2]);
          if (rnd() < 0.08) ev("gallery_open", path);
        }
        if (rnd() < 0.3) { ev("cta_click", "/", pick(["hero_calculate", "hero_projects", "price_block", "project_request", "header_request"])); engaged++; }
        if (rnd() < 0.18) {
          ev("calculator_start", "/prices");
          const changes = 1 + Math.floor(rnd() * 5);
          for (let c = 0; c < changes; c++) ev("calculator_change", "/prices", pick(["area", "floors", "material", "package", "extras"]));
          engaged++;
        }
        if (rnd() < 0.06) ev("phone_click", "/contacts");
        if (rnd() < 0.025) ev("email_click", "/contacts");
        if (rnd() < 0.1) ev("contacts_open", "/contacts");
        if (rnd() < 0.08) ev("form_start", "/request");
        if (refCode && s === 0 && links[refCode]) clicks.push({ referralLinkId: links[refCode], visitorId: id, landingPath: "/", createdAt: sAt });
      }
      const convertP = 0.012 + engaged * 0.035 + (sessionsCount > 1 ? 0.02 : 0);
      if (rnd() < convertP) {
        const at = new Date(Math.min(last.getTime() + 600_000, now - 30_000));
        leads.push({ visitorId: id, source, at });
        events.push({ visitorId: id, sessionId: randomUUID(), type: "form_submit", path: "/request", source, refCode, createdAt: at });
      }
      visitors.push({ id, firstSeenAt: first, lastSeenAt: last, firstSource: source, firstRefCode: refCode, firstLandingPath: "/", deviceType: device, isDemo: true });
    }
  }

  for (let i = 0; i < visitors.length; i += 1000) await db.visitor.createMany({ data: visitors.slice(i, i + 1000) });
  for (let i = 0; i < events.length; i += 2000) await db.event.createMany({ data: events.slice(i, i + 2000) });
  await db.referralClick.createMany({ data: clicks });

  const statuses: LeadStatus[] = ["NEW", "IN_PROGRESS", "IN_PROGRESS", "DONE", "CANCELLED"];
  for (const [i, l] of leads.entries()) {
    const withCalc = rnd() < 0.6;
    const input: CalculatorInput = {
      ...DEFAULT_INPUT,
      area: pick([100, 120, 150, 180, 200, 240]),
      floors: pick([1, 2, 2, 3] as const),
      material: pick(["aerated", "brick", "timber", "frame"] as const),
      package: pick(["warm", "prefinish", "turnkey", "turnkey"] as const),
      extras: { ...DEFAULT_INPUT.extras, landscape: rnd() < 0.4, design: rnd() < 0.3, lawn: { enabled: rnd() < 0.4, area: pick([200, 300, 500]) } },
    };
    const refCode = l.source.startsWith("ref:") ? l.source.slice(4) : null;
    const ageDays = (now - l.at.getTime()) / dayMs;
    await db.lead.create({
      data: {
        formId: randomUUID(),
        name: `${pick(NAMES)} (демо)`,
        phone: `+7900000${String(1000 + i).slice(-4)}`,
        email: rnd() < 0.7 ? `demo${i + 1}@example.com` : null,
        region: pick(REGIONS),
        services: pick(SERVICE_SETS),
        area: withCalc ? input.area : pick([120, 150, 200, null]),
        description: rnd() < 0.5 ? "Демонстрационная заявка, созданная seed-скриптом." : null,
        consentAt: l.at,
        ...(withCalc
          ? {
              calculator: input as unknown as Prisma.InputJsonValue,
              calcArea: input.area,
              calcFloors: input.floors,
              calcMaterial: DEFAULT_PRICING.materials[input.material].label,
              calcPackage: DEFAULT_PRICING.packages[input.package].label,
              estimatedPrice: calculate(input, DEFAULT_PRICING).total,
            }
          : {}),
        status: ageDays < 3 ? "NEW" : pick(statuses),
        source: l.source,
        refCode,
        referralLinkId: refCode ? links[refCode] : undefined,
        landingPage: "/",
        visitorId: l.visitorId,
        deviceType: "mobile",
        telegramStatus: "SKIPPED",
        isDemo: true,
        createdAt: l.at,
      },
    });
  }
  console.log(`• Demo analytics: ${visitors.length} visitors, ${events.length} events, ${leads.length} leads`);
}

async function main() {
  console.log("Seeding VAREN database…");
  await seedAdmin();
  await seedCatalog();
  if (!process.argv.includes("--no-demo")) await seedDemoAnalytics();
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
