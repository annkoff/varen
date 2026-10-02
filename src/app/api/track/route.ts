import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { EVENT_TYPES, REF_CODE_RE } from "@/lib/analytics/events";
import { rateLimit } from "@/lib/security/rate-limit";
import { deviceTypeFromUA, ipKey, isBot, isSameOrigin } from "@/lib/security/request";

const schema = z.object({
  type: z.enum(EVENT_TYPES),
  visitorId: z.string().uuid(),
  sessionId: z.string().uuid(),
  path: z.string().max(300).startsWith("/"),
  label: z.string().max(120).optional(),
  meta: z.record(z.string(), z.union([z.string().max(200), z.number(), z.boolean()])).optional(),
  source: z.string().max(80).default("direct"),
  refCode: z.string().max(40).optional(),
  landingRef: z.string().max(40).optional(),
});

export async function POST(req: NextRequest) {
  const ua = req.headers.get("user-agent");
  // Admin pages are not tracked; bots are dropped silently.
  if (isBot(ua) || !isSameOrigin(req.headers)) return new NextResponse(null, { status: 204 });
  if (!rateLimit(`track:${ipKey(req.headers)}`, 240, 60_000).ok) return new NextResponse(null, { status: 429 });

  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const e = parsed.data;
  if (e.path.startsWith("/admin")) return new NextResponse(null, { status: 204 });

  const refCode = e.refCode && REF_CODE_RE.test(e.refCode) ? e.refCode : undefined;
  const now = new Date();

  try {
    await db.visitor.upsert({
      where: { id: e.visitorId },
      create: {
        id: e.visitorId,
        firstSeenAt: now,
        lastSeenAt: now,
        firstSource: e.source,
        firstRefCode: refCode,
        firstLandingPath: e.path,
        deviceType: deviceTypeFromUA(ua),
      },
      update: { lastSeenAt: now },
    });

    await db.event.create({
      data: {
        visitorId: e.visitorId,
        sessionId: e.sessionId,
        type: e.type,
        path: e.path,
        label: e.label,
        meta: e.meta,
        source: e.source,
        refCode,
      },
    });

    // A landing page view with ?ref=<code> counts as a referral click.
    if (e.type === "page_view" && e.landingRef && REF_CODE_RE.test(e.landingRef)) {
      const link = await db.referralLink.findFirst({ where: { code: e.landingRef, archived: false }, select: { id: true } });
      if (link) {
        await db.referralClick.create({ data: { referralLinkId: link.id, visitorId: e.visitorId, landingPath: e.path } });
      }
    }
  } catch (err) {
    console.error("[track] failed", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
