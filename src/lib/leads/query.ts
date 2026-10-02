import "server-only";
import type { LeadStatus, Prisma } from "@prisma/client";

export const LEAD_STATUSES: Array<{ id: LeadStatus; label: string }> = [
  { id: "NEW", label: "Новая" },
  { id: "IN_PROGRESS", label: "В работе" },
  { id: "DONE", label: "Завершена" },
  { id: "CANCELLED", label: "Отменена" },
];
export const STATUS_LABELS = Object.fromEntries(LEAD_STATUSES.map((s) => [s.id, s.label])) as Record<LeadStatus, string>;

export interface LeadFilters {
  q?: string;
  status?: string;
  service?: string;
  region?: string;
  source?: string;
  from?: string;
  to?: string;
}

type SP = Record<string, string | string[] | undefined>;

export function parseLeadFilters(sp: SP | URLSearchParams): LeadFilters {
  const get = (k: string) => {
    const v = sp instanceof URLSearchParams ? sp.get(k) : sp[k];
    const s = Array.isArray(v) ? v[0] : v;
    return s?.trim() ? s.trim().slice(0, 100) : undefined;
  };
  return { q: get("q"), status: get("status"), service: get("service"), region: get("region"), source: get("source"), from: get("from"), to: get("to") };
}

/** Start of a calendar day in Moscow time (UTC+3 all year round), as a UTC Date. */
function moscowDay(dateStr: string, endOfDay = false): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return undefined;
  const d = new Date(`${dateStr}T00:00:00+03:00`);
  if (Number.isNaN(d.getTime())) return undefined;
  return endOfDay ? new Date(d.getTime() + 24 * 3600 * 1000) : d;
}

export function buildLeadWhere(f: LeadFilters): Prisma.LeadWhereInput {
  const and: Prisma.LeadWhereInput[] = [];
  if (f.q) {
    const num = Number(f.q.replace(/^VR-?/i, ""));
    const or: Prisma.LeadWhereInput[] = [
      { name: { contains: f.q, mode: "insensitive" } },
      { phone: { contains: f.q.replace(/[^\d+]/g, "") || f.q } },
      { email: { contains: f.q, mode: "insensitive" } },
      { description: { contains: f.q, mode: "insensitive" } },
      { region: { contains: f.q, mode: "insensitive" } },
    ];
    if (Number.isInteger(num) && num > 0 && num < 2_147_483_647) or.push({ id: num });
    and.push({ OR: or });
  }
  if (f.status && ["NEW", "IN_PROGRESS", "DONE", "CANCELLED"].includes(f.status)) and.push({ status: f.status as LeadStatus });
  if (f.service) and.push({ services: { has: f.service } });
  if (f.region) and.push({ region: f.region });
  if (f.source) and.push({ source: f.source });
  const from = f.from ? moscowDay(f.from) : undefined;
  const to = f.to ? moscowDay(f.to, true) : undefined;
  if (from || to) and.push({ createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) } });
  return and.length ? { AND: and } : {};
}

export function filtersToQuery(f: LeadFilters): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : "";
}
