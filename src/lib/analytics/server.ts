import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "../db";

const MSK_OFFSET = 3 * 3600 * 1000; // Europe/Moscow has no DST
const DAY = 24 * 3600 * 1000;

export const PERIODS = [
  { id: "today", label: "Сегодня" },
  { id: "yesterday", label: "Вчера" },
  { id: "7d", label: "7 дней" },
  { id: "30d", label: "30 дней" },
  { id: "month", label: "Месяц" },
  { id: "year", label: "Год" },
] as const;
export type PeriodId = (typeof PERIODS)[number]["id"];

export interface Period {
  id: PeriodId;
  label: string;
  from: Date;
  to: Date;
  /** Bucket size for charts. */
  bucket: "hour" | "day" | "month";
}

function startOfMskDay(t: number) {
  return Math.floor((t + MSK_OFFSET) / DAY) * DAY - MSK_OFFSET;
}

export function resolvePeriod(raw: string | undefined, now = Date.now()): Period {
  const id = (PERIODS.some((p) => p.id === raw) ? raw : "30d") as PeriodId;
  const label = PERIODS.find((p) => p.id === id)!.label;
  const today = startOfMskDay(now);
  const msk = new Date(now + MSK_OFFSET);
  switch (id) {
    case "today":
      return { id, label, from: new Date(today), to: new Date(now), bucket: "hour" };
    case "yesterday":
      return { id, label, from: new Date(today - DAY), to: new Date(today), bucket: "hour" };
    case "7d":
      return { id, label, from: new Date(today - 6 * DAY), to: new Date(now), bucket: "day" };
    case "30d":
      return { id, label, from: new Date(today - 29 * DAY), to: new Date(now), bucket: "day" };
    case "month": {
      const from = Date.UTC(msk.getUTCFullYear(), msk.getUTCMonth(), 1) - MSK_OFFSET;
      return { id, label: `${label} (${new Intl.DateTimeFormat("ru-RU", { month: "long", timeZone: "UTC" }).format(msk)})`, from: new Date(from), to: new Date(now), bucket: "day" };
    }
    case "year": {
      const from = Date.UTC(msk.getUTCFullYear(), 0, 1) - MSK_OFFSET;
      return { id, label: `${label} (${msk.getUTCFullYear()})`, from: new Date(from), to: new Date(now), bucket: "month" };
    }
  }
}

const n = (v: unknown) => Number(v ?? 0);

export async function getSummary(from: Date, to: Date) {
  const [traffic] = await db.$queryRaw<Array<{ visits: bigint; visitors: bigint }>>`
    SELECT COUNT(DISTINCT "sessionId") AS visits, COUNT(DISTINCT "visitorId") AS visitors
    FROM "Event" WHERE type = 'page_view' AND "createdAt" >= ${from} AND "createdAt" < ${to}`;
  const byType = await db.event.groupBy({ by: ["type"], where: { createdAt: { gte: from, lt: to } }, _count: { _all: true } });
  const leads = await db.lead.count({ where: { createdAt: { gte: from, lt: to } } });
  const t = Object.fromEntries(byType.map((r) => [r.type, r._count._all])) as Record<string, number>;
  const visitors = n(traffic?.visitors);
  return {
    visits: n(traffic?.visits),
    visitors,
    leads,
    conversion: visitors ? leads / visitors : 0,
    pageViews: t.page_view ?? 0,
    cta: t.cta_click ?? 0,
    phone: t.phone_click ?? 0,
    email: t.email_click ?? 0,
    projectViews: t.project_view ?? 0,
    calcStarts: t.calculator_start ?? 0,
    formStarts: t.form_start ?? 0,
    formSubmits: t.form_submit ?? 0,
    contactsOpen: t.contacts_open ?? 0,
    byType: t,
  };
}

export async function getSeries(p: Period) {
  const unit = Prisma.raw(`'${p.bucket}'`);
  const traffic = await db.$queryRaw<Array<{ bucket: Date; visits: bigint; visitors: bigint; cta: bigint }>>`
    SELECT date_trunc(${unit}, "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Moscow') AS bucket,
           COUNT(DISTINCT "sessionId") FILTER (WHERE type = 'page_view') AS visits,
           COUNT(DISTINCT "visitorId") FILTER (WHERE type = 'page_view') AS visitors,
           COUNT(*) FILTER (WHERE type = 'cta_click') AS cta
    FROM "Event" WHERE "createdAt" >= ${p.from} AND "createdAt" < ${p.to}
    GROUP BY 1 ORDER BY 1`;
  const leads = await db.$queryRaw<Array<{ bucket: Date; leads: bigint }>>`
    SELECT date_trunc(${unit}, "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Moscow') AS bucket, COUNT(*) AS leads
    FROM "Lead" WHERE "createdAt" >= ${p.from} AND "createdAt" < ${p.to} GROUP BY 1 ORDER BY 1`;

  // Fill empty buckets so the chart has a continuous axis.
  const key = (d: Date) => d.toISOString().slice(0, p.bucket === "hour" ? 13 : p.bucket === "day" ? 10 : 7);
  const map = new Map<string, { label: string; visits: number; visitors: number; leads: number; cta: number }>();
  const startLocal = new Date(p.from.getTime() + MSK_OFFSET);
  const endLocal = new Date(p.to.getTime() + MSK_OFFSET);
  const cursor = new Date(startLocal);
  if (p.bucket === "day") cursor.setUTCHours(0, 0, 0, 0);
  if (p.bucket === "hour") cursor.setUTCMinutes(0, 0, 0);
  if (p.bucket === "month") {
    cursor.setUTCDate(1);
    cursor.setUTCHours(0, 0, 0, 0);
  }
  while (cursor < endLocal) {
    const label =
      p.bucket === "hour"
        ? `${String(cursor.getUTCHours()).padStart(2, "0")}:00`
        : p.bucket === "day"
          ? `${String(cursor.getUTCDate()).padStart(2, "0")}.${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`
          : new Intl.DateTimeFormat("ru-RU", { month: "short", timeZone: "UTC" }).format(cursor);
    map.set(key(cursor), { label, visits: 0, visitors: 0, leads: 0, cta: 0 });
    if (p.bucket === "hour") cursor.setUTCHours(cursor.getUTCHours() + 1);
    else if (p.bucket === "day") cursor.setUTCDate(cursor.getUTCDate() + 1);
    else cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  // date_trunc returns a naive Moscow timestamp; Prisma reads it as UTC — exactly our "local" keys.
  for (const r of traffic) {
    const row = map.get(key(r.bucket));
    if (row) Object.assign(row, { visits: n(r.visits), visitors: n(r.visitors), cta: n(r.cta) });
  }
  for (const r of leads) {
    const row = map.get(key(r.bucket));
    if (row) row.leads = n(r.leads);
  }
  return [...map.values()];
}

export async function getSources(from: Date, to: Date) {
  const visits = await db.$queryRaw<Array<{ source: string; visits: bigint; visitors: bigint }>>`
    SELECT source, COUNT(DISTINCT "sessionId") AS visits, COUNT(DISTINCT "visitorId") AS visitors
    FROM "Event" WHERE type = 'page_view' AND "createdAt" >= ${from} AND "createdAt" < ${to}
    GROUP BY source ORDER BY visits DESC LIMIT 20`;
  const leads = await db.lead.groupBy({ by: ["source"], where: { createdAt: { gte: from, lt: to } }, _count: { _all: true } });
  const leadMap = new Map(leads.map((l) => [l.source, l._count._all]));
  const rows = visits.map((v) => ({ source: v.source, visits: n(v.visits), visitors: n(v.visitors), leads: leadMap.get(v.source) ?? 0 }));
  for (const [source, count] of leadMap) if (!rows.some((r) => r.source === source)) rows.push({ source, visits: 0, visitors: 0, leads: count });
  return rows.map((r) => ({ ...r, conversion: r.visitors ? r.leads / r.visitors : 0 }));
}

export async function getTopProjects(from: Date, to: Date) {
  const rows = await db.event.groupBy({
    by: ["label"],
    where: { type: "project_view", createdAt: { gte: from, lt: to }, label: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { label: "desc" } },
    take: 8,
  });
  const projects = await db.project.findMany({ where: { slug: { in: rows.map((r) => r.label!) } }, select: { slug: true, title: true } });
  const titles = new Map(projects.map((p) => [p.slug, p.title]));
  return rows.map((r) => ({ slug: r.label!, title: titles.get(r.label!) ?? r.label!, views: r._count._all }));
}

/** Last N ISO weeks (Moscow time): traffic, leads, conversion and the best source. */
export async function getWeekly(weeks = 8) {
  const rows = await db.$queryRaw<Array<{ week: Date; visits: bigint; visitors: bigint }>>`
    SELECT date_trunc('week', "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Moscow') AS week,
           COUNT(DISTINCT "sessionId") AS visits, COUNT(DISTINCT "visitorId") AS visitors
    FROM "Event" WHERE type = 'page_view' AND "createdAt" >= now() - make_interval(weeks => ${weeks + 1}::int)
    GROUP BY 1 ORDER BY 1 DESC LIMIT ${weeks}::int`;
  const leads = await db.$queryRaw<Array<{ week: Date; leads: bigint }>>`
    SELECT date_trunc('week', "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Moscow') AS week, COUNT(*) AS leads
    FROM "Lead" WHERE "createdAt" >= now() - make_interval(weeks => ${weeks + 1}::int) GROUP BY 1`;
  const top = await db.$queryRaw<Array<{ week: Date; source: string; visits: bigint }>>`
    SELECT DISTINCT ON (week) week, source, visits FROM (
      SELECT date_trunc('week', "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Moscow') AS week, source, COUNT(DISTINCT "sessionId") AS visits
      FROM "Event" WHERE type = 'page_view' AND source <> 'direct' AND "createdAt" >= now() - make_interval(weeks => ${weeks + 1}::int)
      GROUP BY 1, 2
    ) t ORDER BY week, visits DESC`;
  const leadMap = new Map(leads.map((l) => [l.week.toISOString(), n(l.leads)]));
  const topMap = new Map(top.map((t) => [t.week.toISOString(), t.source]));
  return rows.map((r, i) => {
    const k = r.week.toISOString();
    const visitors = n(r.visitors);
    const l = leadMap.get(k) ?? 0;
    const prev = rows[i + 1];
    return {
      week: r.week,
      visits: n(r.visits),
      visitors,
      leads: l,
      conversion: visitors ? l / visitors : 0,
      topSource: topMap.get(k) ?? "—",
      visitsDelta: prev && n(prev.visits) ? n(r.visits) / n(prev.visits) - 1 : null,
    };
  });
}

/**
 * Cohorts by the week of the first visit.
 * For each cohort: size, how many came back in later weeks, how many left a lead,
 * and the cumulative share of the cohort that converted by week N after the first visit.
 */
export async function getCohorts(weeks = 8) {
  const rows = await db.$queryRaw<Array<{ cohort: Date; size: bigint; returned: bigint; converted: bigint }>>`
    WITH v AS (
      SELECT id, date_trunc('week', "firstSeenAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Moscow') AS cohort
      FROM "Visitor" WHERE "firstSeenAt" >= date_trunc('week', now()) - make_interval(weeks => ${weeks - 1}::int)
    )
    SELECT v.cohort,
           COUNT(*) AS size,
           COUNT(*) FILTER (WHERE EXISTS (
             SELECT 1 FROM "Event" e WHERE e."visitorId" = v.id AND e.type = 'page_view'
               AND date_trunc('week', e."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Moscow') > v.cohort)) AS returned,
           COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "Lead" l WHERE l."visitorId" = v.id)) AS converted
    FROM v GROUP BY v.cohort ORDER BY v.cohort DESC`;

  const matrix = await db.$queryRaw<Array<{ cohort: Date; week_offset: number; converted: bigint }>>`
    WITH v AS (
      SELECT id, date_trunc('week', "firstSeenAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Moscow') AS cohort
      FROM "Visitor" WHERE "firstSeenAt" >= date_trunc('week', now()) - make_interval(weeks => ${weeks - 1}::int)
    ), first_lead AS (
      SELECT "visitorId", MIN("createdAt") AS at FROM "Lead" WHERE "visitorId" IS NOT NULL GROUP BY 1
    )
    SELECT v.cohort,
           FLOOR(EXTRACT(EPOCH FROM (date_trunc('week', fl.at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Moscow') - v.cohort)) / 604800)::int AS week_offset,
           COUNT(*) AS converted
    FROM v JOIN first_lead fl ON fl."visitorId" = v.id
    GROUP BY 1, 2`;

  return rows.map((r) => {
    const size = n(r.size);
    const cells = matrix.filter((m) => m.cohort.getTime() === r.cohort.getTime());
    const weeksSince = Math.floor((Date.now() + MSK_OFFSET - r.cohort.getTime()) / (7 * DAY));
    let cumulative = 0;
    const byOffset = Array.from({ length: weeks }, (_, i) => {
      if (i > weeksSince) return null; // future cell
      cumulative += n(cells.find((c) => c.week_offset === i)?.converted);
      return size ? cumulative / size : 0;
    });
    return {
      cohort: r.cohort,
      size,
      returned: n(r.returned),
      returnRate: size ? n(r.returned) / size : 0,
      converted: n(r.converted),
      conversion: size ? n(r.converted) / size : 0,
      byOffset,
    };
  });
}

/** Funnel for the selected period: visitors → engaged → calculator → form → lead. */
export async function getFunnel(from: Date, to: Date) {
  const [r] = await db.$queryRaw<Array<{ visitors: bigint; projects: bigint; calc: bigint; form: bigint }>>`
    SELECT COUNT(DISTINCT "visitorId") FILTER (WHERE type = 'page_view') AS visitors,
           COUNT(DISTINCT "visitorId") FILTER (WHERE type = 'project_view') AS projects,
           COUNT(DISTINCT "visitorId") FILTER (WHERE type = 'calculator_start') AS calc,
           COUNT(DISTINCT "visitorId") FILTER (WHERE type = 'form_start') AS form
    FROM "Event" WHERE "createdAt" >= ${from} AND "createdAt" < ${to}`;
  const leads = await db.lead.count({ where: { createdAt: { gte: from, lt: to } } });
  return [
    { step: "Посетители", value: n(r?.visitors) },
    { step: "Смотрели проекты", value: n(r?.projects) },
    { step: "Начали расчёт", value: n(r?.calc) },
    { step: "Начали заявку", value: n(r?.form) },
    { step: "Оставили заявку", value: leads },
  ];
}
