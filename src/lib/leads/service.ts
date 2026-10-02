import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "../db";
import { calculate, type CalculatorInput } from "../calculator";
import { getPricing } from "../settings";
import { REF_CODE_RE, resolveSource } from "../analytics/events";
import { MAX_FILES } from "../security/files";
import type { LeadPayload } from "./schema";

export class LeadError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

interface Context {
  userAgentDevice: string;
  refCookie: string | null;
}

const MIN_FILL_MS = 2500;

export async function createLead(p: LeadPayload, ctx: Context): Promise<{ id: number; duplicate: boolean }> {
  // 1. Idempotency — a second click with the same form id returns the first lead.
  const existing = await db.lead.findUnique({ where: { formId: p.formId }, select: { id: true } });
  if (existing) return { id: existing.id, duplicate: true };

  // 2. Obvious bots.
  if (p.website) throw new LeadError("Заявка отклонена", 400);
  if (p.elapsedMs !== undefined && p.elapsedMs < MIN_FILL_MS) throw new LeadError("Форма отправлена слишком быстро. Попробуйте ещё раз.", 429);

  // 3. Same phone flooding.
  const recentSamePhone = await db.lead.count({
    where: { phone: p.phone, createdAt: { gt: new Date(Date.now() - 10 * 60 * 1000) } },
  });
  if (recentSamePhone >= 3) throw new LeadError("Мы уже получили ваши заявки. Менеджер скоро свяжется с вами.", 429);

  // 4. Calculator — the price is always recalculated on the server.
  let calcData: {
    calculator?: Prisma.InputJsonValue;
    calcArea?: number;
    calcFloors?: number;
    calcMaterial?: string;
    calcPackage?: string;
    estimatedPrice?: number;
  } = {};
  if (p.calculator) {
    const input = p.calculator as CalculatorInput;
    const pricing = await getPricing();
    const result = calculate(input, pricing);
    calcData = {
      calculator: input as unknown as Prisma.InputJsonValue,
      calcArea: input.area,
      calcFloors: input.floors,
      calcMaterial: pricing.materials[input.material].label,
      calcPackage: pricing.packages[input.package].label,
      estimatedPrice: result.total,
    };
  }

  // 5. Attribution: payload (localStorage) first, then the ref cookie as a fallback.
  const a = p.attribution ?? {};
  const refCandidate = (a.ref ?? ctx.refCookie ?? "").toLowerCase();
  const refLink = REF_CODE_RE.test(refCandidate)
    ? await db.referralLink.findFirst({ where: { code: refCandidate, archived: false }, select: { id: true, code: true } })
    : null;
  const source = refLink
    ? `ref:${refLink.code}`
    : resolveSource({ utmSource: a.utmSource, referrer: a.referrer }) !== "direct"
      ? resolveSource({ utmSource: a.utmSource, referrer: a.referrer })
      : "direct";

  const visitor = p.visitorId ? await db.visitor.findUnique({ where: { id: p.visitorId }, select: { id: true } }) : null;

  const lead = await db.$transaction(async (tx) => {
    const created = await tx.lead.create({
      data: {
        formId: p.formId,
        name: p.name,
        phone: p.phone,
        email: p.email,
        region: p.region,
        services: p.services,
        area: p.area ?? calcData.calcArea,
        description: p.description,
        consentAt: new Date(),
        ...calcData,
        source,
        refCode: refLink?.code,
        referralLinkId: refLink?.id,
        landingPage: a.landingPage,
        referrer: a.referrer,
        utmSource: a.utmSource,
        utmMedium: a.utmMedium,
        utmCampaign: a.utmCampaign,
        utmContent: a.utmContent,
        utmTerm: a.utmTerm,
        attributedAt: a.ts ? new Date(a.ts) : undefined,
        deviceType: ctx.userAgentDevice,
        visitorId: visitor?.id,
      },
      select: { id: true },
    });
    const pending = await tx.leadFile.findMany({
      where: { formId: p.formId, leadId: null },
      orderBy: { createdAt: "asc" },
      take: MAX_FILES,
      select: { id: true },
    });
    if (pending.length) {
      await tx.leadFile.updateMany({ where: { id: { in: pending.map((f) => f.id) } }, data: { leadId: created.id } });
    }
    return created;
  });

  return { id: lead.id, duplicate: false };
}
