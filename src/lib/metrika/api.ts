import "server-only";

export interface MetrikaSummary {
  visits: number;
  users: number;
  pageviews: number;
  bounceRate: number;
}

const ymd = (d: Date) => new Date(d.getTime() + 3 * 3600 * 1000).toISOString().slice(0, 10);

/**
 * Optional: Yandex Metrika Reporting API. Needs YANDEX_METRIKA_OAUTH_TOKEN
 * (OAuth app with the "metrika:read" scope) and NEXT_PUBLIC_YANDEX_METRIKA_ID.
 */
export async function getMetrikaSummary(from: Date, to: Date): Promise<{ ok: true; data: MetrikaSummary } | { ok: false; reason: string }> {
  const id = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID;
  const token = process.env.YANDEX_METRIKA_OAUTH_TOKEN;
  if (!id || !token) return { ok: false, reason: "not_configured" };
  const url = new URL("https://api-metrika.yandex.net/stat/v1/data");
  url.searchParams.set("ids", id);
  url.searchParams.set("metrics", "ym:s:visits,ym:s:users,ym:s:pageviews,ym:s:bounceRate");
  url.searchParams.set("date1", ymd(from));
  url.searchParams.set("date2", ymd(new Date(to.getTime() - 1)));
  try {
    const res = await fetch(url, { headers: { Authorization: `OAuth ${token}` }, signal: AbortSignal.timeout(6000), next: { revalidate: 300 } });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const json = (await res.json()) as { totals?: number[] };
    const [visits = 0, users = 0, pageviews = 0, bounceRate = 0] = json.totals ?? [];
    return { ok: true, data: { visits, users, pageviews, bounceRate } };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "error" };
  }
}
